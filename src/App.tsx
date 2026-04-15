import { useEffect, useMemo, useRef, useState } from 'react'
import type Konva from 'konva'
import { Toolbar } from './components/Toolbar'
import { Canvas } from './components/Canvas'
import { LayersPanel } from './components/LayersPanel'
import { PropertiesPanel } from './components/PropertiesPanel'
import { createYjsContext, type YjsContext } from './store/yjs'
import { useShapes, deleteShapes } from './store/shapes'
import { getOrCreateLocalUser, useRemoteUsers } from './store/presence'
import { syncNameCounters } from './lib/shapes'
import { downloadDataUrl, exportStagePNG } from './lib/export'

function roomFromHash(): string {
  const raw = window.location.hash.replace(/^#/, '')
  if (raw && /^[a-zA-Z0-9-_]{3,64}$/.test(raw)) return raw
  const slug = Math.random().toString(36).slice(2, 10)
  window.location.hash = slug
  return slug
}

export default function App() {
  const [room] = useState(roomFromHash)
  const self = useMemo(() => getOrCreateLocalUser(), [])
  const ctxRef = useRef<YjsContext | null>(null)
  if (!ctxRef.current) ctxRef.current = createYjsContext(room)
  const ctx = ctxRef.current
  const stageRef = useRef<Konva.Stage | null>(null)

  useEffect(() => {
    return () => {
      ctx.undoManager.destroy()
      ctx.provider.destroy()
      ctx.doc.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shapes = useShapes(ctx)
  const remoteUsers = useRemoteUsers(ctx.provider, ctx.doc.clientID)

  // Sync layer-name counters when shapes first populate.
  const hasShapes = shapes.length > 0
  useEffect(() => {
    syncNameCounters(shapes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShapes])

  const onExport = () => {
    const stage = stageRef.current
    if (!stage) return
    const dataUrl = exportStagePNG(stage)
    if (!dataUrl) return
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadDataUrl(dataUrl, `figma-clone-${room}-${ts}.png`)
  }

  const onClear = () => {
    if (shapes.length === 0) return
    if (!window.confirm('Delete every shape in this room? (affects all users)')) return
    deleteShapes(ctx, shapes.map((s) => s.id))
  }

  return (
    <div className="app">
      <Toolbar
        ctx={ctx}
        room={room}
        self={self}
        remoteUsers={remoteUsers}
        onExport={onExport}
        onClear={onClear}
      />
      <LayersPanel ctx={ctx} shapes={shapes} />
      <Canvas
        ctx={ctx}
        shapes={shapes}
        remoteUsers={remoteUsers}
        self={self}
        stageRef={stageRef}
      />
      <PropertiesPanel ctx={ctx} shapes={shapes} />
    </div>
  )
}
