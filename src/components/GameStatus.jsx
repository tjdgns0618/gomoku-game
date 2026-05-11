import styles from './GameStatus.module.css';

export default function GameStatus({ state, role }) {
  if (state.winner) return null;

  const { currentPlayer } = state;
  const isBlack = currentPlayer === 'black';
  const colorLabel = isBlack ? '흑' : '백';
  const isMyTurn = currentPlayer === role;
  const turnLabel = isMyTurn ? '내 차례' : '상대 차례';

  return (
    <div className={styles.status} aria-live="polite">
      <span className={styles.label}>현재:</span>
      <span className={styles.player}>
        <span
          className={`${styles.indicator} ${
            isBlack ? styles.indicatorBlack : styles.indicatorWhite
          }`}
        />
        {turnLabel} ({colorLabel})
      </span>
    </div>
  );
}
