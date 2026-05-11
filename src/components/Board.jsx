import Cell from './Cell.jsx';
import styles from './Board.module.css';

export default function Board({ board, onCellClick, disabled }) {
  const size = board.length;

  return (
    <div
      className={styles.board}
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
      }}
      role="grid"
      aria-label="Gomoku board"
    >
      {board.map((row, r) =>
        row.map((stone, c) => (
          <Cell
            key={`${r}-${c}`}
            stone={stone}
            row={r}
            col={c}
            size={size}
            disabled={disabled || Boolean(stone)}
            onClick={() => onCellClick(r, c)}
          />
        )),
      )}
    </div>
  );
}
