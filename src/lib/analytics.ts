export const track = (event: string, data?: Record<string, unknown>) => {
  window.umami?.track(event, data)
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ...data }),
  }).catch(() => {})
}

export const identify = (username: string) => {
  window.umami?.identify({ username })
}
