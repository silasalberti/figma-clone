import type { Shape, TextShape, RectShape } from '../types'
import { useUIStore } from '../store/ui'
import type { YjsContext } from '../store/yjs'
import { updateShapes } from '../store/shapes'

interface Props {
  ctx: YjsContext
  shapes: Shape[]
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  step?: number
}) {
  return (
    <div className="row">
      <label>{label}</label>
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (!Number.isNaN(v)) onChange(v)
        }}
      />
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
  allowNone,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  allowNone?: boolean
}) {
  return (
    <div className="row">
      <label>{label}</label>
      <div className="swatch-row">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1 }}
        />
        {allowNone && (
          <button
            title="No fill"
            onClick={() => onChange('transparent')}
            style={{ padding: '2px 6px' }}
          >
            ⊘
          </button>
        )}
      </div>
    </div>
  )
}

export function PropertiesPanel({ ctx, shapes }: Props) {
  const { selectedIds } = useUIStore()
  const selected = shapes.filter((s) => selectedIds.includes(s.id))

  if (selected.length === 0) {
    return (
      <div className="panel right props">
        <h3>Properties</h3>
        <div className="empty">Nothing selected</div>
      </div>
    )
  }

  const applyPatch = (patch: Partial<Shape>) => {
    updateShapes(
      ctx,
      selected.map((s) => ({ id: s.id, patch })),
    )
  }

  // Use first selected shape's values as the displayed "representative" value.
  const rep = selected[0]
  const allSameType = selected.every((s) => s.type === rep.type)

  return (
    <div className="panel right props">
      <h3>Transform</h3>
      <NumberField
        label="X"
        value={rep.x}
        onChange={(x) => applyPatch({ x })}
      />
      <NumberField
        label="Y"
        value={rep.y}
        onChange={(y) => applyPatch({ y })}
      />
      <NumberField
        label="W"
        value={rep.width}
        onChange={(width) => applyPatch({ width: Math.max(1, width) })}
      />
      <NumberField
        label="H"
        value={rep.height}
        onChange={(height) => applyPatch({ height: Math.max(1, height) })}
      />
      <NumberField
        label="Rotation"
        value={rep.rotation}
        onChange={(rotation) => applyPatch({ rotation })}
      />

      <h3>Appearance</h3>
      <div className="row">
        <label>Opacity</label>
        <div className="swatch-row">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={rep.opacity}
            onChange={(e) =>
              applyPatch({ opacity: parseFloat(e.target.value) })
            }
            style={{ flex: 1 }}
          />
          <span style={{ width: 36, textAlign: 'right' }}>
            {Math.round(rep.opacity * 100)}%
          </span>
        </div>
      </div>
      <ColorField
        label="Fill"
        value={rep.fill}
        onChange={(fill) => applyPatch({ fill })}
        allowNone
      />
      <ColorField
        label="Stroke"
        value={rep.stroke}
        onChange={(stroke) => applyPatch({ stroke })}
      />
      <NumberField
        label="Stroke W"
        value={rep.strokeWidth}
        onChange={(strokeWidth) =>
          applyPatch({ strokeWidth: Math.max(0, strokeWidth) })
        }
      />

      {allSameType && rep.type === 'rect' && (
        <>
          <h3>Rectangle</h3>
          <NumberField
            label="Radius"
            value={(rep as RectShape).cornerRadius}
            onChange={(cornerRadius) =>
              applyPatch({ cornerRadius: Math.max(0, cornerRadius) } as Partial<RectShape>)
            }
          />
        </>
      )}

      {allSameType && rep.type === 'text' && (
        <>
          <h3>Text</h3>
          <div className="row">
            <label>Content</label>
            <input
              type="text"
              value={(rep as TextShape).text}
              onChange={(e) =>
                applyPatch({ text: e.target.value } as Partial<TextShape>)
              }
            />
          </div>
          <NumberField
            label="Size"
            value={(rep as TextShape).fontSize}
            onChange={(fontSize) =>
              applyPatch({
                fontSize: Math.max(1, fontSize),
              } as Partial<TextShape>)
            }
          />
          <div className="row">
            <label>Weight</label>
            <select
              value={(rep as TextShape).fontStyle}
              onChange={(e) =>
                applyPatch({
                  fontStyle: e.target.value as TextShape['fontStyle'],
                } as Partial<TextShape>)
              }
            >
              <option value="normal">Regular</option>
              <option value="bold">Bold</option>
              <option value="italic">Italic</option>
              <option value="italic bold">Bold italic</option>
            </select>
          </div>
          <div className="row">
            <label>Align</label>
            <select
              value={(rep as TextShape).align}
              onChange={(e) =>
                applyPatch({
                  align: e.target.value as TextShape['align'],
                } as Partial<TextShape>)
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </>
      )}

      <div style={{ padding: '12px', color: 'var(--text-dim)', fontSize: 11 }}>
        {selected.length} selected
      </div>
    </div>
  )
}
