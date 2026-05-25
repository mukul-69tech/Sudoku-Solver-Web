/**
 * SudokuX — Premium Sudoku Solver
 * Core Engine: Backtracking Algorithm (inspired by C++ recursive implementation)
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture mirrors the original C++ project:
 *   - 2D array (9×9) as board representation
 *   - isSafe() → validates row, column, and 3×3 box (like C++ isValid)
 *   - solveSudoku() → recursive backtracking solver
 *   - findEmpty() → finds next empty cell (like C++ findUnassigned)
 */
 
'use strict';
 
/* ═══════════════════════════════════════════════
   1. STATE
═══════════════════════════════════════════════ */
const State = {
  board:       Array.from({length: 9}, () => Array(9).fill(0)), // current board
  solution:    Array.from({length: 9}, () => Array(9).fill(0)), // full solution
  given:       Array.from({length: 9}, () => Array(9).fill(false)), // pre-filled cells
  notes:       Array.from({length: 9}, () => Array.from({length:9}, ()=> new Set())), // pencil notes
  selected:    null,   // {row, col}
  difficulty:  'easy',
  hintsLeft:   3,
  hintsUsed:   0,
  errorCount:  0,
  totalErrors: 0,
  totalSolved: 0,
  totalHints:  0,
  bestTime:    Infinity,
  timerSecs:   0,
  timerActive: false,
  timerHandle: null,
  solving:     false,
  soundOn:     true,
  visualOn:    true,
  solveSpeed:  3,
  noteMode:    false,
};
 
/* Difficulty → number of clues revealed */
const CLUE_COUNT = { easy: 38, medium: 30, hard: 24 };
 
/* ═══════════════════════════════════════════════
   2. DOM REFS
═══════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const Board       = $('sudokuBoard');
const TimerDisplay= $('timerDisplay');
const StatusMsg   = $('statusMessage');
const HintsLeft   = $('hintsLeft');
const ErrorCount  = $('errorCount');
const StatSolved  = $('statSolved');
const StatBest    = $('statBest');
const StatHints   = $('statHints');
const StatErrors  = $('statErrors');
const WinModal    = $('winModal');
const ErrorModal  = $('errorModal');
const WinTime     = $('winTime');
const WinHints    = $('winHints');
const WinErrors   = $('winErrors');
const SpeedLabel  = $('speedLabel');
 
/* ═══════════════════════════════════════════════
   3. CORE BACKTRACKING ENGINE
   (direct port of the C++ Sudoku solver logic)
═══════════════════════════════════════════════ */
 
/**
 * isSafe — Validates placement of `num` at (row, col)
 * Checks: row, column, and 3×3 box — exactly as in C++
 */
function isSafe(board, row, col, num) {
  // ── Row check ──
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }
  // ── Column check ──
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }
  // ── 3×3 Box check ──
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}
 
/**
 * findEmpty — Finds next empty cell (value === 0)
 * Returns {row, col} or null if board is complete
 */
function findEmpty(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return {row: r, col: c};
    }
  }
  return null; // Board solved!
}
 
/**
 * solveSudoku — Recursive Backtracking Algorithm
 * Identical logic to the C++ recursive solver:
 *   1. Find empty cell
 *   2. Try digits 1–9
 *   3. If safe → place & recurse
 *   4. If recursion fails → backtrack (reset to 0)
 * Returns true if solved, false if unsolvable
 */
function solveSudoku(board) {
  const empty = findEmpty(board);
  if (!empty) return true; // Base case: no empty cell → solved!
 
  const {row, col} = empty;
 
  for (let num = 1; num <= 9; num++) {
    if (isSafe(board, row, col, num)) {
      board[row][col] = num;         // Place number
      if (solveSudoku(board)) return true; // Recurse
      board[row][col] = 0;           // Backtrack
    }
  }
  return false; // Trigger backtracking in caller
}
 
/**
 * isValidBoard — Checks if existing filled cells violate Sudoku rules
 * Used for input validation
 */
function isValidBoard(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const num = board[r][c];
      if (num === 0) continue;
      board[r][c] = 0;
      const safe = isSafe(board, r, c, num);
      board[r][c] = num;
      if (!safe) return false;
    }
  }
  return true;
}
 
/**
 * countSolutions — Counts solutions (≤ 2) to check uniqueness
 */
