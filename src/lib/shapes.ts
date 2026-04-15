import { v4 as uuid } from 'uuid'
import type {
  EllipseShape,
  LineShape,
  RectShape,
  Shape,
  TextShape,
} from '../types'

let counters: Record<string, number> = { rect: 0, ellipse: 0, line: 0, text: 0 }

/** Resets per-type counters from an existing set of shapes (used on room join). */
export function syncNameCounters(shapes: Shape[]) {
  const next = { rect: 0, ellipse: 0, line: 0, text: 0 }
  for (const s of shapes) {
    const m = s.name.match(/^(Rectangle|Ellipse|Line|Text) (\d+)$/)
    if (!m) continue
    const key =
      m[1] === 'Rectangle'
        ? 'rect'
        : m[1] === 'Ellipse'
          ? 'ellipse'
          : m[1] === 'Line'
            ? 'line'
            : 'text'
    next[key] = Math.max(next[key], parseInt(m[2], 10))
  }
  counters = next
}

function nextName(type: 'rect' | 'ellipse' | 'line' | 'text'): string {
  counters[type] += 1
  const label =
    type === 'rect'
      ? 'Rectangle'
      : type === 'ellipse'
        ? 'Ellipse'
        : type === 'line'
          ? 'Line'
          : 'Text'
  return `${label} ${counters[type]}`
}

export function makeRect(x: number, y: number, w: number, h: number): RectShape {
  return {
    id: uuid(),
    type: 'rect',
    name: nextName('rect'),
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    fill: '#4f46e5',
    stroke: '#1e1b4b',
    strokeWidth: 0,
    opacity: 1,
    visible: true,
    locked: false,
    cornerRadius: 0,
  }
}

export function makeEllipse(
  x: number,
  y: number,
  w: number,
  h: number,
): EllipseShape {
  return {
    id: uuid(),
    type: 'ellipse',
    name: nextName('ellipse'),
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    fill: '#10b981',
    stroke: '#064e3b',
    strokeWidth: 0,
    opacity: 1,
    visible: true,
    locked: false,
  }
}

export function makeLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): LineShape {
  const minX = Math.min(x1, x2)
  const minY = Math.min(y1, y2)
  return {
    id: uuid(),
    type: 'line',
    name: nextName('line'),
    x: minX,
    y: minY,
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
    rotation: 0,
    fill: '#000000',
    stroke: '#e6e6e6',
    strokeWidth: 2,
    opacity: 1,
    visible: true,
    locked: false,
    points: [x1 - minX, y1 - minY, x2 - minX, y2 - minY],
  }
}

export function makeText(
  x: number,
  y: number,
  text = 'Text',
): TextShape {
  return {
    id: uuid(),
    type: 'text',
    name: nextName('text'),
    x,
    y,
    width: 160,
    height: 28,
    rotation: 0,
    fill: '#e6e6e6',
    stroke: '#000000',
    strokeWidth: 0,
    opacity: 1,
    visible: true,
    locked: false,
    text,
    fontSize: 24,
    fontFamily: 'Inter, sans-serif',
    fontStyle: 'normal',
    align: 'left',
  }
}

export function duplicateShape(s: Shape, offset = 16): Shape {
  return {
    ...s,
    id: uuid(),
    x: s.x + offset,
    y: s.y + offset,
    name: `${s.name} copy`,
  }
}
