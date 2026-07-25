import type { SupabaseClient } from '@supabase/supabase-js'
import type { DB, Member } from './types'

/**
 * Supabase 資料同步層（Phase 2A）
 *
 * 設計重點：
 * - 前端 in-memory DB 繼續用 camelCase TypeScript interfaces；
 *   Postgres 表用 snake_case columns，呢度做雙向 key 轉換。
 * - 每次本地 mutation 之後用 syncDiff() 比較新舊 DB，
 *   將新增 / 修改 / 刪除嘅 row fire-and-forget 寫返去 Supabase。
 * - 任何網絡 / RLS 錯誤只會 console.error，唔會阻住 UI（optimistic local update）。
 *
 * 表名假設（同 supabase/ SQL 目錄嘅 schema 對應；如 schema 改名只需改 TABLE 對照）：
 *   members → profiles（role column: 'admin' | 'member'）
 *   其他表名同 DB key 一樣；promo_content / settings 係單行表（id = 1）。
 */

/** DB key → Postgres 表名 */
const TABLE: Record<string, string> = {
  members: 'profiles',
  orders: 'orders',
  rebates: 'rebates',
  inquiries: 'inquiries',
  sessions: 'course_sessions',
  attendance: 'attendance',
  reviews: 'reviews',
  waitlist: 'waitlist',
  announcements: 'announcements',
}

const ARRAY_KEYS = Object.keys(TABLE) as (keyof DB)[]

/* ---------- key 轉換 ---------- */

function snakeToCamelKey(k: string): string {
  return k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

function camelToSnakeKey(k: string): string {
  return k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 遞迴將 object keys 由 snake_case 轉 camelCase */
export function camelize<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => camelize(v)) as T
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[snakeToCamelKey(k)] = camelize(v)
    return out as T
  }
  return value as T
}

/** 遞迴將 object keys 由 camelCase 轉 snake_case（undefined 值會剔走） */
export function snakeize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => snakeize(v))
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue
      out[camelToSnakeKey(k)] = snakeize(v)
    }
    return out
  }
  return value
}

/* ---------- 行讀寫轉換 ---------- */

/** Postgres row → 前端 entity */
function fromRow(key: string, row: Record<string, unknown>): unknown {
  if (key === 'members') {
    const m = camelize<Record<string, unknown>>(row)
    return {
      ...m,
      // profiles.is_admin → Member.isAdmin；密碼永遠唔會喺 backend 出現
      isAdmin: row.is_admin === true,
      password: '',
      stage: (m.stage ?? 0) as Member['stage'],
      promoViews: (m.promoViews as number) ?? 0,
    }
  }
  return camelize(row)
}

/** 前端 entity → Postgres row */
function toRow(key: string, entity: unknown): Record<string, unknown> {
  const row = snakeize(entity) as Record<string, unknown>
  if (key === 'members') {
    delete row.password // 密碼唔會寫入 backend
  }
  return row
}

/* ---------- 全量載入 ---------- */

/**
 * 由 Supabase 載入全部表，組裝成前端 DB。
 * 單表失敗只會記錄錯誤並當空表處理，唔會令其他表載入唔到。
 */
export async function loadAllFromSupabase(client: SupabaseClient, fallback: DB): Promise<DB> {
  const entries = await Promise.all(
    ARRAY_KEYS.map(async (key) => {
      const { data, error } = await client.from(TABLE[key]).select('*')
      if (error) {
        console.error(`[supabase] 載入 ${TABLE[key]} 失敗：`, error.message)
        return [key, []] as const
      }
      return [key, (data ?? []).map((r) => fromRow(key, r as Record<string, unknown>))] as const
    }),
  )
  const db = { ...fallback } as DB
  for (const [key, rows] of entries) {
    ;(db as unknown as Record<string, unknown>)[key] = rows
  }

  // 單行表：promo_content / settings
  try {
    const { data: promo, error } = await client.from('promo_content').select('*').limit(1)
    if (error) console.error('[supabase] 載入 promo_content 失敗：', error.message)
    else if (promo && promo.length > 0) db.promoContent = camelize(promo[0])
  } catch (e) {
    console.error('[supabase] 載入 promo_content 異常：', e)
  }
  try {
    const { data: settings, error } = await client.from('settings').select('*').limit(1)
    if (error) console.error('[supabase] 載入 settings 失敗：', error.message)
    else if (settings && settings.length > 0) db.settings = camelize(settings[0])
  } catch (e) {
    console.error('[supabase] 載入 settings 異常：', e)
  }
  return db
}

/* ---------- 差量寫入 ---------- */

interface WriteOp {
  table: string
  op: 'upsert' | 'delete'
  row?: Record<string, unknown>
  id?: string
}

/** 比較新舊 DB，得出需要寫入 Supabase 嘅 ops */
export function diffDB(prev: DB, next: DB): WriteOp[] {
  const ops: WriteOp[] = []
  for (const key of ARRAY_KEYS) {
    const table = TABLE[key]
    const prevRows = (prev[key] as { id: string }[]) ?? []
    const nextRows = (next[key] as { id: string }[]) ?? []
    const prevMap = new Map(prevRows.map((r) => [r.id, r]))
    const nextMap = new Map(nextRows.map((r) => [r.id, r]))
    for (const [id, row] of nextMap) {
      const old = prevMap.get(id)
      if (!old || JSON.stringify(old) !== JSON.stringify(row)) {
        ops.push({ table, op: 'upsert', row: toRow(key, row) })
      }
    }
    for (const id of prevMap.keys()) {
      if (!nextMap.has(id)) ops.push({ table, op: 'delete', id })
    }
  }
  if (JSON.stringify(prev.promoContent) !== JSON.stringify(next.promoContent)) {
    ops.push({ table: 'promo_content', op: 'upsert', row: { id: 1, ...(snakeize(next.promoContent) as object) } })
  }
  if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
    ops.push({ table: 'settings', op: 'upsert', row: { id: 1, ...(snakeize(next.settings) as object) } })
  }
  return ops
}

/** fire-and-forget 將 diff 寫入 Supabase；錯誤只記錄，唔會 throw */
export async function syncDiff(client: SupabaseClient, prev: DB, next: DB): Promise<void> {
  const ops = diffDB(prev, next)
  await Promise.all(
    ops.map(async (op) => {
      try {
        if (op.op === 'upsert') {
          const { error } = await client.from(op.table).upsert(op.row as Record<string, unknown>)
          if (error) console.error(`[supabase] upsert ${op.table} 失敗：`, error.message)
        } else {
          const { error } = await client.from(op.table).delete().eq('id', op.id as string)
          if (error) console.error(`[supabase] delete ${op.table} 失敗：`, error.message)
        }
      } catch (e) {
        console.error(`[supabase] 寫入 ${op.table} 異常：`, e)
      }
    }),
  )
}

/** 直接 upsert 單一 entity（畀 auth / profile 流程用） */
export async function upsertEntity(client: SupabaseClient, key: string, entity: unknown): Promise<void> {
  const { error } = await client.from(TABLE[key]).upsert(toRow(key, entity))
  if (error) console.error(`[supabase] upsert ${TABLE[key]} 失敗：`, error.message)
}