function countSolutions(board, limit = 2) {
  const empty = findEmpty(board);
  if (!empty) return 1;
  const {row, col} = empty;
  let count = 0;
  for (let num = 1; num <= 9; num++) {
    if (isSafe(board, row, col, num)) {
      board[row][col] = num;
      count += countSolutions(board, limit);
      board[row][col] = 0;
      if (count >= limit) return count;
    }
  }
  return count;
}
 
/* ═══════════════════════════════════════════════
   4. PUZZLE GENERATION
═══════════════════════════════════════════════ */
 
/** Generates a fully solved board using randomised backtracking */
function generateFullBoard() {
  const board = Array.from({length: 9}, () => Array(9).fill(0));
  fillBoard(board);
  return board;
}
 
function fillBoard(board) {
  const empty = findEmpty(board);
  if (!empty) return true;
  const {row, col} = empty;
  const nums = shuffle([1,2,3,4,5,6,7,8,9]);
  for (const num of nums) {
    if (isSafe(board, row, col, num)) {
      board[row][col] = num;
      if (fillBoard(board)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}
 
/** Creates a puzzle by removing cells from full board */
function generatePuzzle(difficulty) {
  const full = generateFullBoard();
  const solution = full.map(r => [...r]);
  const puzzle   = full.map(r => [...r]);
  const clues    = CLUE_COUNT[difficulty];
  const toRemove = 81 - clues;
 
  const positions = shuffle([...Array(81).keys()]);
  let removed = 0;
 
  for (const pos of positions) {
    if (removed >= toRemove) break;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
 
    // Ensure unique solution (skip heavy check on hard for speed)
    if (difficulty !== 'hard') {
      const copy = puzzle.map(row => [...row]);
      if (countSolutions(copy, 2) !== 1) {
        puzzle[r][c] = backup;
        continue;
      }
    }
    removed++;
  }
 
  return {puzzle, solution};
}
 
/* ═══════════════════════════════════════════════
   5. UI — BOARD RENDERING
═══════════════════════════════════════════════ */
 
function initBoard() {
  Board.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
 
      // Note grid inside cell
      const notes = document.createElement('div');
      notes.className = 'cell-notes';
      notes.id = `notes-${r}-${c}`;
      for (let n = 1; n <= 9; n++) {
        const nd = document.createElement('span');
        nd.className = 'cell-note';
        nd.id = `note-${r}-${c}-${n}`;
        notes.appendChild(nd);
      }
      cell.appendChild(notes);
 
      cell.addEventListener('click', () => onCellClick(r, c));
      Board.appendChild(cell);
    }
  }
}
 
function renderBoard() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      renderCell(r, c);
    }
  }
}
 
function renderCell(r, c) {
  const cell = getCell(r, c);
  const val  = State.board[r][c];
  const notesEl = document.getElementById(`notes-${r}-${c}`);
 
  // Clear state classes
  cell.classList.remove('given','user','error','hint','solving','backtrack','solve-animate');
  cell.textContent = '';
  notesEl.style.display = 'none';
 
  if (val !== 0) {
    cell.appendChild(notesEl); // re-add (textContent clears children)
    cell.textContent = val;
    cell.appendChild(notesEl);
    notesEl.style.display = 'none';
 
    if (State.given[r][c]) cell.classList.add('given');
    else cell.classList.add('user');
  } else {
    // Show notes if any
    const cellNotes = State.notes[r][c];
    if (cellNotes.size > 0) {
      for (let n = 1; n <= 9; n++) {
        const nd = document.getElementById(`note-${r}-${c}-${n}`);
        nd.textContent = cellNotes.has(n) ? n : '';
      }
      notesEl.style.display = 'grid';
    }
  }
}
 
function getCell(r, c) {
  return Board.children[r * 9 + c];
}
 
function highlightSelection(r, c) {
  // Clear previous
  for (let i = 0; i < 81; i++) {
    Board.children[i].classList.remove('selected','related','same-num');
  }
  if (r === null) return;
 
  const val = State.board[r][c];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = getCell(row, col);
      if (row === r && col === c) {
        cell.classList.add('selected');
      } else if (
        row === r || col === c ||
        (Math.floor(row/3) === Math.floor(r/3) && Math.floor(col/3) === Math.floor(c/3))
      ) {
        cell.classList.add('related');
      }
      if (val !== 0 && State.board[row][col] === val) {
        cell.classList.add('same-num');
      }
    }
  }
}
 
