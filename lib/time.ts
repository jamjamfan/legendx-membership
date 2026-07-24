export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function wholeDaysUntil(value: Date): number {
  return Math.max(
    0,
    Math.ceil((value.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );
}
