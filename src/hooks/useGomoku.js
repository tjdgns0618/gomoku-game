import { useCallback, useState } from 'react';
import { checkWinner } from '../utils/checkWinner.js';

export const BOARD_SIZE = 15;

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

export function useGomoku() {
  const [board, setBoard] = useState(createEmptyBoard);
  const [currentPlayer, setCurrentPlayer] = useState('black');
  const [winner, setWinner] = useState(null);

  const placeStone = useCallback(
    (row, col) => {
      if (winner || board[row][col]) return;

      const next = board.map((r) => r.slice());
      next[row][col] = currentPlayer;
      setBoard(next);

      if (checkWinner(next, row, col, currentPlayer)) {
        setWinner(currentPlayer);
      } else {
        setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
      }
    },
    [board, currentPlayer, winner],
  );

  const reset = useCallback(() => {
    setBoard(createEmptyBoard());
    setCurrentPlayer('black');
    setWinner(null);
  }, []);

  return { board, currentPlayer, winner, placeStone, reset };
}
