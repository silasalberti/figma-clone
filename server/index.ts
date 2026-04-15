/**
 * Minimal y-websocket server that hosts rooms for the Figma clone.
 *
 * Uses y-websocket's default `setupWSConnection` handler, which implements sync
 * + awareness protocols and holds a Y.Doc per room in memory.
 *
 * Rooms are identified by the first path segment in the URL (e.g. /room-abc),
 * which matches how `WebsocketProvider(url, roomName, doc)` constructs its URLs.
 */
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
// @ts-expect-error no types shipped for this submodule
import { setupWSConnection } from 'y-websocket/bin/utils'

const HOST = process.env.HOST ?? '0.0.0.0'
const PORT = Number(process.env.PORT ?? 1234)

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('figma-clone y-websocket server is running')
})

const wss = new WebSocketServer({ noServer: true })

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, { gc: true })
})

httpServer.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request)
  })
})

httpServer.listen(PORT, HOST, () => {
  console.log(`[figma-clone] y-websocket server listening on ws://${HOST}:${PORT}`)
})
