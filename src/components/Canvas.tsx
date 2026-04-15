import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type Konva from 'konva'
import { Layer, Line, Rect, Stage, Transformer } from 'react-konva'
import type { LineShape, Shape, TextShape } from '../types'
import { useUIStore } from '../store/ui'
import type { YjsContext } from '../store/yjs'
import {
  addShape,
  deleteShapes,
  updateShape,
  updateShapes,
} from '../store/shapes'
import { duplicateShape, makeEllipse, makeLine, makeRect, makeText } from '../lib/shapes'
import { ShapeNode } from './ShapeNode'
import type { RemoteUser } from '../store/presence'
import { Cursors } from './Cursors'
import { TextEditorOverlay } from './TextEditorOverlay'

interface Props {
  ctx: YjsContext
  shapes: Shape[]
  remoteUsers: RemoteUser[]
  self: { name: string; color: string }
  stageRef?: React.RefObject<Konva.Stage | null>
}

interface Draft {
  id: string
  type: 'rect' | 'ellipse' | 'line'
  startX: number
  startY: number
}

function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  )
}

function boundingRect(shape: Shape) {
  return {
    x: shape.x,
    y: shape.y,
    w: shape.width,
    h: shape.height,
  }
}

export function Canvas({ ctx, shapes, remoteUsers, self, stageRef: externalStageRef }: Props) {
  const {
    tool,
    setTool,
    selectedIds,
    setSelectedIds,
    viewport,
    setViewport,
    editingTextId,
    setEditingTextId,
  } = useUIStore()

  const internalStageRef = useRef<Konva.Stage | null>(null)
  const stageRef = externalStageRef ?? internalStageRef
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const shapeRefs = useRef<Map<string, Konva.Group>>(new Map())
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const [size, setSize] = useState({ w: 800, h: 600 })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [marquee, setMarquee] = useState<
    { x: number; y: number; w: number; h: number } | null
  >(null)
  const [spaceDown, setSpaceDown] = useState(false)

  const effectiveTool = spaceDown ? 'hand' : tool

  const shapesById = useMemo(() => {
    const map = new Map<string, Shape>()
    for (const s of shapes) map.set(s.id, s)
    return map
  }, [shapes])

  // Keep the stage sized to its container.
  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Connect Transformer to the currently-selected shapes.
  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return
    const nodes = selectedIds
      .map((id) => shapeRefs.current.get(id))
      .filter((n): n is Konva.Group => Boolean(n))
    transformer.nodes(nodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedIds, shapes])

  // Broadcast cursor + user to peers via Yjs awareness (throttled via RAF).
  const pendingCursor = useRef<{ x: number; y: number } | null>(null)
  const rafPending = useRef<number | null>(null)
  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      pendingCursor.current = { x, y }
      if (rafPending.current !== null) return
      rafPending.current = requestAnimationFrame(() => {
        rafPending.current = null
        const c = pendingCursor.current
        ctx.provider.awareness.setLocalStateField('user', {
          name: self.name,
          color: self.color,
          cursor: c,
        })
      })
    },
    [ctx, self],
  )

  // Initial presence broadcast.
  useEffect(() => {
    ctx.provider.awareness.setLocalStateField('user', {
      name: self.name,
      color: self.color,
      cursor: null,
    })
  }, [ctx, self])

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - viewport.x) / viewport.scale,
      y: (sy - viewport.y) / viewport.scale,
    }),
    [viewport],
  )

  // -------------- Wheel zoom / pan --------------
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // Ctrl/Meta + wheel OR pinch (ctrlKey=true) => zoom. Otherwise pan.
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const factor = Math.exp(-e.evt.deltaY * 0.01)
      const nextScale = Math.max(0.05, Math.min(16, viewport.scale * factor))
      const worldX = (pointer.x - viewport.x) / viewport.scale
      const worldY = (pointer.y - viewport.y) / viewport.scale
      setViewport({
        x: pointer.x - worldX * nextScale,
        y: pointer.y - worldY * nextScale,
        scale: nextScale,
      })
    } else {
      setViewport((v) => ({
        ...v,
        x: v.x - e.evt.deltaX,
        y: v.y - e.evt.deltaY,
      }))
    }
  }

  // -------------- Pointer down --------------
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const world = screenToWorld(pointer.x, pointer.y)

    // Middle-button always pans.
    if (e.evt.button === 1) {
      e.evt.preventDefault()
      return
    }

    if (effectiveTool === 'hand') return

    const clickedOnEmpty = e.target === stage || e.target.name() === 'bg'

    if (effectiveTool === 'select') {
      if (clickedOnEmpty) {
        if (!e.evt.shiftKey) setSelectedIds([])
        setMarquee({ x: world.x, y: world.y, w: 0, h: 0 })
      }
      return
    }

    if (effectiveTool === 'text') {
      const shape = makeText(world.x, world.y)
      addShape(ctx, shape)
      setSelectedIds([shape.id])
      setEditingTextId(shape.id)
      setTool('select')
      return
    }

    if (effectiveTool === 'rect') {
      const shape = makeRect(world.x, world.y, 0, 0)
      addShape(ctx, shape)
      setDraft({ id: shape.id, type: 'rect', startX: world.x, startY: world.y })
    } else if (effectiveTool === 'ellipse') {
      const shape = makeEllipse(world.x, world.y, 0, 0)
      addShape(ctx, shape)
      setDraft({
        id: shape.id,
        type: 'ellipse',
        startX: world.x,
        startY: world.y,
      })
    } else if (effectiveTool === 'line') {
      const shape = makeLine(world.x, world.y, world.x, world.y)
      addShape(ctx, shape)
      setDraft({ id: shape.id, type: 'line', startX: world.x, startY: world.y })
    }
  }

  // -------------- Pointer move --------------
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const world = screenToWorld(pointer.x, pointer.y)

    broadcastCursor(world.x, world.y)

    if (draft) {
      if (draft.type === 'line') {
        const minX = Math.min(draft.startX, world.x)
        const minY = Math.min(draft.startY, world.y)
        updateShape(ctx, draft.id, {
          x: minX,
          y: minY,
          width: Math.abs(world.x - draft.startX),
          height: Math.abs(world.y - draft.startY),
          points: [
            draft.startX - minX,
            draft.startY - minY,
            world.x - minX,
            world.y - minY,
          ],
        } as Partial<LineShape>)
      } else {
        const x = Math.min(draft.startX, world.x)
        const y = Math.min(draft.startY, world.y)
        const w = Math.abs(world.x - draft.startX)
        const h = Math.abs(world.y - draft.startY)
        updateShape(ctx, draft.id, { x, y, width: w, height: h })
      }
      return
    }

    if (marquee) {
      setMarquee((m) => (m ? { ...m, w: world.x - m.x, h: world.y - m.y } : m))
    }
  }

  // -------------- Pointer up --------------
  const handleMouseUp = () => {
    if (draft) {
      const s = ctx.shapes.get(draft.id)
      if (s && (s.width < 2 || s.height < 2) && draft.type !== 'line') {
        // Tiny drag = click. Give it a default size centered on start.
        const defaultSize =
          draft.type === 'rect' ? { w: 120, h: 80 } : { w: 100, h: 100 }
        updateShape(ctx, draft.id, {
          x: draft.startX - defaultSize.w / 2,
          y: draft.startY - defaultSize.h / 2,
          width: defaultSize.w,
          height: defaultSize.h,
        })
      } else if (s && draft.type === 'line' && s.width < 2 && s.height < 2) {
        // Tiny line -> horizontal default.
        updateShape(ctx, draft.id, {
          x: draft.startX,
          y: draft.startY,
          width: 120,
          height: 0,
          points: [0, 0, 120, 0],
        } as Partial<LineShape>)
      }
      setSelectedIds([draft.id])
      setDraft(null)
      setTool('select')
      return
    }

    if (marquee) {
      const norm = {
        x: Math.min(marquee.x, marquee.x + marquee.w),
        y: Math.min(marquee.y, marquee.y + marquee.h),
        w: Math.abs(marquee.w),
        h: Math.abs(marquee.h),
      }
      if (norm.w > 3 || norm.h > 3) {
        const hits = shapes
          .filter((s) => s.visible && !s.locked)
          .filter((s) => rectsIntersect(norm, boundingRect(s)))
          .map((s) => s.id)
        setSelectedIds(hits)
      }
      setMarquee(null)
    }
  }

  // -------------- Keyboard shortcuts --------------
  useEffect(() => {
    const isEditingText = () => {
      const el = document.activeElement
      if (!el) return false
      const tag = el.tagName
      return (
        tag === 'INPUT' || tag === 'TEXTAREA' || el.getAttribute('contenteditable') === 'true'
      )
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isEditingText()) {
        setSpaceDown(true)
        e.preventDefault()
        return
      }
      if (isEditingText()) return

      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) ctx.undoManager.redo()
        else ctx.undoManager.undo()
        return
      }
      if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        ctx.undoManager.redo()
        return
      }
      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setSelectedIds(shapes.map((s) => s.id))
        return
      }
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        if (selectedIds.length === 0) return
        const copies = selectedIds
          .map((id) => shapesById.get(id))
          .filter((s): s is Shape => Boolean(s))
          .map((s) => duplicateShape(s))
        ctx.doc.transact(() => {
          for (const c of copies) {
            ctx.shapes.set(c.id, c)
            ctx.order.push([c.id])
          }
        })
        setSelectedIds(copies.map((c) => c.id))
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length === 0) return
        e.preventDefault()
        deleteShapes(ctx, selectedIds)
        setSelectedIds([])
        return
      }
      if (e.key === 'Escape') {
        setSelectedIds([])
        setTool('select')
        return
      }
      const nudge = e.shiftKey ? 10 : 1
      if (selectedIds.length > 0 && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const dx = e.key === 'ArrowLeft' ? -nudge : e.key === 'ArrowRight' ? nudge : 0
        const dy = e.key === 'ArrowUp' ? -nudge : e.key === 'ArrowDown' ? nudge : 0
        updateShapes(
          ctx,
          selectedIds.map((id) => {
            const s = shapesById.get(id)
            return { id, patch: { x: (s?.x ?? 0) + dx, y: (s?.y ?? 0) + dy } }
          }),
        )
        return
      }

      // Tool shortcuts.
      if (e.key === 'v' || e.key === 'V') setTool('select')
      else if (e.key === 'h' || e.key === 'H') setTool('hand')
      else if (e.key === 'r' || e.key === 'R') setTool('rect')
      else if (e.key === 'o' || e.key === 'O') setTool('ellipse')
      else if (e.key === 'l' || e.key === 'L') setTool('line')
      else if (e.key === 't' || e.key === 'T') setTool('text')
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceDown(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [ctx, selectedIds, shapes, shapesById, setSelectedIds, setTool])

  // -------------- Stage drag (hand tool) --------------
  const stageDraggable = effectiveTool === 'hand'

  const handleStageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target !== stageRef.current) return
    setViewport({
      x: e.target.x(),
      y: e.target.y(),
      scale: viewport.scale,
    })
  }

  // -------------- Shape-level handlers --------------
  const onShapeMouseDown =
    (id: string) => (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (effectiveTool !== 'select') return
      if (e.evt.shiftKey) {
        setSelectedIds(
          selectedIds.includes(id)
            ? selectedIds.filter((x) => x !== id)
            : [...selectedIds, id],
        )
      } else if (!selectedIds.includes(id)) {
        setSelectedIds([id])
      }
    }

  const onShapeDragEnd =
    (id: string) => (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target as Konva.Group
      const s = shapesById.get(id)
      if (!s) return
      const newX = node.x() - s.width / 2
      const newY = node.y() - s.height / 2
      // When multiple shapes are selected, move them all by the same delta.
      if (selectedIds.length > 1 && selectedIds.includes(id)) {
        const dx = newX - s.x
        const dy = newY - s.y
        updateShapes(
          ctx,
          selectedIds.map((sid) => {
            const ss = shapesById.get(sid)
            return { id: sid, patch: { x: (ss?.x ?? 0) + dx, y: (ss?.y ?? 0) + dy } }
          }),
        )
      } else {
        updateShape(ctx, id, { x: newX, y: newY })
      }
    }

  const onShapeTransformEnd =
    (id: string) => (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target as Konva.Group
      const s = shapesById.get(id)
      if (!s) return
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      const newWidth = Math.max(1, s.width * scaleX)
      const newHeight = Math.max(1, s.height * scaleY)
      const patch: Partial<Shape> = {
        x: node.x() - newWidth / 2,
        y: node.y() - newHeight / 2,
        width: newWidth,
        height: newHeight,
        rotation: node.rotation(),
      }
      if (s.type === 'line') {
        const line = s as LineShape
        ;(patch as Partial<LineShape>).points = [
          line.points[0] * scaleX,
          line.points[1] * scaleY,
          line.points[2] * scaleX,
          line.points[3] * scaleY,
        ]
      }
      node.scaleX(1)
      node.scaleY(1)
      updateShape(ctx, id, patch)
    }

  const onShapeDblClick =
    (id: string) => (e: Konva.KonvaEventObject<MouseEvent>) => {
      const s = shapesById.get(id)
      if (!s) return
      if (s.type === 'text') {
        e.cancelBubble = true
        setSelectedIds([id])
        setEditingTextId(id)
      }
    }

  const setShapeRef = (id: string) => (node: Konva.Group | null) => {
    if (node) shapeRefs.current.set(id, node)
    else shapeRefs.current.delete(id)
  }

  const editingShape =
    editingTextId && shapesById.get(editingTextId)?.type === 'text'
      ? (shapesById.get(editingTextId) as TextShape)
      : null

  const cursorStyle =
    effectiveTool === 'hand'
      ? 'grab'
      : effectiveTool === 'select'
        ? 'default'
        : 'crosshair'

  return (
    <div
      ref={wrapperRef}
      className="canvas-wrap"
      style={{ cursor: cursorStyle }}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown as unknown as (e: Konva.KonvaEventObject<TouchEvent>) => void}
        onTouchMove={handleMouseMove as unknown as (e: Konva.KonvaEventObject<TouchEvent>) => void}
        onTouchEnd={handleMouseUp}
        draggable={stageDraggable}
        onDragEnd={handleStageDragEnd}
      >
        <Layer>
          {/* Background — acts as a click target for deselection. */}
          <Rect
            name="bg"
            x={-1e6}
            y={-1e6}
            width={2e6}
            height={2e6}
            fill="#2a2a2a"
            listening
          />
          <GridBackground viewport={viewport} size={size} />
        </Layer>

        <Layer>
          {shapes.map((s) => (
            <ShapeNode
              key={s.id}
              ref={setShapeRef(s.id)}
              shape={s}
              draggable={effectiveTool === 'select' && !editingTextId}
              listening={effectiveTool === 'select' || effectiveTool === 'hand'}
              onMouseDown={onShapeMouseDown(s.id)}
              onDragEnd={onShapeDragEnd(s.id)}
              onTransformEnd={onShapeTransformEnd(s.id)}
              onDblClick={onShapeDblClick(s.id)}
            />
          ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            keepRatio={false}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 2 || Math.abs(newBox.height) < 2) {
                return oldBox
              }
              return newBox
            }}
          />
          {marquee && (
            <Rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.w}
              height={marquee.h}
              fill="rgba(13,153,255,0.1)"
              stroke="#0d99ff"
              strokeWidth={1 / viewport.scale}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      <div className="overlay">
        <Cursors remoteUsers={remoteUsers} viewport={viewport} />
      </div>

      {editingShape && (
        <TextEditorOverlay
          shape={editingShape}
          viewport={viewport}
          onCommit={(text) => {
            updateShape(ctx, editingShape.id, { text })
            setEditingTextId(null)
          }}
          onCancel={() => setEditingTextId(null)}
        />
      )}
    </div>
  )
}

