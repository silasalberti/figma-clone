import { useRef, useState } from 'react'
import type { Shape } from '../types'
import { useUIStore } from '../store/ui'
import type { YjsContext } from '../store/yjs'
import {
  bringForward,
  bringToFront,
  deleteShapes,
  reorderShapes,
  sendBackward,
  sendToBack,
  updateShape,
} from '../store/shapes'

interface Props {
  ctx: YjsContext
  shapes: Shape[]
}

function iconFor(type: Shape['type']): string {
  switch (type) {
    case 'rect':
      return '▭'
    case 'ellipse':
      return '◯'
    case 'line':
      return '╱'
    case 'text':
      return 'T'
  }
}

export function LayersPanel({ ctx, shapes }: Props) {
  const { selectedIds, setSelectedIds } = useUIStore()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const dragIdRef = useRef<string | null>(null)

  // Top of canvas = end of order array; reverse for display.
  const display = [...shapes].reverse()

  // If the shape being renamed was deleted (e.g. by another user), derive null.
  const activeRenamingId =
    renamingId && shapes.some((s) => s.id === renamingId) ? renamingId : null

  const onDragStart = (id: string) => {
    dragIdRef.current = id
  }

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
  }

  const onDrop = (targetId: string) => {
    const dragId = dragIdRef.current
    dragIdRef.current = null
    if (!dragId || dragId === targetId) return
    const orderArr = ctx.order.toArray()
    const without = orderArr.filter((id) => id !== dragId)
    const targetIdx = without.indexOf(targetId)
    if (targetIdx === -1) return
    // We dropped on `targetId` in display order. Display is reversed,
    // so we insert after target in canvas order.
    without.splice(targetIdx + 1, 0, dragId)
    reorderShapes(ctx, without)
  }

  const commitRename = (id: string) => {
    const name = draftName.trim() || 'Untitled'
    updateShape(ctx, id, { name })
    setRenamingId(null)
  }

  return (
    <div className="panel right layers">
      <h3>Layers</h3>
      {display.length === 0 && (
        <div className="empty">No layers yet. Draw something!</div>
      )}
      {display.map((s) => {
        const selected = selectedIds.includes(s.id)
        return (
          <div
            key={s.id}
            className={`layer-row ${selected ? 'selected' : ''}`}
            draggable={activeRenamingId !== s.id}
            onDragStart={() => onDragStart(s.id)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(s.id)}
            onClick={(e) => {
              if (e.shiftKey) {
                setSelectedIds(
                  selected
                    ? selectedIds.filter((x) => x !== s.id)
                    : [...selectedIds, s.id],
                )
              } else {
                setSelectedIds([s.id])
              }
            }}
            onDoubleClick={() => {
              setRenamingId(s.id)
              setDraftName(s.name)
            }}
          >
            <span className="icon">{iconFor(s.type)}</span>
            {activeRenamingId === s.id ? (
              <input
                className="rename"
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={() => commitRename(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(s.id)
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="name">{s.name}</span>
            )}
            <button
              title={s.visible ? 'Hide' : 'Show'}
              onClick={(e) => {
                e.stopPropagation()
                updateShape(ctx, s.id, { visible: !s.visible })
              }}
              style={{ padding: '2px 4px' }}
            >
              {s.visible ? '👁' : '⦸'}
            </button>
            <button
              title={s.locked ? 'Unlock' : 'Lock'}
              onClick={(e) => {
                e.stopPropagation()
                updateShape(ctx, s.id, { locked: !s.locked })
              }}
              style={{ padding: '2px 4px' }}
            >
              {s.locked ? '🔒' : '🔓'}
            </button>
          </div>
        )
      })}

      <h3 style={{ marginTop: 16 }}>Arrange</h3>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '0 12px' }}>
        <button
          disabled={selectedIds.length === 0}
          onClick={() => bringToFront(ctx, selectedIds)}
        >
          To front
        </button>
        <button
          disabled={selectedIds.length === 0}
          onClick={() => bringForward(ctx, selectedIds)}
        >
          Forward
        </button>
        <button
          disabled={selectedIds.length === 0}
          onClick={() => sendBackward(ctx, selectedIds)}
        >
          Backward
        </button>
        <button
          disabled={selectedIds.length === 0}
          onClick={() => sendToBack(ctx, selectedIds)}
        >
          To back
        </button>
        <button
          disabled={selectedIds.length === 0}
          onClick={() => deleteShapes(ctx, selectedIds)}
          style={{ color: 'var(--danger)' }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
