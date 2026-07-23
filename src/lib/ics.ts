import type { CourseSession } from './types'

function icsDate(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`
}

/** 生成場次嘅 .ics 行事曆檔（含全部堂數），學員一撳加入 Google/Apple 行事曆 */
export function sessionICS(session: CourseSession, courseName: string): string {
  const startTime = (session.time.match(/\d{1,2}:\d{2}/)?.[0] ?? '19:00').padStart(5, '0')
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LegendX//Course//ZH-HK',
    'CALSCALE:GREGORIAN',
  ]
  session.dates.forEach((d, i) => {
    const start = icsDate(d, startTime)
    const endDate = new Date(`${d}T${startTime}:00`)
    endDate.setHours(endDate.getHours() + 3)
    const end = `${d.replace(/-/g, '')}T${String(endDate.getHours()).padStart(2, '0')}${String(endDate.getMinutes()).padStart(2, '0')}00`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${session.id}-${i}@legendx.hk`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${courseName}（第 ${i + 1} 堂）— LegendX`,
      `LOCATION:${session.venue}`,
      `DESCRIPTION:導師：${session.instructor}\\n請帶備課堂通行證 QR 碼簽到。`,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:聽日上堂提醒',
      'END:VALARM',
      'END:VEVENT',
    )
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(session: CourseSession, courseName: string): void {
  const blob = new Blob([sessionICS(session, courseName)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `legendx-${session.title.replace(/\s+/g, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
