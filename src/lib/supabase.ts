import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client（Phase 2A）。
 *
 * 兩個環境變數都齊先會建立 client；任何一個唔存在（例如 GitHub Pages
 * 示範部署）就返回 null，store 會自動回落到 localStorage 模式。
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

function createSafeClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  try {
    return createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } catch (err) {
    // URL 格式錯誤等情況：靜默回落，唔好令成個 app 冧
    console.error('[supabase] 初始化失敗，回落到示範模式：', err)
    return null
  }
}

export const supabase: SupabaseClient | null = createSafeClient()

/** 實際可用（env 齊 + client 建立成功） */
export const supabaseEnabled = supabase !== null
