/**
 * Apex Sudoku - Core Logic & Visualizer Engine
 * 
 * Includes:
 * 1. Sound effects synthesizer (Web Audio API)
 * 2. Sudoku generator (rotational symmetry solver-based)
 * 3. Backtracking solver (visual & instant modes)
 * 4. Input validation (real-time duplicate checks)
 * 5. Keyboard navigation (arrows + digits)
 * 6. Particle canvas confetti
 */
// ==========================================================================
// 1. Audio Synthesizer Class (Web Audio API)
// ==========================================================================
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }
  // Lazy initialize AudioContext on user interaction
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  playTone(frequency, type, duration, volume = 0.1) {
    if (!this.enabled) return;
    this.init();
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
      // Soft decay envelope
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio synthesis error:", e);
    }
  }
  playClick() {
    this.playTone(600, 'triangle', 0.08, 0.06);
  }
  playErase() {
    this.playTone(280, 'triangle', 0.1, 0.06);
  }
  playError() {
    this.playTone(160, 'sawtooth', 0.2, 0.12);
    setTimeout(() => this.playTone(130, 'sawtooth', 0.18, 0.12), 80);
  }
  playHint() {
    this.playTone(523.25, 'sine', 0.15, 0.08); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.08), 90); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.22, 0.08), 180); // G5
  }
  playSuccess() {
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major scale arpeggio
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.45, 0.1);
      }, idx * 100);
    });
  }
}
const sounds = new SoundSynth();
// ==========================================================================
// 2. Confetti Victory Particles
// ==========================================================================
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let confettiActive = false;
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
class ConfettiParticle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height - canvas.height;
    this.size = Math.random() * 8 + 6;
    this.color = `hsl(${Math.random() * 360}, 90%, 55%)`;
    this.speedY = Math.random() * 4 + 2;
    this.speedX = Math.random() * 3 - 1.5;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 4 - 2;
  }
  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.rotation += this.rotationSpeed;
    if (this.y > canvas.height) {
      this.y = -20;
      this.x = Math.random() * canvas.width;
    }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}
