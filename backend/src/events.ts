// Canal de tiempo real con Server-Sent Events (SSE).
// Mantiene en memoria las conexiones abiertas y les emite eventos.

const clients = new Set<any>()

// GET /api/events  -> el navegador abre un EventSource contra esto.
export function sseHandler(req: any, res: any) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders?.()
  res.write('retry: 3000\n\n')

  clients.add(res)

  // Ping periódico para que la conexión no se caiga por inactividad.
  const ping = setInterval(() => res.write(': ping\n\n'), 25000)

  req.on('close', () => {
    clearInterval(ping)
    clients.delete(res)
  })
}

// Emite un evento a todos los navegadores conectados.
export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of clients) {
    try {
      res.write(payload)
    } catch {
      clients.delete(res)
    }
  }
}
