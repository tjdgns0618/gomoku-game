import styles from './WinnerModal.module.css';

export default function WinnerModal({
  winner,
  role,
  resetRequest,
  opponentNickname,
  onRequestReset,
  onRespondReset,
}) {
  if (!winner) return null;

  const isDraw = winner === 'draw';
  const isWin = !isDraw && winner === role;

  let title;
  let subtitle;
  if (isDraw) {
    title = '무승부';
    subtitle = '보드가 가득 찼습니다.';
  } else if (isWin) {
    title = '승리!';
    subtitle = '5개의 돌을 일렬로 연결했습니다.';
  } else {
    title = '패배';
    subtitle = '상대방이 먼저 승리했습니다.';
  }

  const stoneClass = isDraw
    ? null
    : winner === 'black'
      ? styles.stoneBlack
      : styles.stoneWhite;

  const iRequested = resetRequest && resetRequest.requesterRole === role;
  const opponentRequested = resetRequest && resetRequest.requesterRole !== role;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-title"
    >
      <div className={styles.modal}>
        {stoneClass && (
          <span
            className={`${styles.stone} ${stoneClass}`}
            aria-hidden="true"
          />
        )}
        <h2 id="winner-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.subtitle}>{subtitle}</p>

        {opponentRequested ? (
          <>
            <p className={styles.subtitle}>
              {opponentNickname || '상대방'}님이 다시 시작을 요청했습니다.
            </p>
            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.button}
                onClick={() => onRespondReset(true)}
                autoFocus
              >
                수락
              </button>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => onRespondReset(false)}
              >
                거절
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className={styles.button}
            onClick={onRequestReset}
            disabled={iRequested}
            autoFocus
          >
            {iRequested ? '응답 대기 중...' : '다시 시작 요청'}
          </button>
        )}
      </div>
    </div>
  );
}
