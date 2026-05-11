import Board from './components/Board.jsx';
import GameStatus from './components/GameStatus.jsx';
import Lobby from './components/Lobby.jsx';
import WinnerModal from './components/WinnerModal.jsx';
import { useGameRoom } from './hooks/useGameRoom.js';
import styles from './App.module.css';

export default function App() {
  const {
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
  } = useGameRoom();

  if (!connected) {
    return (
      <div className={styles.app}>
        <p className={styles.connectingBanner} role="status" aria-live="polite">
          서버에 연결 중...
        </p>
      </div>
    );
  }

  if (phase === 'lobby' || phase === 'hosting') {
    return (
      <Lobby
        activeCode={phase === 'hosting' ? roomCode : null}
        onCreate={createRoom}
        onJoin={joinRoom}
        onCancel={leaveRoom}
      />
    );
  }

  if (!state) {
    return (
      <div className={styles.app}>
        <p className={styles.connectingBanner} role="status">
          게임 상태를 불러오는 중...
        </p>
      </div>
    );
  }

  const isGameOver = Boolean(state.winner);
  const myTurn = !isGameOver && state.currentPlayer === role && !opponentDisconnected;
  const me = state.players.find((p) => p.role === role);
  const opponent = state.players.find((p) => p.role !== role);
  const myRoleLabel = role === 'black' ? '흑' : '백';
  const opponentRoleLabel = role === 'black' ? '백' : '흑';

  const resetRequest = state.resetRequest;
  const iRequestedReset = resetRequest && resetRequest.requesterRole === role;
  const opponentRequestedReset = resetRequest && resetRequest.requesterRole !== role;
  const resetButtonDisabled =
    Boolean(resetRequest) || state.playersCount < 2 || opponentLeft;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Gomoku</h1>
        <p className={styles.subtitle}>
          방 코드: <code className={styles.roomCode}>{roomCode}</code>
        </p>
        <p className={styles.subtitle}>
          {myRoleLabel} {me?.nickname || '익명'} (나)
          {opponent ? ` vs ${opponentRoleLabel} ${opponent.nickname}` : ' — 상대 대기 중'}
        </p>
      </header>

      {opponentDisconnected && !opponentLeft && (
        <p className={styles.warningBanner} role="alert">
          상대방 연결이 끊겼습니다. 30초 안에 재접속을 기다립니다...
        </p>
      )}
      {opponentLeft && (
        <p className={styles.errorBanner} role="alert">
          상대방이 방을 나갔습니다.
        </p>
      )}

      {iRequestedReset && (
        <p className={styles.warningBanner} role="status" aria-live="polite">
          상대방의 동의를 기다리는 중...
        </p>
      )}
      {opponentRequestedReset && (
        <div className={styles.resetPrompt} role="alert">
          <span>{opponent?.nickname || '상대방'}님이 다시 시작을 요청했습니다.</span>
          <div className={styles.resetPromptActions}>
            <button
              type="button"
              className={styles.resetButton}
              onClick={() => respondReset(true)}
            >
              수락
            </button>
            <button
              type="button"
              className={styles.leaveButton}
              onClick={() => respondReset(false)}
            >
              거절
            </button>
          </div>
        </div>
      )}

      <GameStatus state={state} role={role} />

      <Board
        board={state.board}
        onCellClick={placeStone}
        disabled={!myTurn || opponentLeft}
      />

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.resetButton}
          onClick={requestReset}
          disabled={resetButtonDisabled}
        >
          {iRequestedReset ? '응답 대기 중...' : '다시 시작'}
        </button>
        <button
          type="button"
          className={styles.surrenderButton}
          onClick={surrender}
          disabled={isGameOver || state.playersCount < 2 || opponentLeft}
        >
          기권
        </button>
        <button type="button" className={styles.leaveButton} onClick={leaveRoom}>
          방 나가기
        </button>
      </div>

      <WinnerModal
        winner={state.winner}
        role={role}
        resetRequest={resetRequest}
        opponentNickname={opponent?.nickname}
        onRequestReset={requestReset}
        onRespondReset={respondReset}
      />
    </div>
  );
}
