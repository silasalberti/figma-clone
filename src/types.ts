export type ShapeType = 'rect' | 'ellipse' | 'line' | 'text'

export type Tool = 'select' | 'hand' | 'rect' | 'ellipse' | 'line' | 'text'

export interface BaseShape {
  id: string
  type: ShapeType
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
  visible: boolean
  locked: boolean
}

export interface RectShape extends BaseShape {
  type: 'rect'
  cornerRadius: number
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse'
}

export interface LineShape extends BaseShape {
  type: 'line'
  /** Endpoints expressed relative to (x, y). points[0..1] is start, [2..3] is end. */
  points: [number, number, number, number]
}

export interface TextShape extends BaseShape {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  fontStyle: 'normal' | 'bold' | 'italic' | 'italic bold'
  align: 'left' | 'center' | 'right'
}

export type Shape = RectShape | EllipseShape | LineShape | TextShape

export interface Viewport {
  x: number
  y: number
  scale: number
}

export interface PresenceUser {
  name: string
  color: string
  cursor: { x: number; y: number } | null
}
