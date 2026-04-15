import { create } from 'zustand'
import type { Tool, Viewport } from '../types'

interface UIState {
  tool: Tool
  selectedIds: string[]
  viewport: Viewport
  editingTextId: string | null

  setTool: (tool: Tool) => void
  setSelectedIds: (ids: string[]) => void
  addSelection: (id: string) => void
  toggleSelection: (id: string) => void
  clearSelection: () => void
  setViewport: (v: Viewport | ((prev: Viewport) => Viewport)) => void
  setEditingTextId: (id: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  tool: 'select',
  selectedIds: [],
  viewport: { x: 0, y: 0, scale: 1 },
  editingTextId: null,

  setTool: (tool) => set({ tool }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  addSelection: (id) =>
    set((s) =>
      s.selectedIds.includes(id)
        ? s
        : { selectedIds: [...s.selectedIds, id] },
    ),
  toggleSelection: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),
  setViewport: (v) =>
    set((s) => ({
      viewport: typeof v === 'function' ? v(s.viewport) : v,
    })),
  setEditingTextId: (editingTextId) => set({ editingTextId }),
}))
