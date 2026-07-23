/** 客戶端 CSV 匯出（含 BOM，Excel 開啟中文唔會亂碼） */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (v: string | number): string => {
    const s = String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
