import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import type { Shape } from '../types'

export interface YjsContext {
  doc: Y.Doc
  provider: WebsocketProvider
  shapes: Y.Map<Shape>
  order: Y.Array<string>
  undoManager: Y.UndoManager
}

function resolveWebsocketUrl(): string {
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined
  if (envUrl) return envUrl
  const { protocol, hostname } = window.location
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:'
  // In dev, the vite server proxies /ws to the y-websocket server (see vite.config.ts).
  if (import.meta.env.DEV) {
    const port = window.location.port
    return `${wsProto}//${hostname}${port ? ':' + port : ''}/ws`
  }
  return `${wsProto}//${hostname}/ws`
}

export function createYjsContext(room: string): YjsContext {
  const doc = new Y.Doc()
  const provider = new WebsocketProvider(resolveWebsocketUrl(), room, doc, {
    connect: true,
  })

  const shapes = doc.getMap<Shape>('shapes')
  const order = doc.getArray<string>('order')

  const undoManager = new Y.UndoManager([shapes, order], {
    captureTimeout: 400,
  })

  return { doc, provider, shapes, order, undoManager }
}