/* ═══════════════════════════════════════════════
   6. EVENTS
═══════════════════════════════════════════════ */
 
function onCellClick(r, c) {
  if (State.solving) return;
  State.selected = {row: r, col: c};
  highlightSelection(r, c);
  updateNumpadActive();
}
 
function onNumInput(num) {
  if (State.solving) return;
  const sel = State.selected;
  if (!sel) { toast('Select a cell first!', 'info'); return; }
  const {row, col} = sel;
  if (State.given[row][col]) { playSound('error'); return; }
 
  if (State.noteMode) {
    // Toggle note
    const notes = State.notes[row][col];
    if (num === 0) { notes.clear(); }
    else { notes.has(num) ? notes.delete(num) : notes.add(num); }
    renderCell(row, col);
    return;
  }
 
  if (num === 0) {
    State.board[row][col] = 0;
    State.notes[row][col].clear();
    renderCell(row, col);
    highlightSelection(row, col);
    return;
  }
 
  // Validate move
  const prev = State.board[row][col];
  State.board[row][col] = num;
 
  if (!isSafe(State.board, row, col, num)) {
    // Invalid move
    State.board[row][col] = num; // keep it visible but mark error
    getCell(row, col).classList.add('error');
    setTimeout(() => {
      getCell(row, col).classList.remove('error');
    }, 600);
    State.errorCount++;
    State.totalErrors++;
    updateStats();
    playSound('error');
    setStatus(`⚠ Conflict detected at (${row+1},${col+1})!`);
    return;
  }
 
  // Clear notes in affected cells
  clearNotesFor(row, col, num);
 
  renderCell(row, col);
  highlightSelection(row, col);
  updateNumpadActive();
  playSound('place');
 
  // Check win
  if (findEmpty(State.board) === null) checkWin();
}
 
function clearNotesFor(row, col, num) {
  // Clear num from row, col, box notes
  for (let i = 0; i < 9; i++) {
    State.notes[row][i].delete(num);
    State.notes[i][col].delete(num);
  }
  const br = Math.floor(row/3)*3, bc = Math.floor(col/3)*3;
  for (let r = br; r < br+3; r++)
    for (let c = bc; c < bc+3; c++)
      State.notes[r][c].delete(num);
}
 
function updateNumpadActive() {
  const sel = State.selected;
  if (!sel) return;
  const val = State.board[sel.row][sel.col];
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.classList.toggle('active', +btn.dataset.num === val && val !== 0);
  });
}
 
/* Keyboard input */
document.addEventListener('keydown', e => {
  if (State.solving) return;
  const sel = State.selected;
 
  // Arrow navigation
  const arrows = {ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
  if (arrows[e.key]) {
    e.preventDefault();
    const [dr, dc] = arrows[e.key];
    const r = sel ? Math.max(0,Math.min(8,sel.row+dr)) : 0;
    const c = sel ? Math.max(0,Math.min(8,sel.col+dc)) : 0;
    onCellClick(r, c);
    return;
  }
 
  if (e.key === 'n' || e.key === 'N') {
    State.noteMode = !State.noteMode;
    toast(State.noteMode ? 'Note mode ON' : 'Note mode OFF', 'info');
    return;
  }
 
  const num = e.key === 'Backspace' || e.key === 'Delete' ? 0
            : (e.key >= '1' && e.key <= '9') ? +e.key : null;
  if (num !== null) onNumInput(num);
});
 
/* ═══════════════════════════════════════════════
   7. ACTIONS
═══════════════════════════════════════════════ */
 
function generatePuzzleAction() {
  if (State.solving) return;
  setStatus('Generating puzzle...');
  stopTimer();
 
  // Use setTimeout to let UI paint
  setTimeout(() => {
    const {puzzle, solution} = generatePuzzle(State.difficulty);
 
    // Copy into state
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        State.board[r][c]    = puzzle[r][c];
        State.solution[r][c] = solution[r][c];
        State.given[r][c]    = puzzle[r][c] !== 0;
        State.notes[r][c]    = new Set();
      }
    }
 
    State.selected   = null;
    State.hintsLeft  = 3;
    State.errorCount = 0;
    HintsLeft.textContent  = 3;
    ErrorCount.textContent = 0;
 
    renderBoard();
    highlightSelection(null, null);
    resetTimer();
    startTimer();
    setStatus(`${cap(State.difficulty)} puzzle generated. Good luck!`);
    playSound('generate');
  }, 30);
}
 
