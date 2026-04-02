const clients = [];

// Keep connections alive with heartbeats every 30 seconds
setInterval(() => {
  clients.forEach((res) => {
    res.write(':\n\n'); // SSE comment as heartbeat
  });
}, 30000);

const registerClient = (res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no', // Disable buffering for Nginx if present
  });
  clients.push(res);
  res.write('retry: 3000\n\n');
  res.on('close', () => {
    const idx = clients.indexOf(res);
    if (idx >= 0) clients.splice(idx, 1);
  });
};

const broadcastEvent = (event) => {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach((res) => {
    try { res.write(data); } catch (_) {}
  });
};

module.exports = { registerClient, broadcastEvent };

