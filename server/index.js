import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_PATH = path.resolve(__dirname, '..', 'dist');

const PORT = Number(process.env.PORT) || 3001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : '*';

const BOARD_SIZE = 15;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];
const DISCONNECT_GRACE_MS = 30_000;

const app = express();
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'gomoku-server', rooms: rooms.size });
});
app.use(express.static(DIST_PATH));
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

const rooms = new Map();

function generateRoomCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i += 1) {
      code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
  } while (rooms.has(code));
  return code;
}

function generateToken() {
  return randomBytes(16).toString('hex');
}

function normalizeNickname(raw) {
  const trimmed = String(raw || '').trim().slice(0, 16);
  return trimmed || '익명';
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function checkWinner(board, row, col, player) {
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        r >= 0 &&
        r < BOARD_SIZE &&
        c >= 0 &&
        c < BOARD_SIZE &&
        board[r][c] === player
      ) {
        count += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (count >= 5) return true;
  }
  return false;
}

function publicState(room) {
  return {
    board: room.board,
    currentPlayer: room.currentPlayer,
    winner: room.winner,
    playersCount: room.players.length,
    players: room.players.map((p) => ({
      role: p.role,
      nickname: p.nickname,
      connected: Boolean(p.socketId),
    })),
    resetRequest: room.resetRequest
      ? { requesterRole: room.resetRequest.requesterRole }
      : null,
  };
}

function findRoomBySocket(socketId) {
  for (const [code, room] of rooms) {
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) return { code, room, player };
  }
  return null;
}

function leaveRoomImmediate(socket) {
  const found = findRoomBySocket(socket.id);
  if (!found) return;
  const { code, room } = found;
  room.players = room.players.filter((p) => p.socketId !== socket.id);
  socket.leave(code);
  if (room.players.length === 0) {
    rooms.delete(code);
  } else {
    io.to(code).emit('opponent-left', publicState(room));
  }
}

function handleDisconnect(socket) {
  const found = findRoomBySocket(socket.id);
  if (!found) return;
  const { code, room, player } = found;
  player.socketId = null;
  player.disconnectedAt = Date.now();
  socket.leave(code);
  io.to(code).emit('opponent-disconnected', publicState(room));

  setTimeout(() => {
    if (!rooms.has(code)) return;
    if (!player.disconnectedAt) return;
    if (Date.now() - player.disconnectedAt < DISCONNECT_GRACE_MS) return;
    room.players = room.players.filter((p) => p !== player);
    if (room.players.length === 0) {
      rooms.delete(code);
    } else {
      io.to(code).emit('opponent-left', publicState(room));
    }
  }, DISCONNECT_GRACE_MS + 100);
}

io.on('connection', (socket) => {
  socket.on('create-room', (rawNickname, callback) => {
    if (typeof callback !== 'function') return;
    if (findRoomBySocket(socket.id)) {
      callback({ error: 'already-in-room' });
      return;
    }
    const code = generateRoomCode();
    const token = generateToken();
    const room = {
      players: [
        {
          socketId: socket.id,
          role: 'black',
          nickname: normalizeNickname(rawNickname),
          token,
          disconnectedAt: null,
        },
      ],
      board: createEmptyBoard(),
      currentPlayer: 'black',
      winner: null,
      stonesPlaced: 0,
      createdAt: Date.now(),
    };
    room.resetRequest = null;
    rooms.set(code, room);
    socket.join(code);
    callback({ code, role: 'black', token, state: publicState(room) });
  });

  socket.on('join-room', (rawCode, rawNickname, callback) => {
    if (typeof callback !== 'function') return;
    const code = String(rawCode || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      callback({ error: 'not-found' });
      return;
    }
    if (room.players.length >= 2) {
      callback({ error: 'full' });
      return;
    }
    if (findRoomBySocket(socket.id)) {
      callback({ error: 'already-in-room' });
      return;
    }
    const token = generateToken();
    const player = {
      socketId: socket.id,
      role: 'white',
      nickname: normalizeNickname(rawNickname),
      token,
      disconnectedAt: null,
    };
    room.players.push(player);
    socket.join(code);
    callback({ code, role: 'white', token, state: publicState(room) });
    socket.to(code).emit('opponent-joined', publicState(room));
  });

  socket.on('rejoin-room', (rawCode, rawToken, callback) => {
    if (typeof callback !== 'function') return;
    const code = String(rawCode || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      callback({ error: 'not-found' });
      return;
    }
    const player = room.players.find((p) => p.token === rawToken);
    if (!player) {
      callback({ error: 'invalid-token' });
      return;
    }
    if (player.socketId && player.socketId !== socket.id) {
      callback({ error: 'slot-taken' });
      return;
    }
    player.socketId = socket.id;
    player.disconnectedAt = null;
    socket.join(code);
    callback({ code, role: player.role, token: player.token, state: publicState(room) });
    socket.to(code).emit('opponent-rejoined', publicState(room));
  });

  socket.on('place-stone', ({ row, col } = {}, callback) => {
    const respond = (payload) => {
      if (typeof callback === 'function') callback(payload);
    };
    const found = findRoomBySocket(socket.id);
    if (!found) return respond({ error: 'no-room' });
    const { code, room, player } = found;
    if (room.players.length < 2) return respond({ error: 'waiting-opponent' });
    if (room.winner) return respond({ error: 'game-over' });
    if (player.role !== room.currentPlayer) return respond({ error: 'not-your-turn' });
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      row >= BOARD_SIZE ||
      col < 0 ||
      col >= BOARD_SIZE
    ) {
      return respond({ error: 'invalid-position' });
    }
    if (room.board[row][col]) return respond({ error: 'occupied' });

    room.board[row][col] = player.role;
    room.stonesPlaced += 1;
    if (checkWinner(room.board, row, col, player.role)) {
      room.winner = player.role;
    } else if (room.stonesPlaced >= BOARD_SIZE * BOARD_SIZE) {
      room.winner = 'draw';
    } else {
      room.currentPlayer = room.currentPlayer === 'black' ? 'white' : 'black';
    }
    io.to(code).emit('state-update', publicState(room));
    respond({ ok: true });
  });

  socket.on('surrender', () => {
    const found = findRoomBySocket(socket.id);
    if (!found) return;
    const { code, room, player } = found;
    if (room.winner) return;
    if (room.players.length < 2) return;
    room.winner = player.role === 'black' ? 'white' : 'black';
    io.to(code).emit('state-update', publicState(room));
  });

  socket.on('request-reset', () => {
    const found = findRoomBySocket(socket.id);
    if (!found) return;
    const { code, room, player } = found;
    if (room.players.length < 2) return;
    if (room.resetRequest) return;
    room.resetRequest = { requesterRole: player.role };
    io.to(code).emit('state-update', publicState(room));
  });

  socket.on('respond-reset', ({ accepted } = {}) => {
    const found = findRoomBySocket(socket.id);
    if (!found) return;
    const { code, room, player } = found;
    if (!room.resetRequest) return;
    if (room.resetRequest.requesterRole === player.role) return;
    if (accepted) {
      room.board = createEmptyBoard();
      room.currentPlayer = 'black';
      room.winner = null;
      room.stonesPlaced = 0;
    }
    room.resetRequest = null;
    io.to(code).emit('state-update', publicState(room));
  });

  socket.on('leave-room', () => {
    leaveRoomImmediate(socket);
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Gomoku server listening on port ${PORT}`);
});