/**
 * animatedSolve — Visualises the backtracking algorithm step by step
 * Creates an async generator of solver steps, then renders them at speed
 */
async function animatedSolveAction() {
  if (State.solving) return;
  if (!isValidBoard(State.board)) { showError('Invalid Board', 'The current board has conflicts. Clear them before solving.'); return; }
 
  State.solving = true;
  $('solveBtn').disabled = true;
  setStatus('🧠 Backtracking solver running...');
 
  const boardCopy = State.board.map(r => [...r]);
  const steps     = [];
 
  // Collect all backtracking steps
  function solveWithSteps(board) {
    const empty = findEmpty(board);
    if (!empty) return true;
    const {row, col} = empty;
    for (let num = 1; num <= 9; num++) {
      if (isSafe(board, row, col, num)) {
        board[row][col] = num;
        steps.push({row, col, num, type: 'place'});
        if (solveWithSteps(board)) return true;
        board[row][col] = 0;
        steps.push({row, col, num: 0, type: 'back'});
      }
    }
    return false;
  }
 
  const hasSolution = solveWithSteps(boardCopy);
 
  if (!hasSolution) {
    State.solving = false;
    $('solveBtn').disabled = false;
    showError('No Solution', 'This puzzle cannot be solved. It may be invalid or have no valid arrangement.');
    return;
  }
 
  if (!State.visualOn) {
    // Instant solve
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!State.given[r][c]) State.board[r][c] = boardCopy[r][c];
    renderBoard();
    finishSolve();
    return;
  }
 
  // Speed → delay mapping
  const delays = {1: 60, 2: 25, 3: 10, 4: 3, 5: 0};
  const delay  = delays[State.solveSpeed] || 10;
 
  for (const step of steps) {
    const {row, col, num, type} = step;
    if (State.given[row][col]) continue;
    State.board[row][col] = num;
    const cell = getCell(row, col);
    cell.classList.remove('solving','backtrack','error');
 
    if (num !== 0) {
      cell.textContent = num;
      cell.classList.add(type === 'back' ? 'backtrack' : 'solving');
    } else {
      cell.textContent = '';
      cell.classList.add('backtrack');
    }
 
    if (delay > 0) await sleep(delay);
    else if (steps.indexOf(step) % 200 === 0) await sleep(0); // yield to browser
  }
 
  // Clean up visuals
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const cell = getCell(r,c);
      cell.classList.remove('solving','backtrack');
      if (!State.given[r][c] && State.board[r][c] !== 0) {
        cell.classList.add('user');
        cell.classList.add('solve-animate');
      }
    }
 
  finishSolve();
}
 
function finishSolve() {
  State.solving = false;
  $('solveBtn').disabled = false;
  renderBoard();
  stopTimer();
  setStatus('✅ Solved by backtracking engine!');
  playSound('win');
  toast('Puzzle solved by the AI engine!', 'success');
}
 
function hintAction() {
  if (State.solving) return;
  if (State.hintsLeft <= 0) { toast('No hints remaining!', 'warn'); return; }
 
  // Find an empty or incorrect cell
  const empties = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (State.board[r][c] !== State.solution[r][c]) empties.push({r, c});
 
  if (empties.length === 0) { toast('Board is already correct!', 'success'); return; }
 
  const {r, c} = empties[Math.floor(Math.random() * empties.length)];
  State.board[r][c] = State.solution[r][c];
  State.given[r][c] = true; // lock it
  State.notes[r][c].clear();
 
  const cell = getCell(r, c);
  cell.classList.add('hint');
  renderCell(r, c);
  setTimeout(() => cell.classList.remove('hint'), 1200);
 
  State.hintsLeft--;
  State.hintsUsed++;
  State.totalHints++;
  HintsLeft.textContent = State.hintsLeft;
  updateStats();
  playSound('hint');
  setStatus(`💡 Hint placed at row ${r+1}, column ${c+1}`);
 
  if (findEmpty(State.board) === null) checkWin();
}
 
