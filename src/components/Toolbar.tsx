import { useEffect, useState } from 'react'
import type { Tool } from '../types'
import { useUIStore } from '../store/ui'
import type { YjsContext } from '../store/yjs'
import {
  type RemoteUser,
  useConnectionStatus,
} from '../store/presence'

interface Props {
  ctx: YjsContext
  room: string
  self: { name: string; color: string }
  remoteUsers: RemoteUser[]
  onExport: () => void
  onClear: () => void
}

const TOOLS: Array<{ key: Tool; label: string; icon: string; shortcut: string }> = [
  { key: 'select', label: 'Move', icon: '↖', shortcut: 'V' },
  { key: 'hand', label: 'Hand', icon: '✋', shortcut: 'H' },
  { key: 'rect', label: 'Rectangle', icon: '▭', shortcut: 'R' },
  { key: 'ellipse', label: 'Ellipse', icon: '◯', shortcut: 'O' },
  { key: 'line', label: 'Line', icon: '╱', shortcut: 'L' },
  { key: 'text', label: 'Text', icon: 'T', shortcut: 'T' },
]

export function Toolbar({
  ctx,
  room,
  self,
  remoteUsers,
  onExport,
  onClear,
}: Props) {
  const { tool, setTool } = useUIStore()
  const { connected } = useConnectionStatus(ctx.provider)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1200)
    return () => clearTimeout(t)
  }, [copied])

  const copyShareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${room}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      window.prompt('Share this link:', url)
    }
  }

  return (
    <div className="toolbar">
      <div className="title">Figma Clone</div>
      <div className="divider" />
      <div className="group">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            className={tool === t.key ? 'active' : ''}
            onClick={() => setTool(t.key)}
            title={`${t.label} (${t.shortcut})`}
          >
            <span style={{ fontWeight: 600, marginRight: 4 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="divider" />
      <div className="group">
        <button
          onClick={() => ctx.undoManager.undo()}
          disabled={!ctx.undoManager.canUndo()}
          title="Undo (⌘Z)"
        >
          ↶ Undo
        </button>
        <button
          onClick={() => ctx.undoManager.redo()}
          disabled={!ctx.undoManager.canRedo()}
          title="Redo (⌘⇧Z)"
        >
          ↷ Redo
        </button>
      </div>

      <div className="divider" />
      <div className="group">
        <button onClick={onExport} title="Export canvas as PNG">
          ⤓ Export PNG
        </button>
        <button onClick={onClear} title="Delete everything on the canvas">
          ✕ Clear
        </button>
      </div>

      <div className="spacer" />

      <div className="presence">
        {remoteUsers.slice(0, 4).map((u) => (
          <span
            key={u.clientId}
            className="avatar"
            style={{ background: u.color }}
            title={u.name}
          >
            {u.name
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)}
          </span>
        ))}
        <span
          className="avatar"
          style={{ background: self.color, outline: '1px solid white' }}
          title={`${self.name} (you)`}
        >
          {self.name
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)}
        </span>
      </div>

      <div className="divider" />
      <button onClick={copyShareLink} title="Copy a link to this room">
        {copied ? '✓ Copied' : '🔗 Share'}
      </button>

      <div className="divider" />
      <div className={`connection-status ${connected ? 'connected' : ''}`}>
        <span className="dot" />
        <span>{connected ? `Room: ${room}` : 'Connecting…'}</span>
      </div>
    </div>
  )
}
