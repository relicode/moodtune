export const getClientIp = (h: Headers): string =>
  h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
