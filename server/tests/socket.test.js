// Note: lightweight socket.io client smoke test

const { io: Client } = require('socket.io-client');
const http = require('http');
const app = require('../src/app');
const { Server } = require('socket.io');

let server, clientSocket;

beforeAll((done) => {
  server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    socket.on('ping', (cb) => cb('pong'));
  });

  server.listen(() => {
    const port = server.address().port;
    clientSocket = new Client(`http://localhost:${port}`);
    clientSocket.on('connect', done);
  });
});

afterAll(() => {
  if (clientSocket.connected) clientSocket.disconnect();
  server.close();
});

test('socket ping-pong', (done) => {
  clientSocket.emit('ping', (msg) => {
    expect(msg).toBe('pong');
    done();
  });
}, 10000);
