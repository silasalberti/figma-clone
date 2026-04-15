import type { RemoteUser } from '../store/presence'
import type { Viewport } from '../types'

interface Props {
  remoteUsers: RemoteUser[]
  viewport: Viewport
}

/** Renders remote collaborators' cursors in screen space. */
export function Cursors({ remoteUsers, viewport }: Props) {
  return (
    <>
      {remoteUsers.map((u) => {
        if (!u.cursor) return null
        const sx = u.cursor.x * viewport.scale + viewport.x
        const sy = u.cursor.y * viewport.scale + viewport.y
        return (
          <div
            key={u.clientId}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${sx}px, ${sy}px)`,
              pointerEvents: 'none',
            }}
          >
            <svg
              width={18}
              height={24}
              viewBox="0 0 18 24"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
            >
              <path
                d="M1 1 L1 17 L5 13 L8 20 L11 19 L8 12 L14 12 Z"
                fill={u.color}
                stroke="white"
                strokeWidth={1}
              />
            </svg>
            <div className="cursor-label" style={{ background: u.color }}>
              {u.name}
            </div>
          </div>
        )
      })}
    </>
  )
}