function checkAction() {
  if (State.solving) return;
  let correct = true;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = State.board[r][c];
      if (val === 0) continue;
      if (val !== State.solution[r][c]) {
        getCell(r,c).classList.add('error');
        setTimeout(() => getCell(r,c).classList.remove('error'), 800);
        correct = false;
      }
    }
  }
  if (correct && findEmpty(State.board) === null) checkWin();
  else if (correct) { toast('All filled cells are correct so far!', 'success'); playSound('correct'); }
  else { toast('Some cells are incorrect. Keep trying!', 'warn'); playSound('error'); }
}
 
function resetAction() {
  if (State.solving) return;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      if (!State.given[r][c]) {
        State.board[r][c] = 0;
        State.notes[r][c].clear();
      }
    }
  State.errorCount = 0;
  ErrorCount.textContent = 0;
  renderBoard();
  highlightSelection(null, null);
  State.selected = null;
  setStatus('Board reset. Keep solving!');
  toast('Board cleared!', 'info');
}
 
/* ═══════════════════════════════════════════════
   8. WIN CONDITION
═══════════════════════════════════════════════ */
 
function checkWin() {
  // Verify all cells match solution
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (State.board[r][c] !== State.solution[r][c]) return;
 
  stopTimer();
  State.totalSolved++;
  if (State.timerSecs < State.bestTime) State.bestTime = State.timerSecs;
  updateStats();
 
  WinTime.textContent   = formatTime(State.timerSecs);
  WinHints.textContent  = State.hintsUsed;
  WinErrors.textContent = State.errorCount;
 
  playSound('win');
  launchConfetti();
  WinModal.classList.add('active');
}
 
function launchConfetti() {
  const container = $('confetti');
  container.innerHTML = '';
  const colors = ['#6c63ff','#00d4aa','#f1c40f','#e74c3c','#ff6b9d','#2ecc71'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `
      left: ${Math.random()*100}%;
      top: -10px;
      background: ${colors[i%colors.length]};
      --dx: ${(Math.random()-0.5)*200}px;
      animation-delay: ${Math.random()*0.8}s;
      animation-duration: ${1.5+Math.random()}s;
      transform: rotate(${Math.random()*360}deg);
    `;
    container.appendChild(p);
  }
}
 
/* ═══════════════════════════════════════════════
   9. TIMER
═══════════════════════════════════════════════ */
 
function startTimer() {
  if (State.timerActive) return;
  State.timerActive = true;
  State.timerHandle = setInterval(() => {
    State.timerSecs++;
    TimerDisplay.textContent = formatTime(State.timerSecs);
  }, 1000);
}
 
function stopTimer() {
  State.timerActive = false;
  clearInterval(State.timerHandle);
}
 
function resetTimer() {
  stopTimer();
  State.timerSecs = 0;
  TimerDisplay.textContent = '00:00';
}
 
function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2,'0');
  const s = String(secs % 60).padStart(2,'0');
  return `${m}:${s}`;
}
 
/* ═══════════════════════════════════════════════
   10. SOUND ENGINE (Web Audio API)
═══════════════════════════════════════════════ */
 
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
 
function playSound(type) {
  if (!State.soundOn) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
 
    const sounds = {
      place:    { freq: 440, type: 'sine',   dur: 0.08, vol: 0.15 },
      error:    { freq: 150, type: 'square', dur: 0.15, vol: 0.2  },
      hint:     { freq: 660, type: 'sine',   dur: 0.2,  vol: 0.18 },
      correct:  { freq: 550, type: 'sine',   dur: 0.25, vol: 0.2  },
      generate: { freq: 320, type: 'sine',   dur: 0.15, vol: 0.15 },
      win:      { freq: 880, type: 'sine',   dur: 0.5,  vol: 0.25 },
    };
    const s = sounds[type] || sounds.place;
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.freq, ctx.currentTime);
    if (type === 'win') {
      osc.frequency.exponentialRampToValueAtTime(s.freq*2, ctx.currentTime+0.3);
    }
    gain.gain.setValueAtTime(s.vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + s.dur + 0.01);
  } catch(e) { /* silence audio errors */ }
}
 
/* ═══════════════════════════════════════════════
   11. TOAST NOTIFICATIONS
═══════════════════════════════════════════════ */
 
