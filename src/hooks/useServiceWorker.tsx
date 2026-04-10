'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { useSnackbar } from '$/hooks/useSnackbar'
import { track } from '$/lib/analytics'

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

// Capture the event early, before React mounts
let earlyDeferredPrompt: BeforeInstallPromptEvent | undefined
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault()
    earlyDeferredPrompt = ev
  })
}

type ServiceWorkerContextValue = {
  deferredPrompt: BeforeInstallPromptEvent | undefined
}

const ServiceWorkerContext = createContext<ServiceWorkerContextValue | undefined>(undefined)

export const ServiceWorkerProvider = ({ children }: { children: ReactNode }) => {
  const { showSnackbar } = useSnackbar()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | undefined>(earlyDeferredPrompt)

  useEffect(() => {
    const handleBeforeInstallPrompt = (ev: BeforeInstallPromptEvent) => {
      ev.preventDefault()
      setDeferredPrompt(ev)
    }

    const handleAppInstalled = () => {
      track('pwa-installed')
      showSnackbar('App installed', 'success')
      setDeferredPrompt(undefined)
      earlyDeferredPrompt = undefined
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    navigator.serviceWorker?.register('/sw.js')

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [showSnackbar]) // stable via React Compiler

  return <ServiceWorkerContext value={{ deferredPrompt }}>{children}</ServiceWorkerContext>
}

export const useServiceWorker = () => {
  const context = useContext(ServiceWorkerContext)
  if (!context) throw new Error('useServiceWorker must be used within ServiceWorkerProvider')
  return context
}
