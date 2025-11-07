const logger = require('../utils/logger');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    logger.info(`New connection: ${socket.id}`);

    socket.on('initiateCall', ({ userId, signalData, myId }) => {
      logger.info(`Call initiated from ${myId} to ${userId}`);
      socket.peerId = userId;
      io.to(userId).emit('incomingCall', { signalData, from: myId });
    });

    socket.on('answerCall', (data) => {
      logger.info(`Call answered by ${socket.id} to ${data.to}`);
      socket.peerId = data.to;
      io.to(data.to).emit('callAccepted', data.signal);
    });

    socket.on('endCall', ({ to }) => {
      logger.info(`Call ended by ${socket.id} to ${to}`);
      // Always notify both ends — if `to` is missing, check socket.peerId
      const targetId = to || socket.peerId;

      if (targetId) {
        io.to(targetId).emit('callEnded', { from: socket.id });
      }

      // Tell the one who clicked "End Call"
      io.to(socket.id).emit('callEnded', { from: socket.id });
      delete socket.peerId;
    });

    // 🆕 handle page reload / refresh
    socket.on('userReloading', () => {
      if (socket.peerId) {
        const peerId = socket.peerId;
        io.to(peerId).emit('peerReloaded', { id: socket.id });
        delete socket.peerId;
      }
    });

    socket.on('disconnect', () => {
      logger.warn(`User disconnected: ${socket.id}`);

      if (socket.peerId) {
        const peerId = socket.peerId;
        io.to(peerId).emit('peerReloaded', { id: socket.id });
        delete socket.peerId;
      }
    });
  });
};

module.exports = socketHandler;