function toast(msg, type = 'info') {
  const tc = $('toastContainer');
  const t  = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
 
/* ═══════════════════════════════════════════════
   12. MODALS
═══════════════════════════════════════════════ */
 
function showError(title, body) {
  $('errorTitle').textContent = title;
  $('errorBody').textContent  = body;
  ErrorModal.classList.add('active');
}
 
/* ═══════════════════════════════════════════════
   13. STATUS & STATS
═══════════════════════════════════════════════ */
 
function setStatus(msg) { StatusMsg.textContent = msg; }
 
function updateStats() {
  StatSolved.textContent = State.totalSolved;
  StatBest.textContent   = State.bestTime === Infinity ? '—' : formatTime(State.bestTime);
  StatHints.textContent  = State.totalHints;
  StatErrors.textContent = State.totalErrors;
  ErrorCount.textContent = State.errorCount;
}
 
/* ═══════════════════════════════════════════════
   14. UTILITIES
═══════════════════════════════════════════════ */
 
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
 
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function cap(s)    { return s.charAt(0).toUpperCase() + s.slice(1); }
 
/* ═══════════════════════════════════════════════
   15. AMBIENT PARTICLES (decorative)
═══════════════════════════════════════════════ */
 
function initParticles() {
  const ambient = $('ambient');
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    const size = 2 + Math.random() * 3;
    p.style.cssText = `
      position: absolute;
      width: ${size}px; height: ${size}px;
      background: rgba(108,99,255,${0.1 + Math.random()*0.2});
      border-radius: 50%;
      left: ${Math.random()*100}%;
      top: ${Math.random()*100}%;
      animation: drift${Math.random()>0.5?1:2} ${10+Math.random()*15}s ease-in-out infinite alternate;
      animation-delay: -${Math.random()*10}s;
    `;
    ambient.appendChild(p);
  }
}
 
/* ═══════════════════════════════════════════════
   16. BOOT — WIRE UP ALL EVENTS
═══════════════════════════════════════════════ */
 
function init() {
  initBoard();
  initParticles();
 
  // Difficulty
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.difficulty = btn.dataset.diff;
      toast(`Difficulty set to ${cap(State.difficulty)}`, 'info');
    });
  });
 
  // Numpad
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => onNumInput(+btn.dataset.num));
  });
 
  // Action buttons
  $('generateBtn').addEventListener('click', generatePuzzleAction);
  $('solveBtn').addEventListener('click',    animatedSolveAction);
  $('hintBtn').addEventListener('click',     hintAction);
  $('checkBtn').addEventListener('click',    checkAction);
  $('resetBtn').addEventListener('click',    resetAction);
 
  // Timer controls
  $('timerStartBtn').addEventListener('click', () => {
    if (State.timerActive) { stopTimer(); $('timerStartBtn').textContent = '▶ Start'; }
    else { startTimer(); $('timerStartBtn').textContent = '⏸ Pause'; }
  });
  $('timerResetBtn').addEventListener('click', () => {
    resetTimer(); $('timerStartBtn').textContent = '▶ Start';
  });
 
  // Theme toggle
  $('themeToggle').addEventListener('click', () => {
    const html  = document.documentElement;
    const isDark = html.dataset.theme === 'dark';
    html.dataset.theme = isDark ? 'light' : 'dark';
    $('themeToggle').querySelector('.theme-icon').textContent = isDark ? '🌙' : '☀️';
  });
 
  // Sound toggle
  $('soundToggle').addEventListener('change', e => {
    State.soundOn = e.target.checked;
  });
 
  // Visualise toggle
  $('visualToggle').addEventListener('change', e => {
    State.visualOn = e.target.checked;
  });
 
  // Speed slider
  $('speedSlider').addEventListener('input', e => {
    State.solveSpeed = +e.target.value;
    SpeedLabel.textContent = `${State.solveSpeed}×`;
  });
 
  // Win modal → new game
  $('winNewGame').addEventListener('click', () => {
    WinModal.classList.remove('active');
    State.hintsUsed  = 0;
    State.errorCount = 0;
    generatePuzzleAction();
  });
 
  // Error modal close
  $('errorClose').addEventListener('click', () => ErrorModal.classList.remove('active'));
 
  // Dismiss modals on backdrop click
  [WinModal, ErrorModal].forEach(m => {
    m.addEventListener('click', e => {
      if (e.target === m) m.classList.remove('active');
    });
  });
 
  setStatus('Select a difficulty and press Generate!');
  toast('Welcome to SudokuX!', 'info');
}
 
// Start the app
document.addEventListener('DOMContentLoaded', init);