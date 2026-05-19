import { useState, useEffect } from 'react'

export default function PermissionsRequest() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Only check if we are in a browser context
    if (typeof window === 'undefined') return

    // iOS requires user interaction for push notifications (and iOS 16.4+ for web push in PWA)
    // We will show this banner if Notification is supported and permission is 'default' (not asked yet)
    
    // We only show it automatically if the app is running in Standalone (PWA) mode to not annoy web visitors,
    // OR we can just show it a few seconds after login. Let's check PWA mode:
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    
    if (isStandalone) {
      const timer = setTimeout(() => {
        checkPermissions()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  function checkPermissions() {
    let needsPrompt = false
    
    // Check Notification
    if ('Notification' in window && Notification.permission === 'default') {
      needsPrompt = true
    }

    // Camera permission is hard to check silently without triggering prompt on iOS.
    // So if Notification needs prompt, we do both. If Notification is granted, we assume they did both.
    // However, if iOS doesn't support Notifications (pre 16.4), we should still ask for Camera.
    // Let's rely on a localStorage flag to only ask once per PWA install
    const hasAsked = localStorage.getItem('permissions_asked')
    if (!hasAsked) {
      needsPrompt = true
    }

    if (needsPrompt) {
      setShow(true)
    }
  }

  async function requestAll() {
    try {
      localStorage.setItem('permissions_asked', 'true')
      
      // 1. Request Notification
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      
      // 2. Request Camera
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        // Immediately stop tracks since we just wanted the permission
        stream.getTracks().forEach(track => track.stop())
      }
    } catch (e) {
      console.warn('Permissão negada ou erro:', e)
    } finally {
      setShow(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed bottom-6 left-4 right-4 bg-gray-900 text-white p-5 rounded-3xl shadow-2xl z-[999] animate-slide-up">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-2xl shrink-0">
          🔔
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight mb-1">Ativar Recursos</h3>
          <p className="text-sm text-gray-300 leading-snug">
            Para receber alertas do gerente e usar a câmera para código de barras, habilite as permissões.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => { localStorage.setItem('permissions_asked', 'true'); setShow(false) }} 
          className="btn bg-gray-800 text-gray-300 flex-1 border border-gray-700">
          Depois
        </button>
        <button onClick={requestAll} 
          className="btn bg-brand-500 text-white flex-1 border-0 shadow-lg shadow-brand-500/30">
          ✅ Permitir
        </button>
      </div>
    </div>
  )
}
