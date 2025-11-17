const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const logger = require('./utils/logger');
const socketHandler = require('./socket/socketHandler');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Attach the socket handler
socketHandler(io);

const port = process.env.PORT || 4000;
server.listen(port, () => {
  logger.info(`Server is running at http://localhost:${port}`);
});

module.exports = { server, io }; // Export for testing