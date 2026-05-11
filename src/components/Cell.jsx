import styles from './Cell.module.css';

const HOSHI_POINTS = new Set(['3,3', '3,11', '7,7', '11,3', '11,11']);

export default function Cell({ stone, row, col, size, disabled, onClick }) {
  const classes = [
    styles.cell,
    row === 0 && styles.edgeTop,
    row === size - 1 && styles.edgeBottom,
    col === 0 && styles.edgeLeft,
    col === size - 1 && styles.edgeRight,
    HOSHI_POINTS.has(`${row},${col}`) && styles.hoshi,
  ]
    .filter(Boolean)
    .join(' ');

  const stoneClass = stone === 'black' ? styles.stoneBlack : styles.stoneWhite;

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={
        stone
          ? `${stone === 'black' ? 'Player 1' : 'Player 2'} stone at row ${row + 1}, column ${col + 1}`
          : `Empty intersection row ${row + 1}, column ${col + 1}`
      }
    >
      {HOSHI_POINTS.has(`${row},${col}`) && !stone && (
        <span className={styles.hoshiDot} />
      )}
      {stone && <span className={`${styles.stone} ${stoneClass}`} />}
    </button>
  );
}
