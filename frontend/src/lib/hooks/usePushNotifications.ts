'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { NotificationPreference } from '@/lib/supabase/types'

// VAPID public key for push subscriptions
const VAPID_PUBLIC_KEY =
  'BKvR9MwMFYWdoe62RWOi70fxZ_NqKqBlp3P0mPZY722xjdN7BfvjdtTvq7GRhiBDrRDk_egA7HCsVuxnmOqZ4aw'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// ─── Query keys ───────────────────────────────────────────────────

export const pushKeys = {
  all: ['push-notifications'] as const,
  subscription: () => [...pushKeys.all, 'subscription'] as const,
  preferences: () => [...pushKeys.all, 'preferences'] as const,
}

// ─── Check if push is supported ───────────────────────────────────

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// ─── Get current push subscription status ─────────────────────────

export function usePushSubscription() {
  return useQuery({
    queryKey: pushKeys.subscription(),
    queryFn: async () => {
      if (!isPushSupported()) return { subscribed: false, permission: 'unsupported' as const }

      const permission = Notification.permission
      if (permission === 'denied') return { subscribed: false, permission: 'denied' as const }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      return {
        subscribed: !!subscription,
        permission: permission as 'granted' | 'default' | 'denied',
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Subscribe to push notifications ──────────────────────────────

export function useSubscribePush() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) throw new Error('Push notifications not supported')

      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Permission denied')

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Subscribe
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      })

      const json = subscription.toJSON()
      const keys = json.keys as Record<string, string>

      // Save to Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint!,
          p256dh: keys.p256dh,
          auth_key: keys.auth,
          user_agent: navigator.userAgent,
          is_active: true,
        },
        { onConflict: 'user_id,endpoint' }
      )

      if (error) throw error

      // Also ensure notification preferences exist
      await supabase.from('notification_preferences').upsert(
        {
          user_id: user.id,
          weekly_summary: true,
          budget_alerts: true,
          anomaly_alerts: true,
        },
        { onConflict: 'user_id' }
      )

      return subscription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pushKeys.all })
    },
  })
}

// ─── Unsubscribe from push notifications ──────────────────────────

export function useUnsubscribePush() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()

        // Deactivate in Supabase
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('endpoint', endpoint)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pushKeys.all })
    },
  })
}

// ─── Notification preferences ─────────────────────────────────────

export function useNotificationPreferences() {
  const supabase = createClient()

  return useQuery<NotificationPreference | null>({
    queryKey: pushKeys.preferences(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .maybeSingle()

      if (error) throw error
      return data
    },
  })
}

export function useUpdateNotificationPreferences() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      updates: Partial<
        Pick<
          NotificationPreference,
          'weekly_summary' | 'budget_alerts' | 'anomaly_alerts' | 'preferred_day' | 'preferred_hour'
        >
      >
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: user.id, ...updates },
          { onConflict: 'user_id' }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pushKeys.preferences() })
    },
  })
}

// ─── Send test notification ───────────────────────────────────────

export function useSendTestNotification() {
  return useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) throw new Error('Not supported')
      if (Notification.permission !== 'granted') throw new Error('Permission not granted')

      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('GestionDinero', {
        body: 'Las notificaciones funcionan correctamente!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'test-notification',
        data: { url: '/dashboard' },
      })
    },
  })
}
