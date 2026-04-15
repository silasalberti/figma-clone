import type Konva from 'konva'

/** Returns a PNG data URL of the provided stage's shape layer content (not the grid). */
export function exportStagePNG(
  stage: Konva.Stage,
  padding = 32,
): string | null {
  // Use the second layer (shapes). If no shapes are present, fall back to the full stage.
  const layers = stage.getLayers()
  const shapesLayer = layers[1] ?? layers[0]
  if (!shapesLayer) return null

  const children = shapesLayer
    .getChildren()
    .filter((n) => n.getClassName() === 'Group')
  if (children.length === 0) {
    return stage.toDataURL({ pixelRatio: 2 })
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const child of children) {
    const box = child.getClientRect({ relativeTo: shapesLayer })
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }

  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2

  return shapesLayer.toDataURL({
    x: (minX - padding) * stage.scaleX() + stage.x(),
    y: (minY - padding) * stage.scaleY() + stage.y(),
    width: width * stage.scaleX(),
    height: height * stage.scaleY(),
    pixelRatio: 2 / stage.scaleX(),
  })
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
