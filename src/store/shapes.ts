import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import type { Shape } from '../types'
import type { YjsContext } from './yjs'

/**
 * Subscribes to the Yjs shapes map + order array and returns shapes in render order
 * (bottom to top).
 */
export function useShapes(ctx: YjsContext): Shape[] {
  const [, tick] = useState(0)

  useEffect(() => {
    const rerender = () => tick((x) => x + 1)
    ctx.shapes.observe(rerender)
    ctx.order.observe(rerender)
    return () => {
      ctx.shapes.unobserve(rerender)
      ctx.order.unobserve(rerender)
    }
  }, [ctx])

  const ids = ctx.order.toArray()
  return ids
    .map((id) => ctx.shapes.get(id))
    .filter((s): s is Shape => Boolean(s))
}

export function addShape(ctx: YjsContext, shape: Shape) {
  ctx.doc.transact(() => {
    ctx.shapes.set(shape.id, shape)
    ctx.order.push([shape.id])
  })
}

export function updateShape(
  ctx: YjsContext,
  id: string,
  patch: Partial<Shape>,
) {
  const current = ctx.shapes.get(id)
  if (!current) return
  ctx.shapes.set(id, { ...current, ...patch } as Shape)
}

export function updateShapes(
  ctx: YjsContext,
  updates: Array<{ id: string; patch: Partial<Shape> }>,
) {
  ctx.doc.transact(() => {
    for (const { id, patch } of updates) {
      const current = ctx.shapes.get(id)
      if (!current) continue
      ctx.shapes.set(id, { ...current, ...patch } as Shape)
    }
  })
}

export function deleteShapes(ctx: YjsContext, ids: string[]) {
  const idSet = new Set(ids)
  ctx.doc.transact(() => {
    for (const id of ids) ctx.shapes.delete(id)
    const remaining = ctx.order.toArray().filter((id) => !idSet.has(id))
    ctx.order.delete(0, ctx.order.length)
    ctx.order.insert(0, remaining)
  })
}

export function reorderShapes(ctx: YjsContext, nextOrder: string[]) {
  ctx.doc.transact(() => {
    ctx.order.delete(0, ctx.order.length)
    ctx.order.insert(0, nextOrder)
  })
}

/** Bring selected ids to the end (top) of the order array, preserving relative order. */
export function bringToFront(ctx: YjsContext, ids: string[]) {
  const idSet = new Set(ids)
  const all = ctx.order.toArray()
  const rest = all.filter((id) => !idSet.has(id))
  const selected = all.filter((id) => idSet.has(id))
  reorderShapes(ctx, [...rest, ...selected])
}

export function sendToBack(ctx: YjsContext, ids: string[]) {
  const idSet = new Set(ids)
  const all = ctx.order.toArray()
  const rest = all.filter((id) => !idSet.has(id))
  const selected = all.filter((id) => idSet.has(id))
  reorderShapes(ctx, [...selected, ...rest])
}

export function bringForward(ctx: YjsContext, ids: string[]) {
  const idSet = new Set(ids)
  const arr = ctx.order.toArray()
  for (let i = arr.length - 2; i >= 0; i--) {
    if (idSet.has(arr[i]) && !idSet.has(arr[i + 1])) {
      ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
    }
  }
  reorderShapes(ctx, arr)
}

export function sendBackward(ctx: YjsContext, ids: string[]) {
  const idSet = new Set(ids)
  const arr = ctx.order.toArray()
  for (let i = 1; i < arr.length; i++) {
    if (idSet.has(arr[i]) && !idSet.has(arr[i - 1])) {
      ;[arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]
    }
  }
  reorderShapes(ctx, arr)
}

/** Wraps a block in a single Yjs transaction tagged with an origin string. */
export function transact(ctx: YjsContext, fn: () => void, origin?: unknown) {
  ctx.doc.transact(fn, origin ?? 'user')
}

export { Y }
