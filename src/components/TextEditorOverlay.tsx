import { useEffect, useRef } from 'react'
import type { TextShape, Viewport } from '../types'

interface Props {
  shape: TextShape
  viewport: Viewport
  onCommit: (text: string) => void
  onCancel: () => void
}

/**
 * HTML textarea that overlays the canvas while a text shape is being edited.
 * Positioned in screen coordinates on top of the Konva stage.
 */
export function TextEditorOverlay({
  shape,
  viewport,
  onCommit,
  onCancel,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.focus()
    ref.current.select()
  }, [shape.id])

  const sx = shape.x * viewport.scale + viewport.x
  const sy = shape.y * viewport.scale + viewport.y

  return (
    <textarea
      ref={ref}
      className="text-editor-overlay"
      defaultValue={shape.text}
      style={{
        left: sx,
        top: sy,
        width: shape.width * viewport.scale,
        minHeight: shape.height * viewport.scale,
        fontSize: shape.fontSize * viewport.scale,
        color: shape.fill,
        fontFamily: shape.fontFamily,
        fontWeight: shape.fontStyle.includes('bold') ? 700 : 400,
        fontStyle: shape.fontStyle.includes('italic') ? 'italic' : 'normal',
        textAlign: shape.align,
        transform: `rotate(${shape.rotation}deg)`,
        transformOrigin: 'top left',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          onCommit(e.currentTarget.value)
        }
      }}
      onBlur={(e) => onCommit(e.currentTarget.value)}
    />
  )
}
