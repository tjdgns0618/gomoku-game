import { useEffect, useState } from 'react';
import styles from './Lobby.module.css';

const NICK_STORAGE_KEY = 'gomoku-nick';

export default function Lobby({ activeCode, onCreate, onJoin, onCancel }) {
  const [nickname, setNickname] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NICK_STORAGE_KEY);
      if (saved) setNickname(saved);
    } catch {
      // ignore storage failures
    }
  }, []);

  const handleNicknameChange = (e) => {
    const value = e.target.value;
    setNickname(value);
    try {
      localStorage.setItem(NICK_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  };

  const handleCreate = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    const res = await onCreate(nickname);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
    }
  };

  const handleJoin = async () => {
    if (busy) return;
    const code = input.trim().toUpperCase();
    if (!code) {
      setError('방 코드를 입력하세요.');
      return;
    }
    setError('');
    setBusy(true);
    const res = await onJoin(code, nickname);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
    }
  };

  const handleCopy = async () => {
    if (!activeCode) return;
    try {
      await navigator.clipboard.writeText(activeCode);
    } catch {
      // clipboard may be blocked; ignore
    }
  };

  return (
    <div className={styles.lobby}>
      <header className={styles.header}>
        <h1 className={styles.title}>Gomoku</h1>
        <p className={styles.subtitle}>2인 온라인 멀티플레이</p>
      </header>

      <section className={styles.section} aria-labelledby="nickname-section">
        <h2 id="nickname-section" className={styles.sectionTitle}>닉네임</h2>
        <input
          type="text"
          className={styles.nicknameInput}
          value={nickname}
          onChange={handleNicknameChange}
          placeholder="닉네임 (선택)"
          maxLength={16}
          aria-label="닉네임"
          disabled={Boolean(activeCode)}
        />
      </section>

      <section className={styles.section} aria-labelledby="create-section">
        <h2 id="create-section" className={styles.sectionTitle}>방 만들기</h2>
        {activeCode ? (
          <div className={styles.roomInfo}>
            <p className={styles.roomLabel}>방 코드</p>
            <div className={styles.codeRow}>
              <code className={styles.code}>{activeCode}</code>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopy}
              >
                복사
              </button>
            </div>
            <p className={styles.waiting} aria-live="polite">
              참여자 대기 중...
            </p>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnFullWidth}`}
              onClick={onCancel}
            >
              방 나가기
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFullWidth}`}
            onClick={handleCreate}
            disabled={busy}
          >
            방 만들기
          </button>
        )}
      </section>

      {!activeCode && (
        <>
          <div className={styles.divider}>
            <span>또는</span>
          </div>

          <section className={styles.section} aria-labelledby="join-section">
            <h2 id="join-section" className={styles.sectionTitle}>방 참여</h2>
            <div className={styles.joinRow}>
              <input
                type="text"
                className={styles.input}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoin();
                }}
                placeholder="방 코드 입력"
                maxLength={6}
                autoCapitalize="characters"
                aria-label="방 코드"
                disabled={busy}
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleJoin}
                disabled={busy}
              >
                참여
              </button>
            </div>
          </section>
        </>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