function GridBackground({
  viewport,
  size,
}: {
  viewport: { x: number; y: number; scale: number }
  size: { w: number; h: number }
}) {
  // Grid spacing in world units; adjusts density based on zoom.
  const baseSpacing = 100
  let spacing = baseSpacing
  while (spacing * viewport.scale < 40) spacing *= 2
  while (spacing * viewport.scale > 120) spacing /= 2

  const world = {
    x0: -viewport.x / viewport.scale,
    y0: -viewport.y / viewport.scale,
    x1: (size.w - viewport.x) / viewport.scale,
    y1: (size.h - viewport.y) / viewport.scale,
  }

  const verticals: number[] = []
  const startX = Math.floor(world.x0 / spacing) * spacing
  for (let x = startX; x <= world.x1; x += spacing) verticals.push(x)

  const horizontals: number[] = []
  const startY = Math.floor(world.y0 / spacing) * spacing
  for (let y = startY; y <= world.y1; y += spacing) horizontals.push(y)

  const color = '#343434'
  const strokeWidth = 1 / viewport.scale

  return (
    <>
      {verticals.map((x) => (
        <Line
          key={`v-${x}`}
          points={[x, world.y0, x, world.y1]}
          stroke={color}
          strokeWidth={strokeWidth}
          listening={false}
        />
      ))}
      {horizontals.map((y) => (
        <Line
          key={`h-${y}`}
          points={[world.x0, y, world.x1, y]}
          stroke={color}
          strokeWidth={strokeWidth}
          listening={false}
        />
      ))}
    </>
  )
}
