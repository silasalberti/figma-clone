import { Ellipse, Group, Line, Rect, Text } from 'react-konva'
import type Konva from 'konva'
import type { Shape } from '../types'
import { forwardRef } from 'react'

interface Props {
  shape: Shape
  draggable: boolean
  listening: boolean
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onTap?: (e: Konva.KonvaEventObject<TouchEvent>) => void
  onDblClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onDragStart?: (e: Konva.KonvaEventObject<DragEvent>) => void
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void
}

/**
 * Renders a single shape. All shapes are wrapped in a Group positioned at the shape's
 * center with an offset equal to half its size, so rotation always happens around the center.
 */
export const ShapeNode = forwardRef<Konva.Group, Props>(function ShapeNode(
  {
    shape,
    draggable,
    listening,
    onMouseDown,
    onClick,
    onTap,
    onDblClick,
    onDragStart,
    onDragEnd,
    onTransformEnd,
  },
  ref,
) {
  if (!shape.visible) return null

  const w = Math.max(1, shape.width)
  const h = Math.max(1, shape.height)

  return (
    <Group
      ref={ref}
      id={shape.id}
      name="shape"
      x={shape.x + w / 2}
      y={shape.y + h / 2}
      offsetX={w / 2}
      offsetY={h / 2}
      rotation={shape.rotation}
      opacity={shape.opacity}
      draggable={draggable && !shape.locked}
      listening={listening && !shape.locked}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onTap={onTap}
      onDblClick={onDblClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      {shape.type === 'rect' && (
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill={shape.fill === 'transparent' ? undefined : shape.fill}
          stroke={shape.strokeWidth > 0 ? shape.stroke : undefined}
          strokeWidth={shape.strokeWidth}
          cornerRadius={shape.cornerRadius}
          perfectDrawEnabled={false}
        />
      )}
      {shape.type === 'ellipse' && (
        <Ellipse
          x={w / 2}
          y={h / 2}
          radiusX={w / 2}
          radiusY={h / 2}
          fill={shape.fill === 'transparent' ? undefined : shape.fill}
          stroke={shape.strokeWidth > 0 ? shape.stroke : undefined}
          strokeWidth={shape.strokeWidth}
          perfectDrawEnabled={false}
        />
      )}
      {shape.type === 'line' && (
        <Line
          points={shape.points}
          stroke={shape.stroke}
          strokeWidth={Math.max(1, shape.strokeWidth)}
          lineCap="round"
          hitStrokeWidth={Math.max(10, shape.strokeWidth)}
          perfectDrawEnabled={false}
        />
      )}
      {shape.type === 'text' && (
        <Text
          x={0}
          y={0}
          width={w}
          text={shape.text}
          fontSize={shape.fontSize}
          fontFamily={shape.fontFamily}
          fontStyle={shape.fontStyle}
          align={shape.align}
          fill={shape.fill}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  )
})
