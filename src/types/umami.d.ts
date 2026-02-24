type Umami = {
  track: (event: string, data?: Record<string, unknown>) => void
  identify: (data: Record<string, unknown>) => void
}

declare global {
  interface Window {
    umami?: Umami
  }
}

export {}
