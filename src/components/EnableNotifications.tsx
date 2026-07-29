'use client'

import { useEffect, useState } from 'react'
import { savePushSubscription, sendTestPush } from '@/actions'
import type { UserId } from '@/lib/habits'

/**
 * iOS only allows web push for home-screen web apps, and only when the
 * permission prompt comes from a real tap — hence the button rather than an
 * automatic request on load.
 */
export default function EnableNotifications({ user }: { user: UserId }) {
  const [state, setState] = useState<'unknown' | 'unsupported' | 'needs-install' | 'off' | 'on'>(
    'unknown'
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      // On iOS this is what a Safari tab looks like: push only exists once the
      // site has been added to the Home Screen.
      const iOS = /iP(hone|ad|od)/.test(navigator.userAgent)
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as { standalone?: boolean }).standalone === true
      setState(iOS && !standalone ? 'needs-install' : 'unsupported')
      return
    }
    setState(Notification.permission === 'granted' ? 'on' : 'off')
  }, [])

  async function enable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      if ((await Notification.requestPermission()) !== 'granted') {
        setBusy(false)
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await savePushSubscription(user, { endpoint: json.endpoint, keys: json.keys })
      await sendTestPush(user)
      setState('on')
    } catch (e) {
      console.error(e)
    }
    setBusy(false)
  }

  if (state === 'unknown' || state === 'on') return null

  return (
    <div className="mx-4 mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm">
      {state === 'needs-install' ? (
        <p className="text-neutral-400">
          To get notifications, tap <span className="text-white">Share</span> →{' '}
          <span className="text-white">Add to Home Screen</span>, then open Habits from your home
          screen.
        </p>
      ) : state === 'unsupported' ? (
        <p className="text-neutral-500">This browser can&apos;t do notifications.</p>
      ) : (
        <button onClick={enable} disabled={busy} className="tap font-medium text-accent">
          {busy ? 'Turning on…' : 'Turn on notifications'}
        </button>
      )}
    </div>
  )
}