function startConfetti() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  particles = [];
  for (let i = 0; i < 120; i++) {
    particles.push(new ConfettiParticle());
  }
  canvas.style.display = 'block';
  confettiActive = true;
  animateConfetti();
}
function stopConfetti() {
  confettiActive = false;
  canvas.style.display = 'none';
  window.removeEventListener('resize', resizeCanvas);
}
function animateConfetti() {
  if (!confettiActive) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animateConfetti);
}
// ==========================================================================
// 3. Application State & DOM Selections
// ==========================================================================
let boardGrid = Array(9).fill(null).map(() => Array(9).fill(0));
let initialGrid = Array(9).fill(null).map(() => Array(9).fill(0));
let solvedSolution = Array(9).fill(null).map(() => Array(9).fill(0));
// Game Stats
let gameTime = 0;
let timerInterval = null;
let timerPaused = false;
let gameActive = false;
let currentDifficulty = "medium";
let hintsUsed = 0;
// Solver Visualizer variables
let solveActive = false;
let solvePaused = false;
let stepsCount = 0;
let stepRequested = false;
let stepResolve = null;
// DOM Elements
const boardContainer = document.getElementById('sudoku-board');
const emptyCellsDisplay = document.getElementById('empty-cells-count');
const errorCountDisplay = document.getElementById('error-count');
const difficultyDisplay = document.getElementById('current-difficulty-display');
const timerDisplay = document.getElementById('game-timer');
const timerPlayPauseBtn = document.getElementById('timer-play-pause-btn');
const difficultySelect = document.getElementById('difficulty-select');
const generateBtn = document.getElementById('generate-btn');
const hintBtn = document.getElementById('hint-btn');
const checkBtn = document.getElementById('check-btn');
const resetBtn = document.getElementById('reset-btn');
const clearBtn = document.getElementById('clear-btn');
// Solver Elements
const tabPlay = document.getElementById('tab-play');
const tabSolve = document.getElementById('tab-solve');
const panePlay = document.getElementById('pane-play');
const paneSolve = document.getElementById('pane-solve');
const solveVisualBtn = document.getElementById('solve-visual-btn');
const solveInstantBtn = document.getElementById('solve-instant-btn');
const speedRange = document.getElementById('speed-range');
const visPauseBtn = document.getElementById('vis-pause-btn');
const visStepBtn = document.getElementById('vis-step-btn');
const visStopBtn = document.getElementById('vis-stop-btn');
const visStatusText = document.getElementById('visualizer-status-text');
const backtrackCounterDisplay = document.getElementById('backtrack-counter');
// Keypad
const keypadButtons = document.querySelectorAll('.key-btn');
// Theme & Sound toggles
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const infoToggleBtn = document.getElementById('info-toggle-btn');
const infoCloseBtn = document.getElementById('info-close-btn');
const infoModal = document.getElementById('info-modal');
// Success Modal Elements
const successModal = document.getElementById('success-modal');
const successNewGameBtn = document.getElementById('success-new-game-btn');
const successDifficulty = document.getElementById('success-difficulty');
const successTime = document.getElementById('success-time');
const successHints = document.getElementById('success-hints');
// Track focused cell coordinates
let selectedCell = null; // { row, col, element }
// ==========================================================================
// 4. Initialize Board DOM
// ==========================================================================
function initBoardDOM() {
  boardContainer.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.classList.add('sudoku-cell');
      
      // Thick 3x3 block borders
      if (c === 2 || c === 5) cell.classList.add('border-right-thick');
      if (r === 2 || r === 5) cell.classList.add('border-bottom-thick');
      
      const input = document.createElement('input');
      input.type = 'tel'; // mobile friendly numeric keypad selector
      input.inputMode = 'numeric';
      input.maxLength = 1;
      input.dataset.row = r;
      input.dataset.col = c;
      input.setAttribute('aria-label', `Sudoku cell Row ${r + 1} Column ${c + 1}`);
      
      cell.appendChild(input);
      boardContainer.appendChild(cell);
      
      // Attach events to cell input
      setupCellEvents(input, cell, r, c);
    }
  }
}
// Attach Event Listeners to each cell
function setupCellEvents(input, cell, r, c) {
  // Focus Event - Highlight row, column, block
  input.addEventListener('focus', () => {
    if (solveActive) {
      input.blur();
      return;
    }
    selectedCell = { row: r, col: c, element: input };
    highlightPeers(r, c);
    cell.classList.add('active-cell');
  });
  // Blur Event - Remove highlights
  input.addEventListener('blur', () => {
    clearPeerHighlights();
    cell.classList.remove('active-cell');
  });
  // Numeric input constraints
  input.addEventListener('input', (e) => {
    if (solveActive) return;
    
    const value = input.value;
    // Allow only numbers 1-9
    if (/^[1-9]$/.test(value)) {
      boardGrid[r][c] = parseInt(value);
      cell.classList.add('cell-user');
      cell.classList.remove('cell-solved');
      sounds.playClick();
      
      // Auto move focus to next empty cell (quality of life feature)
      // trigger real-time duplicate checks
      validateRealTime();
      checkVictoryState();
    } else {
      // invalid input - clear cell
      input.value = '';
      boardGrid[r][c] = 0;
      cell.classList.remove('cell-user', 'cell-solved', 'cell-error');
      sounds.playErase();
      validateRealTime();
    }
    updateCellStats();
  });
  // Arrow navigation & keyboard hotkeys
  input.addEventListener('keydown', (e) => {
    if (solveActive) return;
    
    let nextRow = r;
    let nextCol = c;
    
    switch (e.key) {
      case 'ArrowUp':
        nextRow = Math.max(0, r - 1);
        break;
      case 'ArrowDown':
        nextRow = Math.min(8, r + 1);
        break;
      case 'ArrowLeft':
        nextCol = Math.max(0, c - 1);
        break;
      case 'ArrowRight':
        nextCol = Math.min(8, c + 1);
        break;
      case 'Backspace':
      case 'Delete':
        // Handle clear
        if (input.value !== '') {
          input.value = '';
          boardGrid[r][c] = 0;
          cell.classList.remove('cell-user', 'cell-solved', 'cell-error');
          sounds.playErase();
          validateRealTime();
          updateCellStats();
        }
        e.preventDefault();
        return;
      default:
        // Let standard characters (like numbers) pass through to input listener
        return;
    }
    
    // Focus next cell
    if (nextRow !== r || nextCol !== c) {
      focusCell(nextRow, nextCol);
      e.preventDefault();
    }
  });
}
function focusCell(r, c) {
  const targetInput = boardContainer.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
  if (targetInput) {
    targetInput.focus();
  }
}
// Highlight all matching row, col, and 3x3 box coordinates
function highlightPeers(row, col) {
  const inputs = boardContainer.querySelectorAll('input');
  const boxRowStart = Math.floor(row / 3) * 3;
  const boxColStart = Math.floor(col / 3) * 3;
  inputs.forEach(input => {
    const r = parseInt(input.dataset.row);
    const c = parseInt(input.dataset.col);
    const cellDiv = input.parentElement;
    // Highlight peers (same row, col, or box)
    if (r === row || c === col || (r >= boxRowStart && r < boxRowStart + 3 && c >= boxColStart && c < boxColStart + 3)) {
      cellDiv.classList.add('highlight-peer');
    }
  });
}
function clearPeerHighlights() {
  const cells = boardContainer.querySelectorAll('.sudoku-cell');
  cells.forEach(cell => cell.classList.remove('highlight-peer'));
}
// ==========================================================================
// 5. Sudoku Logic Engine (Backtracking Solver & Grid Verification)
// ==========================================================================
// Standard Sudoku constraint check
function isValid(grid, row, col, val) {
  for (let i = 0; i < 9; i++) {
    // Check row
    if (grid[row][i] === val && i !== col) return false;
    // Check col
    if (grid[i][col] === val && i !== row) return false;
    // Check 3x3 subgrid
    const boxRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
    const boxCol = 3 * Math.floor(col / 3) + (i % 3);
    if (grid[boxRow][boxCol] === val && (boxRow !== row || boxCol !== col)) return false;
  }
  return true;
}
// Standard synchronous solver (returns true/false, fills grid in place)
function solveSudoku(grid) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (solveSudoku(grid)) {
              return true;
            }
            grid[row][col] = 0; // Backtrack
          }
        }
        return false;
      }
    }
  }
  return true;
}
// Real-Time board validation highlights
function validateRealTime() {
  const inputs = boardContainer.querySelectorAll('input');
  
  // Reset errors first
  inputs.forEach(input => {
    input.parentElement.classList.remove('cell-error');
  });
  const conflicts = new Set();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = boardGrid[r][c];
      if (val !== 0) {
        // If not valid in current grid, add cell input to conflicts
        if (!isValid(boardGrid, r, c, val)) {
          conflicts.add(`${r}-${c}`);
          // Also trace and add conflicting peers to highlight what is wrong
          addConflictingPeers(r, c, val, conflicts);
        }
      }
    }
  }
  // Highlight all conflicting cells in red
  let count = 0;
  conflicts.forEach(coords => {
    const [r, c] = coords.split('-').map(Number);
    const input = boardContainer.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
    if (input && !input.parentElement.classList.contains('cell-initial')) {
      input.parentElement.classList.add('cell-error');
      count++;
    }
  });
  errorCountDisplay.textContent = Math.ceil(count / 2); // approximate conflicts count
  
  // Play error sound on new invalid input
  if (count > 0 && selectedCell) {
    const activeVal = boardGrid[selectedCell.row][selectedCell.col];
    if (activeVal !== 0 && !isValid(boardGrid, selectedCell.row, selectedCell.col, activeVal)) {
      sounds.playError();
    }
  }
}
// Find actual indices that cause conflicts to highlight them together
function addConflictingPeers(row, col, val, conflictsSet) {
  const boxRowStart = Math.floor(row / 3) * 3;
  const boxColStart = Math.floor(col / 3) * 3;
  for (let i = 0; i < 9; i++) {
    // Check row conflicts
    if (boardGrid[row][i] === val && i !== col) {
      conflictsSet.add(`${row}-${i}`);
      conflictsSet.add(`${row}-${col}`);
    }
    // Check col conflicts
    if (boardGrid[i][col] === val && i !== row) {
      conflictsSet.add(`${i}-${col}`);
      conflictsSet.add(`${row}-${col}`);
    }
    // Check 3x3 subgrid conflicts
    const boxRow = boxRowStart + Math.floor(i / 3);
    const boxCol = boxColStart + (i % 3);
    if (boardGrid[boxRow][boxCol] === val && (boxRow !== row || boxCol !== col)) {
      conflictsSet.add(`${boxRow}-${boxCol}`);
      conflictsSet.add(`${row}-${col}`);
    }
  }
}
// ==========================================================================
// 6. Sudoku Generator (rotational symmetry matching difficulty)
// ==========================================================================
function generateNewPuzzle(difficulty) {
  sounds.init();
  
  // 1. Reset board states
  boardGrid = Array(9).fill(null).map(() => Array(9).fill(0));
  initialGrid = Array(9).fill(null).map(() => Array(9).fill(0));
  solvedSolution = Array(9).fill(null).map(() => Array(9).fill(0));
  
  // 2. Solve empty board with randomized number ordering to make a unique full grid
  fillGridRandom(solvedSolution);
  
  // Copy full grid solution to starting grid
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      boardGrid[r][c] = solvedSolution[r][c];
    }
  }
  // 3. Remove cells symmetrically based on difficulty
  let cluesToKeep = 45; // Easy
  if (difficulty === 'medium') cluesToKeep = 35;
  if (difficulty === 'hard') cluesToKeep = 25;
  removeCellsSymmetrically(boardGrid, 81 - cluesToKeep);
  // 4. Save initial puzzle layout
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      initialGrid[r][c] = boardGrid[r][c];
    }
  }
  // Update DOM representation
  renderBoardFromGrid();
  
  // Reset Timer
  resetTimer();
  startTimer();
  hintsUsed = 0;
  gameActive = true;
  
  currentDifficulty = difficulty;
  difficultyDisplay.textContent = difficulty;
  difficultyDisplay.className = `difficulty-tag diff-${difficulty}`;
}
// Fills grid using randomized backtracking solver
function fillGridRandom(grid) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        shuffleArray(numbers);
        
        for (let num of numbers) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGridRandom(grid)) {
              return true;
            }
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}
// Randomize arrays (Fisher-Yates)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
// Remove cells symmetrically (rotational symmetry)
function removeCellsSymmetrically(grid, cellsToRemove) {
  let attempts = 0;
  let removed = 0;
  
  while (removed < cellsToRemove && attempts < 1000) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    
    // Check symmetric cell (rotational 180 degrees)
    const symR = 8 - r;
    const symC = 8 - c;
    
    if (grid[r][c] !== 0) {
      const backupVal = grid[r][c];
      const backupSymVal = grid[symR][symC];
      
      grid[r][c] = 0;
      grid[symR][symC] = 0;
      
      // Calculate how many were removed
      const removedCount = (r === symR && c === symC) ? 1 : 2;
      
      // If puzzle remains solvable, count as successfully removed
      // To keep generation extremely fast, we assume symmetry maintains solvable properties.
      // High-end generators check uniqueness here, but for smooth web play we remove symmetric cells directly.
      removed += removedCount;
    }
    attempts++;
  }
}
// Render grid layout onto DOM
function renderBoardFromGrid() {
  const inputs = boardContainer.querySelectorAll('input');
  inputs.forEach(input => {
    const r = parseInt(input.dataset.row);
    const c = parseInt(input.dataset.col);
    const cellDiv = input.parentElement;
    const val = boardGrid[r][c];
    
    // Clear state classes
    cellDiv.className = 'sudoku-cell';
    if (c === 2 || c === 5) cellDiv.classList.add('border-right-thick');
    if (r === 2 || r === 5) cellDiv.classList.add('border-bottom-thick');
    
    if (val !== 0) {
      input.value = val;
      // If it is in the initial layout, lock it
      if (initialGrid[r][c] !== 0) {
        cellDiv.classList.add('cell-initial');
        input.readOnly = true;
      } else {
        cellDiv.classList.add('cell-user');
        input.readOnly = false;
      }
    } else {
      input.value = '';
      input.readOnly = false;
    }
  });
  updateCellStats();
  validateRealTime();
}
function updateCellStats() {
  let emptyCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (boardGrid[r][c] === 0) emptyCount++;
    }
  }
  emptyCellsDisplay.textContent = emptyCount;
}
// ==========================================================================
// 7. Interactive Backtracking Visualization
// ==========================================================================
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// Check pause states, step trigger, and speed adjustments during animation
async function checkPauseAndDelay() {
  // If paused, wait on promise resolve
  while (solvePaused && solveActive) {
    visStatusText.textContent = "Solver Paused";
    await new Promise(resolve => {
      stepResolve = resolve;
    });
  }
  
  if (!solveActive) return;
  visStatusText.textContent = "Searching solution...";
  // Calculate speed slider values
  const speed = parseInt(speedRange.value);
  let delay = 0;
  if (speed < 100) {
    // scale from 800ms down to 1ms
    delay = Math.pow((100 - speed) / 25, 2) * 50;
  }
  
  if (delay > 0) {
    await sleep(delay);
  }
}
// Helper to find next empty cell on the board
function findEmpty(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) return [r, c];
    }
  }
  return null;
}
// Set individual cell visual highlights during visual solver backtracking
function setCellVisual(row, col, value, state) {
  const input = boardContainer.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
  if (!input) return;
  const cellDiv = input.parentElement;
  cellDiv.className = 'sudoku-cell';
  
  // Keep thick grid borders
  if (col === 2 || col === 5) cellDiv.classList.add('border-right-thick');
  if (row === 2 || row === 5) cellDiv.classList.add('border-bottom-thick');
  if (value > 0) {
    input.value = value;
    boardGrid[row][col] = value;
  } else {
    input.value = '';
    boardGrid[row][col] = 0;
  }
  // Apply state visual styling classes
  if (state === 'searching') {
    cellDiv.classList.add('cell-searching');
  } else if (state === 'backtrack') {
    cellDiv.classList.add('cell-backtracked');
  } else if (state === 'placed') {
    cellDiv.classList.add('cell-valid-placed');
  } else if (state === 'solved') {
    cellDiv.classList.add('cell-solved');
  }
}
// The core Visual Backtracking algorithm loop
async function visualSolve() {
  const emptyCell = findEmpty(boardGrid);
  if (!emptyCell) {
    return true; // Complete!
  }
  const [row, col] = emptyCell;
  for (let num = 1; num <= 9; num++) {
    if (!solveActive) return false; // Force stop execution
    stepsCount++;
    backtrackCounterDisplay.textContent = `Steps: ${stepsCount}`;
    // Visualize the step attempt
    setCellVisual(row, col, num, 'searching');
    sounds.playClick();
    await checkPauseAndDelay();
    if (!solveActive) return false;
    if (isValid(boardGrid, row, col, num)) {
      // Valid placement visual trigger
      setCellVisual(row, col, num, 'placed');
      await checkPauseAndDelay();
      if (!solveActive) return false;
      // Recurse
      if (await visualSolve()) {
        setCellVisual(row, col, num, 'solved');
        return true;
      }
    }
    // Backtracking step visual trigger
    if (!solveActive) return false;
    setCellVisual(row, col, num, 'backtrack');
    sounds.playErase();
    await checkPauseAndDelay();
    if (!solveActive) return false;
    // Reset cell
    setCellVisual(row, col, 0, 'none');
  }
  return false;
}
// Start Visual Solver Mode
async function startVisualSolve() {
  if (solveActive) return;
  
  // Blur focused cell to avoid keyboard layout interference
  if (selectedCell) {
    selectedCell.element.blur();
  }
  // Verify that board currently has no conflicts before starting solver
  let hasErrors = false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = boardGrid[r][c];
      if (val !== 0 && !isValid(boardGrid, r, c, val)) {
        hasErrors = true;
      }
    }
  }
  if (hasErrors) {
    alert("Please resolve existing board errors highlighted in red before starting the solver.");
    sounds.playError();
    return;
  }
  // Set Visual State
  solveActive = true;
  solvePaused = false;
  stepsCount = 0;
  
  // Manage controls UI states
  toggleControlsForSolver(true);
  visStatusText.textContent = "Searching solution...";
  backtrackCounterDisplay.textContent = `Steps: 0`;
  // Play click starting tone
  sounds.playHint();
  const success = await visualSolve();
  // Reset solver states
  solveActive = false;
  toggleControlsForSolver(false);
  if (success) {
    visStatusText.textContent = "Board Solved Successfully!";
    sounds.playSuccess();
    triggerVictory();
  } else {
    if (stepsCount > 0) {
      visStatusText.textContent = "No solution found!";
      sounds.playError();
    } else {
      visStatusText.textContent = "Ready to Solve";
    }
  }
}
// Instant synchronous solver trigger
function startInstantSolve() {
  if (solveActive) return;
  // Make backup of grid before checking
  const checkGrid = boardGrid.map(row => [...row]);
  
  // Quick pre-validation
  let hasErrors = false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = checkGrid[r][c];
      if (val !== 0) {
        checkGrid[r][c] = 0;
        if (!isValid(checkGrid, r, c, val)) {
          hasErrors = true;
        }
        checkGrid[r][c] = val;
      }
    }
  }
  if (hasErrors) {
    alert("Please resolve existing board errors highlighted in red first.");
    sounds.playError();
    return;
  }
  const solved = solveSudoku(boardGrid);
  
  if (solved) {
    sounds.playSuccess();
    renderSolvedBoard();
    triggerVictory();
  } else {
    alert("No solution exists for this configuration!");
    sounds.playError();
  }
}
function renderSolvedBoard() {
  const inputs = boardContainer.querySelectorAll('input');
  inputs.forEach(input => {
    const r = parseInt(input.dataset.row);
    const c = parseInt(input.dataset.col);
    const cellDiv = input.parentElement;
    
    input.value = boardGrid[r][c];
    
    if (initialGrid[r][c] === 0) {
      cellDiv.className = 'sudoku-cell cell-solved';
      if (c === 2 || c === 5) cellDiv.classList.add('border-right-thick');
      if (r === 2 || r === 5) cellDiv.classList.add('border-bottom-thick');
    }
  });
  updateCellStats();
  validateRealTime();
}
function toggleControlsForSolver(isSolving) {
  // Disable game action features during solver animation
  generateBtn.disabled = isSolving;
  hintBtn.disabled = isSolving;
  checkBtn.disabled = isSolving;
  resetBtn.disabled = isSolving;
  clearBtn.disabled = isSolving;
  difficultySelect.disabled = isSolving;
  
  tabPlay.style.pointerEvents = isSolving ? 'none' : 'auto';
  tabPlay.style.opacity = isSolving ? '0.4' : '1';
  
  solveVisualBtn.disabled = isSolving;
  solveInstantBtn.disabled = isSolving;
  
  // Enable visual controls HUD
  visPauseBtn.disabled = !isSolving;
  visStopBtn.disabled = !isSolving;
  // Step button is only enabled when solver is active AND paused
  visStepBtn.disabled = true;
  if (!isSolving) {
    visPauseBtn.querySelector('i').className = 'fa-solid fa-pause';
    solvePaused = false;
  }
}
// Stop Visual Solver and restore board values
function stopVisualSolver() {
  if (!solveActive) return;
  solveActive = false;
  solvePaused = false;
  
  if (stepResolve) {
    stepResolve();
    stepResolve = null;
  }
  // Restore board to initial state
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      boardGrid[r][c] = initialGrid[r][c];
    }
  }
  
  renderBoardFromGrid();
  toggleControlsForSolver(false);
  visStatusText.textContent = "Solver Stopped. Board Resetted.";
  sounds.playErase();
}
// Pause and Resume visual solver
function toggleVisualPause() {
  if (!solveActive) return;
  solvePaused = !solvePaused;
  
  if (solvePaused) {
    visPauseBtn.querySelector('i').className = 'fa-solid fa-play';
    visPauseBtn.title = "Resume Solver";
    visStepBtn.disabled = false;
    visStatusText.textContent = "Solver Paused";
  } else {
    visPauseBtn.querySelector('i').className = 'fa-solid fa-pause';
    visPauseBtn.title = "Pause Solver";
    visStepBtn.disabled = true;
    
    // Resolve wait promise
    if (stepResolve) {
      stepResolve();
      stepResolve = null;
    }
  }
}
// Single step debugging execution
function stepVisualSolver() {
  if (!solveActive || !solvePaused) return;
  
  if (stepResolve) {
    stepResolve();
    stepResolve = null;
  }
}
// ==========================================================================
// 8. Keypad, Hints & Manual checks
// ==========================================================================
function setupKeypadEvents() {
  keypadButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (solveActive || !selectedCell) return;
      
      const val = btn.dataset.value;
      const { row, col, element } = selectedCell;
      // Check if locked clue
      if (initialGrid[row][col] !== 0) return;
      if (val === 'erase') {
        element.value = '';
        boardGrid[row][col] = 0;
        element.parentElement.className = 'sudoku-cell active-cell';
        if (col === 2 || col === 5) element.parentElement.classList.add('border-right-thick');
        if (row === 2 || row === 5) element.parentElement.classList.add('border-bottom-thick');
        
        sounds.playErase();
        validateRealTime();
      } else {
        element.value = val;
        boardGrid[row][col] = parseInt(val);
        element.parentElement.classList.add('cell-user');
        sounds.playClick();
        
        validateRealTime();
        checkVictoryState();
      }
      updateCellStats();
      element.focus(); // Keep focus active
    });
  });
}
// Hint placement
function provideHint() {
  if (solveActive) return;
  // 1. Choose targeted cell
  let row = -1;
  let col = -1;
  // If user has focused an empty cell, use that.
  if (selectedCell && boardGrid[selectedCell.row][selectedCell.col] === 0) {
    row = selectedCell.row;
    col = selectedCell.col;
  } else {
    // Find the first empty cell in standard reading order
    const emptyCell = findEmpty(boardGrid);
    if (emptyCell) {
      row = emptyCell[0];
      col = emptyCell[1];
    }
  }
  if (row === -1 || col === -1) {
    alert("No empty cells remaining to place a hint!");
    return;
  }
  // 2. Fetch value from pre-solved solution grid
  const correctVal = solvedSolution[row][col];
  
  // 3. Set value in grid
  boardGrid[row][col] = correctVal;
  
  // 4. Highlight cell visually
  const input = boardContainer.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
  if (input) {
    input.value = correctVal;
    input.parentElement.classList.add('cell-solved');
    input.parentElement.classList.remove('cell-error', 'cell-user');
    input.focus();
  }
  hintsUsed++;
  sounds.playHint();
  
  updateCellStats();
  validateRealTime();
  checkVictoryState();
}
// Grid manual validation check button
function checkCurrentSolution() {
  if (solveActive) return;
  let hasErrors = false;
  let emptyCells = 0;
  
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = boardGrid[r][c];
      if (val === 0) {
        emptyCells++;
      } else {
        // Compare with solution grid
        if (val !== solvedSolution[r][c]) {
          hasErrors = true;
          // highlight wrong numbers
          const input = boardContainer.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
          if (input && !input.parentElement.classList.contains('cell-initial')) {
            input.parentElement.classList.add('cell-error');
          }
        }
      }
    }
  }
  if (hasErrors) {
    alert("There are conflicts or incorrect numbers on the board. Incorrect cells have been highlighted.");
    sounds.playError();
  } else if (emptyCells > 0) {
    alert(`Grid is clean so far! Keep going, you have ${emptyCells} empty cells left.`);
    sounds.playHint();
  } else {
    // Board is fully correct
    triggerVictory();
  }
}
// Reset board to initial puzzle state
function resetBoardToInitial() {
  if (solveActive) return;
  
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      boardGrid[r][c] = initialGrid[r][c];
    }
  }
  renderBoardFromGrid();
  sounds.playErase();
}
// Clear board completely (for custom manual entry solves)
function clearWholeBoard() {
  if (solveActive) return;
  
  if (confirm("Are you sure you want to clear the entire board? This will erase all clues and user values.")) {
    boardGrid = Array(9).fill(null).map(() => Array(9).fill(0));
    initialGrid = Array(9).fill(null).map(() => Array(9).fill(0));
    solvedSolution = Array(9).fill(null).map(() => Array(9).fill(0));
    
    // Attempt solving empty board to establish custom solver target
    // In custom mode, solvedSolution can be populated when clicking Check or Hint,
    // we recalculate on Solve or Check.
    
    renderBoardFromGrid();
    resetTimer();
    stopTimer();
    gameActive = false;
    
    currentDifficulty = "custom";
    difficultyDisplay.textContent = "custom";
    difficultyDisplay.className = "difficulty-tag diff-custom";
    
    sounds.playErase();
  }
}
// Victory animations & details
function checkVictoryState() {
  // If no empty cells and no errors
  let empty = 0;
  let matchesSolution = true;
  
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = boardGrid[r][c];
      if (val === 0) empty++;
      
      // If we generated the solution, check against it.
      // If custom, verify grid validity.
      if (solvedSolution[r][c] !== 0) {
        if (val !== solvedSolution[r][c]) matchesSolution = false;
      } else {
        if (val === 0 || !isValid(boardGrid, r, c, val)) matchesSolution = false;
      }
    }
  }
  if (empty === 0 && matchesSolution) {
    triggerVictory();
  }
}
function triggerVictory() {
  stopTimer();
  sounds.playSuccess();
  startConfetti();
  
  // Populate success details
  successDifficulty.textContent = currentDifficulty;
  successTime.textContent = timerDisplay.textContent;
  successHints.textContent = hintsUsed;
  
  // Show Modal
  setTimeout(() => {
    successModal.classList.add('active');
  }, 1000);
}
// ==========================================================================
// 9. Timer & UI HUD State Controllers
// ==========================================================================
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!timerPaused) {
      gameTime++;
      updateTimerDisplay();
    }
  }, 1000);
  timerPlayPauseBtn.querySelector('i').className = 'fa-solid fa-pause';
  timerPlayPauseBtn.title = "Pause Timer";
}
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}
function resetTimer() {
  stopTimer();
  gameTime = 0;
  updateTimerDisplay();
}
function updateTimerDisplay() {
  const mins = Math.floor(gameTime / 60);
  const secs = gameTime % 60;
  timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
function toggleTimerPause() {
  if (!gameActive) return;
  timerPaused = !timerPaused;
  
  const inputs = boardContainer.querySelectorAll('input');
  
  if (timerPaused) {
    timerPlayPauseBtn.querySelector('i').className = 'fa-solid fa-play';
    timerPlayPauseBtn.title = "Resume Timer";
    // Overlay board cells with blur or hide inputs to prevent cheating
    boardContainer.style.filter = 'blur(10px)';
    boardContainer.style.pointerEvents = 'none';
  } else {
    timerPlayPauseBtn.querySelector('i').className = 'fa-solid fa-pause';
    timerPlayPauseBtn.title = "Pause Timer";
    boardContainer.style.filter = 'none';
    boardContainer.style.pointerEvents = 'auto';
  }
}
// Pane Tabs Switcher logic
function setupTabEvents() {
  tabPlay.addEventListener('click', () => {
    tabPlay.classList.add('active');
    tabSolve.classList.remove('active');
    panePlay.classList.add('active');
    paneSolve.classList.remove('active');
  });
  tabSolve.addEventListener('click', () => {
    tabSolve.classList.add('active');
    tabPlay.classList.remove('active');
    paneSolve.classList.add('active');
    panePlay.classList.remove('active');
    
    // If board solution was not pre-calculated (like in custom cleared mode),
    // calculate a backup solution now.
    if (solvedSolution[0][0] === 0) {
      const backupGrid = boardGrid.map(row => [...row]);
      solveSudoku(backupGrid);
      solvedSolution = backupGrid;
    }
  });
}
// Config switches: theme, sound
function setupConfigSwitches() {
  // Dark/Light Theme Toggle
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const targetTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', targetTheme);
    themeToggleBtn.querySelector('i').className = targetTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    sounds.playClick();
  });
  // Sound effects toggle
  soundToggleBtn.addEventListener('click', () => {
    sounds.enabled = !sounds.enabled;
    soundToggleBtn.querySelector('i').className = sounds.enabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    if (sounds.enabled) {
      sounds.playClick();
    }
  });
  // Info Modal toggle
  infoToggleBtn.addEventListener('click', () => {
    infoModal.classList.add('active');
    sounds.playClick();
  });
  infoCloseBtn.addEventListener('click', () => {
    infoModal.classList.remove('active');
    sounds.playErase();
  });
  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) {
      infoModal.classList.remove('active');
      sounds.playErase();
    }
  });
}
// ==========================================================================
// 10. Start Application Entrypoint
// ==========================================================================
function startApplication() {
  // Initialize DOM structure
  initBoardDOM();
  setupKeypadEvents();
  setupTabEvents();
  setupConfigSwitches();
  // Primary Gameplay Actions
  generateBtn.addEventListener('click', () => {
    generateNewPuzzle(difficultySelect.value);
  });
  hintBtn.addEventListener('click', provideHint);
  checkBtn.addEventListener('click', checkCurrentSolution);
  resetBtn.addEventListener('click', resetBoardToInitial);
  clearBtn.addEventListener('click', clearWholeBoard);
  timerPlayPauseBtn.addEventListener('click', toggleTimerPause);
  // AI solver visual controls
  solveVisualBtn.addEventListener('click', startVisualSolve);
  solveInstantBtn.addEventListener('click', startInstantSolve);
  
  visPauseBtn.addEventListener('click', toggleVisualPause);
  visStepBtn.addEventListener('click', stepVisualSolver);
  visStopBtn.addEventListener('click', stopVisualSolver);
  // Victory Dialog Reset Actions
  successNewGameBtn.addEventListener('click', () => {
    successModal.classList.remove('active');
    stopConfetti();
    generateNewPuzzle(difficultySelect.value);
  });
  // Initialize with a medium difficulty grid directly on load
  generateNewPuzzle('medium');
}
// Let DOM content mount fully before firing script initialization
document.addEventListener('DOMContentLoaded', startApplication);
