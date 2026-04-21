// backend/server.js
// Simple Node.js backend running on port 3000

const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Backend API is running on port 3000',
    proxied_via: 'Nginx Reverse Proxy',
    timestamp: new Date().toISOString()
  }));
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Backend server running at http://127.0.0.1:3000');
});
