import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001');
const SESSION_KEY = 'gomoku-session';

const ERROR_MESSAGES = {
  'not-found': '방을 찾을 수 없습니다.',
  full: '방이 가득 찼습니다.',
  'already-in-room': '이미 방에 입장해 있습니다.',
  'no-room': '방에 입장하지 않았습니다.',
  'waiting-opponent': '상대방을 기다리는 중입니다.',
  'game-over': '게임이 종료되었습니다.',
  'not-your-turn': '상대방 차례입니다.',
  'invalid-position': '잘못된 위치입니다.',
  occupied: '이미 돌이 놓여 있습니다.',
  'invalid-token': '재연결 토큰이 유효하지 않습니다.',
  'slot-taken': '해당 자리에 이미 다른 연결이 있습니다.',
};

function errorMessage(code) {
  return ERROR_MESSAGES[code] || '알 수 없는 오류';
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.code || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore storage failures
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function useGameRoom() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [phase, setPhase] = useState('lobby');
  const [roomCode, setRoomCode] = useState(null);
  const [role, setRole] = useState(null);
  const [state, setState] = useState(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      const session = loadSession();
      if (session) {
        socket.emit('rejoin-room', session.code, session.token, (res) => {
          if (res.error) {
            clearSession();
            return;
          }
          setRoomCode(res.code);
          setRole(res.role);
          setState(res.state);
          setOpponentLeft(false);
          setOpponentDisconnected(
            res.state.players.length === 2 &&
              res.state.players.some((p) => !p.connected && p.role !== res.role),
          );
          setPhase(res.state.players.length < 2 ? 'hosting' : 'playing');
        });
      }
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('opponent-joined', (snapshot) => {
      setState(snapshot);
      setPhase('playing');
    });

    socket.on('state-update', (snapshot) => {
      setState(snapshot);
    });

    socket.on('opponent-disconnected', (snapshot) => {
      setState(snapshot);
      setOpponentDisconnected(true);
    });

    socket.on('opponent-rejoined', (snapshot) => {
      setState(snapshot);
      setOpponentDisconnected(false);
    });

    socket.on('opponent-left', (snapshot) => {
      if (snapshot) setState(snapshot);
      setOpponentLeft(true);
      setOpponentDisconnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((nickname) => {
    return new Promise((resolve) => {
      socketRef.current.emit('create-room', nickname, (res) => {
        if (res.error) {
          resolve({ ok: false, message: errorMessage(res.error) });
          return;
        }
        saveSession({ code: res.code, token: res.token });
        setRoomCode(res.code);
        setRole(res.role);
        setState(res.state);
        setPhase('hosting');
        setOpponentLeft(false);
        setOpponentDisconnected(false);
        resolve({ ok: true });
      });
    });
  }, []);

  const joinRoom = useCallback((code, nickname) => {
    return new Promise((resolve) => {
      socketRef.current.emit('join-room', code, nickname, (res) => {
        if (res.error) {
          resolve({ ok: false, message: errorMessage(res.error) });
          return;
        }
        saveSession({ code: res.code, token: res.token });
        setRoomCode(res.code);
        setRole(res.role);
        setState(res.state);
        setPhase('playing');
        setOpponentLeft(false);
        setOpponentDisconnected(false);
        resolve({ ok: true });
      });
    });
  }, []);

  const placeStone = useCallback((row, col) => {
    socketRef.current.emit('place-stone', { row, col });
  }, []);

  const requestReset = useCallback(() => {
    socketRef.current.emit('request-reset');
  }, []);

  const respondReset = useCallback((accepted) => {
    socketRef.current.emit('respond-reset', { accepted: Boolean(accepted) });
  }, []);

  const surrender = useCallback(() => {
    socketRef.current.emit('surrender');
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current.emit('leave-room');
    clearSession();
    setPhase('lobby');
    setRoomCode(null);
    setRole(null);
    setState(null);
    setOpponentLeft(false);
    setOpponentDisconnected(false);
  }, []);

  return {
    connected,
    phase,
    roomCode,
    role,
    state,
    opponentLeft,
    opponentDisconnected,
    createRoom,
    joinRoom,
    placeStone,
    requestReset,
    respondReset,
    surrender,
    leaveRoom,
  };
}
