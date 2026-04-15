import { useEffect, useState } from 'react'
import type { WebsocketProvider } from 'y-websocket'
import type { PresenceUser } from '../types'

const PALETTE = [
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#84CC16',
  '#6366F1',
]

const ADJECTIVES = [
  'Quick',
  'Bright',
  'Calm',
  'Bold',
  'Brave',
  'Clever',
  'Silent',
  'Witty',
  'Lucky',
  'Swift',
]

const ANIMALS = [
  'Fox',
  'Otter',
  'Panda',
  'Hawk',
  'Lynx',
  'Finch',
  'Koala',
  'Gecko',
  'Seal',
  'Moth',
]

function randomName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const b = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return `${a} ${b}`
}

function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)]
}

export function getOrCreateLocalUser(): { name: string; color: string } {
  try {
    const raw = localStorage.getItem('figma-clone-user')
    if (raw) {
      const parsed = JSON.parse(raw) as { name: string; color: string }
      if (parsed.name && parsed.color) return parsed
    }
  } catch {
    /* ignore */
  }
  const user = { name: randomName(), color: randomColor() }
  try {
    localStorage.setItem('figma-clone-user', JSON.stringify(user))
  } catch {
    /* ignore */
  }
  return user
}

export function setLocalUser(user: { name: string; color: string }) {
  localStorage.setItem('figma-clone-user', JSON.stringify(user))
}

export interface RemoteUser extends PresenceUser {
  clientId: number
}

export function useRemoteUsers(
  provider: WebsocketProvider,
  selfClientId: number,
): RemoteUser[] {
  const [users, setUsers] = useState<RemoteUser[]>([])

  useEffect(() => {
    const handler = () => {
      const states = provider.awareness.getStates()
      const list: RemoteUser[] = []
      states.forEach((state, clientId) => {
        if (clientId === selfClientId) return
        const user = state?.user as PresenceUser | undefined
        if (!user) return
        list.push({ ...user, clientId })
      })
      setUsers(list)
    }
    provider.awareness.on('change', handler)
    handler()
    return () => provider.awareness.off('change', handler)
  }, [provider, selfClientId])

  return users
}

export function useConnectionStatus(provider: WebsocketProvider): {
  connected: boolean
} {
  const [connected, setConnected] = useState(
    provider.wsconnected ?? false,
  )
  useEffect(() => {
    const onStatus = (e: { status: string }) => {
      setConnected(e.status === 'connected')
    }
    provider.on('status', onStatus)
    return () => {
      provider.off('status', onStatus)
    }
  }, [provider])
  return { connected }
}
