/**
 * ==========================================================================
 * Sudoku Solver - Core Game Engine & Visualizer (Recursive Backtracking)
 * ==========================================================================
 */

class SoundSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, volume = 0.1, delay = 0) {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

            gain.gain.setValueAtTime(volume, this.ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + delay + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(this.ctx.currentTime + delay);
            osc.stop(this.ctx.currentTime + delay + duration);
        } catch (e) {
            console.warn("Audio Context error:", e);
        }
    }

    playClick() {
        this.playTone(700, 'sine', 0.05, 0.04);
    }

    playInsert() {
        this.playTone(523.25, 'sine', 0.12, 0.06); // C5
        this.playTone(659.25, 'sine', 0.12, 0.04, 0.04); // E5
    }

    playErase() {
        try {
            if (!this.enabled) return;
            this.init();
            if (!this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.frequency.setValueAtTime(250, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);

            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch (e) {}
    }

    playError() {
        this.playTone(130, 'triangle', 0.2, 0.1);
        this.playTone(125, 'sawtooth', 0.2, 0.03);
    }

    playStep() {
        this.playTone(950, 'sine', 0.015, 0.015);
    }

    playBacktrack() {
        this.playTone(550, 'sine', 0.015, 0.015);
    }

    playWin() {
        const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
        scale.forEach((freq, idx) => {
            this.playTone(freq, 'sine', 0.3, 0.05, idx * 0.07);
        });
    }

    playComplete() {
        this.playTone(587.33, 'sine', 0.25, 0.06);
        this.playTone(880.00, 'sine', 0.3, 0.05, 0.08);
    }
}

const synth = new SoundSynth();

let boardPuzzle = Array.from({ length: 9 }, () => Array(9).fill(0));
let boardCurrent = Array.from({ length: 9 }, () => Array(9).fill(0));
let boardSolution = Array.from({ length: 9 }, () => Array(9).fill(0));

let selectedCell = null;
let isSolving = false;
let cancelSolveRequest = false;

let timerInterval = null;
let timerSeconds = 0;
let timerPaused = false;

// DOM Cache
const boardEl = document.getElementById('sudoku-board-element');
const statusMsgEl = document.getElementById('status-message');
const statusBadgeEl = document.getElementById('status-badge');
const difficultySelect = document.getElementById('difficulty-select');
const btnGenerate = document.getElementById('btn-generate');
const btnSolveVisual = document.getElementById('btn-solve-visual');
const btnSolveInstant = document.getElementById('btn-solve-instant');
const btnHint = document.getElementById('btn-hint');
const btnReset = document.getElementById('btn-reset');
const btnClear = document.getElementById('btn-clear');
const btnCheck = document.getElementById('btn-check');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeIconSun = document.getElementById('theme-icon-sun');
const themeIconMoon = document.getElementById('theme-icon-moon');
const btnSoundToggle = document.getElementById('btn-sound-toggle');
const soundIconOn = document.getElementById('sound-icon-on');
const soundIconOff = document.getElementById('sound-icon-off');
const speedSlider = document.getElementById('speed-slider');
const speedValueLabel = document.getElementById('speed-value');
const toggleAutocheck = document.getElementById('toggle-autocheck');
const timerTextEl = document.getElementById('timer-text');
const numpadButtons = document.querySelectorAll('.numpad-btn:not(.erase-btn)');
const numpadErase = document.getElementById('numpad-erase');

function createBoardDOM() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.classList.add('sudoku-cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.tabIndex = 0;

            cell.addEventListener('click', () => {
                if (isSolving) return;
                synth.playClick();
                selectCell(r, c);
            });

            cell.addEventListener('focus', () => {
                if (isSolving) return;
                selectCell(r, c);
            });

            boardEl.appendChild(cell);
        }
    }
}

function selectCell(r, c) {
    selectedCell = { r, c };
    const cells = document.querySelectorAll('.sudoku-cell');
    cells.forEach(cell => cell.classList.remove('selected', 'highlighted', 'same-number'));

    const activeCell = getCellDOM(r, c);
    activeCell.classList.add('selected');

    const startRow = r - (r % 3);
    const startCol = c - (c % 3);
    const cellValue = boardCurrent[r][c];

    cells.forEach(cell => {
        const cr = parseInt(cell.dataset.row);
        const cc = parseInt(cell.dataset.col);
        
        if (cr === r || cc === c) {
            cell.classList.add('highlighted');
        }
        if (cr >= startRow && cr < startRow + 3 && cc >= startCol && cc < startCol + 3) {
            cell.classList.add('highlighted');
        }
        if (cellValue !== 0 && boardCurrent[cr][cc] === cellValue) {
            cell.classList.add('same-number');
        }
    });
}

function getCellDOM(r, c) {
    return boardEl.children[r * 9 + c];
}

function renderBoardDOM() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = getCellDOM(r, c);
            const val = boardCurrent[r][c];
            cell.textContent = val !== 0 ? val : '';
            cell.className = 'sudoku-cell';
            
            if (boardPuzzle[r][c] !== 0) {
                cell.classList.add('original');
            }
        }
    }
    if (selectedCell) selectCell(selectedCell.r, selectedCell.c);
    if (toggleAutocheck.checked) validateAllBoardCells();
}

function inputSelectedCellValue(val) {
    if (!selectedCell || isSolving) return;
    const { r, c } = selectedCell;

    if (boardPuzzle[r][c] !== 0) {
        synth.playError();
        return;
    }

    if (val === 0) {
        boardCurrent[r][c] = 0;
        synth.playErase();
    } else {
        boardCurrent[r][c] = val;
        synth.playInsert();
    }

    renderBoardDOM();
    if (checkGameCompleteCondition()) triggerWinSequence();
}

// Backtracking Core Algorithms
function isValid(grid, r, c, num) {
    for (let colIndex = 0; colIndex < 9; colIndex++) {
        if (grid[r][colIndex] === num) return false;
    }
    for (let rowIndex = 0; rowIndex < 9; rowIndex++) {
        if (grid[rowIndex][c] === num) return false;
    }
    const startRow = r - (r % 3);
    const startCol = c - (c % 3);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[startRow + i][startCol + j] === num) return false;
        }
    }
    return true;
}

function findEmptyCell(grid) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r][c] === 0) return [r, c];
        }
    }
    return [-1, -1];
}

function solveSudoku(grid) {
    const [r, c] = findEmptyCell(grid);
    if (r === -1) return true;

    for (let num = 1; num <= 9; num++) {
        if (isValid(grid, r, c, num)) {
            grid[r][c] = num;
            if (solveSudoku(grid)) return true;
            grid[r][c] = 0; // backtrack
        }
    }
    return false;
}

function fillBoardRandom(grid) {
    const [r, c] = findEmptyCell(grid);
    if (r === -1) return true;

    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    for (const num of numbers) {
        if (isValid(grid, r, c, num)) {
            grid[r][c] = num;
            if (fillBoardRandom(grid)) return true;
            grid[r][c] = 0;
        }
    }
    return false;
}

function initPuzzleGeneration(difficulty) {
    resetTimer();
    updateStatus("Generating new Sudoku board clues...", "info");

    const emptyGrid = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillBoardRandom(emptyGrid);
    boardSolution = emptyGrid.map(row => [...row]);
    
    const puzzleGrid = emptyGrid.map(row => [...row]);
    let cluesToRemove = 46;
    if (difficulty === 'easy') cluesToRemove = 36;
    else if (difficulty === 'hard') cluesToRemove = 56;

    const cellIndices = Array.from({ length: 81 }, (_, i) => i);
    for (let i = cellIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cellIndices[i], cellIndices[j]] = [cellIndices[j], cellIndices[i]];
    }

    for (let k = 0; k < cluesToRemove; k++) {
        const idx = cellIndices[k];
        puzzleGrid[Math.floor(idx / 9)][idx % 9] = 0;
    }

    boardPuzzle = puzzleGrid.map(row => [...row]);
    boardCurrent = puzzleGrid.map(row => [...row]);

    renderBoardDOM();
    updateStatus(`Generated ${difficulty} puzzle!`, "info");
    startTimer();
}

// Conflict Highlighting Engine
function validateAllBoardCells() {
    const cells = document.querySelectorAll('.sudoku-cell');
    cells.forEach(c => c.classList.remove('error'));
    let hasConflict = false;

    for (let r = 0; r < 9; r++) {
        const seen = {};
        for (let c = 0; c < 9; c++) {
            const val = boardCurrent[r][c];
            if (val !== 0) {
                if (seen[val] !== undefined) {
                    getCellDOM(r, seen[val]).classList.add('error');
                    getCellDOM(r, c).classList.add('error');
                    hasConflict = true;
                } else seen[val] = c;
            }
        }
    }
    for (let c = 0; c < 9; c++) {
        const seen = {};
        for (let r = 0; r < 9; r++) {
            const val = boardCurrent[r][c];
            if (val !== 0) {
                if (seen[val] !== undefined) {
                    getCellDOM(seen[val], c).classList.add('error');
                    getCellDOM(r, c).classList.add('error');
                    hasConflict = true;
                } else seen[val] = r;
            }
        }
    }
    for (let boxRow = 0; boxRow < 9; boxRow += 3) {
        for (let boxCol = 0; boxCol < 9; boxCol += 3) {
            const seen = {};
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const r = boxRow + i;
                    const c = boxCol + j;
                    const val = boardCurrent[r][c];
                    if (val !== 0) {
                        if (seen[val] !== undefined) {
                            getCellDOM(seen[val].r, seen[val].c).classList.add('error');
                            getCellDOM(r, c).classList.add('error');
                            hasConflict = true;
                        } else seen[val] = { r, c };
                    }
                }
            }
        }
    }

    if (hasConflict) updateStatus("Validation Error: Duplicate numbers found!", "error");
    return !hasConflict;
}

function checkGameCompleteCondition() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (boardCurrent[r][c] === 0 || boardCurrent[r][c] !== boardSolution[r][c]) return false;
        }
    }
    return true;
}

function triggerWinSequence() {
    pauseTimer();
    synth.playWin();
    updateStatus("Congratulations! You solved the Sudoku! 🎉", "success");

    const cells = document.querySelectorAll('.sudoku-cell');
    cells.forEach((cell, idx) => {
        setTimeout(() => cell.classList.add('cell-win'), idx * 10);
    });
}

// Asynchronous visualizer backtracking
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getVisualDelaySpeed() {
    const sliderVal = parseInt(speedSlider.value);
    return Math.max(1, 550 - (sliderVal * 5.4));
}

function isInitialGridValid() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const val = boardCurrent[r][c];
            if (val !== 0) {
                boardCurrent[r][c] = 0;
                const check = isValid(boardCurrent, r, c, val);
                boardCurrent[r][c] = val;
                if (!check) return false;
            }
        }
    }
    return true;
}

async function solveVisualHelper() {
    if (cancelSolveRequest) return false;

    const [r, c] = findEmptyCell(boardCurrent);
    if (r === -1) return true;

    for (let num = 1; num <= 9; num++) {
        if (cancelSolveRequest) return false;

        if (isValid(boardCurrent, r, c, num)) {
            boardCurrent[r][c] = num;
            const cell = getCellDOM(r, c);
            cell.textContent = num;
            cell.className = 'sudoku-cell visual-try';
            synth.playStep();

            await delay(getVisualDelaySpeed());

            if (await solveVisualHelper()) {
                cell.className = 'sudoku-cell visual-success';
                return true;
            }

            if (cancelSolveRequest) return false;
            
            boardCurrent[r][c] = 0;
            cell.textContent = '';
            cell.className = 'sudoku-cell visual-backtrack';
            synth.playBacktrack();
            
            await delay(getVisualDelaySpeed() * 0.4);
            cell.className = 'sudoku-cell';
        }
    }
    return false;
}

async function startVisualSolving() {
    if (isSolving) {
        cancelSolveRequest = true;
        return;
    }

    if (!isInitialGridValid()) {
        synth.playError();
        updateStatus("Cannot solve! Board has pre-existing conflicts.", "error");
        return;
    }

    const backupGrid = boardCurrent.map(row => [...row]);
    if (!solveSudoku(backupGrid)) {
        synth.playError();
        updateStatus("Unsolvable Puzzle! Backtracking recursion failed.", "error");
        return;
    }

    isSolving = true;
    cancelSolveRequest = false;
    pauseTimer();
    updateStatus("Solving Puzzle... Backtracking in progress.", "info");
    
    btnSolveVisual.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect></svg> Stop Solver`;
    btnSolveVisual.classList.replace('btn-success', 'btn-danger');
    toggleUIControls(true);

    const success = await solveVisualHelper();

    btnSolveVisual.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Visualized Solve`;
    btnSolveVisual.classList.replace('btn-danger', 'btn-success');
    toggleUIControls(false);
    isSolving = false;

    if (success) {
        synth.playComplete();
        renderBoardDOM();
        updateStatus("Puzzle Solved Successfully! 🎉", "success");
    } else {
        if (cancelSolveRequest) {
            boardCurrent = boardPuzzle.map(row => [...row]);
            renderBoardDOM();
            updateStatus("Solving Cancelled.", "info");
        }
    }
}

function startInstantSolving() {
    if (isSolving) return;

    if (!isInitialGridValid()) {
        synth.playError();
        updateStatus("Cannot solve! Board has conflicts.", "error");
        return;
    }

    const workingGrid = boardCurrent.map(row => [...row]);
    const startTime = performance.now();
    const success = solveSudoku(workingGrid);
    const endTime = performance.now();
    const timeSpent = ((endTime - startTime) / 1000).toFixed(4);

    if (success) {
        boardCurrent = workingGrid;
        renderBoardDOM();
        synth.playComplete();
        pauseTimer();
        updateStatus(`Solved instantly in ${timeSpent} seconds!`, "success");
    } else {
        synth.playError();
        updateStatus("This puzzle configuration is unsolvable!", "error");
    }
}

// User Actions & Handlers
function toggleUIControls(disabled) {
    btnGenerate.disabled = disabled;
    btnSolveInstant.disabled = disabled;
    btnHint.disabled = disabled;
    btnReset.disabled = disabled;
    btnClear.disabled = disabled;
    btnCheck.disabled = disabled;
    difficultySelect.disabled = disabled;
}

function updateStatus(message, type = "info") {
    statusMsgEl.textContent = message;
    statusBadgeEl.textContent = type;
    statusBadgeEl.className = `status-badge ${type}`;
}

function getHint() {
    if (isSolving) return;

    const diffCells = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (boardPuzzle[r][c] === 0 && boardCurrent[r][c] !== boardSolution[r][c]) {
                diffCells.push({ r, c });
            }
        }
    }

    if (diffCells.length === 0) {
        synth.playComplete();
        updateStatus("Board is already correctly filled!", "success");
        return;
    }

    const randomCell = diffCells[Math.floor(Math.random() * diffCells.length)];
    const { r, c } = randomCell;
    boardCurrent[r][c] = boardSolution[r][c];
    renderBoardDOM();
    selectCell(r, c);
    
    const cellDOM = getCellDOM(r, c);
    cellDOM.classList.add('visual-success');
    synth.playInsert();
    setTimeout(() => cellDOM.classList.remove('visual-success'), 500);

    updateStatus(`Hint added in Row ${r+1}, Column ${c+1}!`, "success");
}

function resetBoard() {
    if (isSolving) return;
    boardCurrent = boardPuzzle.map(row => [...row]);
    renderBoardDOM();
    resetTimer();
    startTimer();
    synth.playErase();
    updateStatus("Board reset.", "info");
}

function clearBoard() {
    if (isSolving) return;
    boardPuzzle = Array.from({ length: 9 }, () => Array(9).fill(0));
    boardCurrent = Array.from({ length: 9 }, () => Array(9).fill(0));
    boardSolution = Array.from({ length: 9 }, () => Array(9).fill(0));
    selectedCell = null;
    createBoardDOM();
    renderBoardDOM();
    resetTimer();
    synth.playErase();
    updateStatus("Board cleared! Enter numbers manually.", "info");
}

function checkBoardSolution() {
    if (isSolving) return;

    if (!validateAllBoardCells()) {
        synth.playError();
        return;
    }

    let isComplete = true;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (boardCurrent[r][c] === 0) {
                isComplete = false;
                break;
            }
        }
    }

    if (!isComplete) {
        synth.playClick();
        updateStatus("No conflicts, but incomplete! Keep going.", "info");
        return;
    }
    triggerWinSequence();
}

// Timer
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!timerPaused) {
            timerSeconds++;
            const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
            const secs = String(timerSeconds % 60).padStart(2, '0');
            timerTextEl.textContent = `${mins}:${secs}`;
        }
    }, 1000);
}

function pauseTimer() { timerPaused = true; }
function resetTimer() {
    clearInterval(timerInterval);
    timerSeconds = 0;
    timerPaused = false;
    timerTextEl.textContent = "00:00";
}

// Keyboard Input
function handleKeyboardInput(e) {
    if (isSolving || !selectedCell) return;
    const { r, c } = selectedCell;

    if (e.key >= '1' && e.key <= '9') {
        inputSelectedCellValue(parseInt(e.key));
        e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        inputSelectedCellValue(0);
        e.preventDefault();
    } else if (e.key === 'ArrowUp') {
        selectCell((r - 1 + 9) % 9, c);
        e.preventDefault();
    } else if (e.key === 'ArrowDown') {
        selectCell((r + 1) % 9, c);
        e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
        selectCell(r, (c - 1 + 9) % 9);
        e.preventDefault();
    } else if (e.key === 'ArrowRight') {
        selectCell(r, (c + 1) % 9);
        e.preventDefault();
    }
}

function updateSpeedLabel() {
    const val = parseInt(speedSlider.value);
    let label = "Fast";
    if (val < 25) label = "Slow";
    else if (val < 55) label = "Medium";
    else if (val < 85) label = "Fast";
    else label = "Hyper";
    speedValueLabel.textContent = label;
}

function initThemeToggle() {
    const storedTheme = localStorage.getItem('theme') || 'light';
    setTheme(storedTheme);

    btnThemeToggle.addEventListener('click', () => {
        const activeTheme = document.documentElement.getAttribute('data-theme');
        setTheme(activeTheme === 'dark' ? 'light' : 'dark');
        synth.playClick();
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
        themeIconSun.style.display = 'block';
        themeIconMoon.style.display = 'none';
    } else {
        themeIconSun.style.display = 'none';
        themeIconMoon.style.display = 'block';
    }
}

function initSoundToggle() {
    btnSoundToggle.addEventListener('click', () => {
        synth.enabled = !synth.enabled;
        if (synth.enabled) {
            soundIconOn.style.display = 'block';
            soundIconOff.style.display = 'none';
            synth.playClick();
        } else {
            soundIconOn.style.display = 'none';
            soundIconOff.style.display = 'block';
        }
    });
}

function init() {
    createBoardDOM();
    initThemeToggle();
    initSoundToggle();
    
    btnGenerate.addEventListener('click', () => {
        synth.playClick();
        initPuzzleGeneration(difficultySelect.value);
    });
    btnSolveVisual.addEventListener('click', startVisualSolving);
    btnSolveInstant.addEventListener('click', () => {
        synth.playClick();
        startInstantSolving();
    });
    btnHint.addEventListener('click', getHint);
    btnReset.addEventListener('click', resetBoard);
    btnClear.addEventListener('click', clearBoard);
    btnCheck.addEventListener('click', checkBoardSolution);
    
    speedSlider.addEventListener('input', updateSpeedLabel);
    toggleAutocheck.addEventListener('change', () => {
        synth.playClick();
        renderBoardDOM();
    });

    numpadButtons.forEach(btn => {
        btn.addEventListener('click', () => inputSelectedCellValue(parseInt(btn.dataset.val)));
    });
    numpadErase.addEventListener('click', () => inputSelectedCellValue(0));

    document.addEventListener('keydown', handleKeyboardInput);
    updateSpeedLabel();
    initPuzzleGeneration(difficultySelect.value);
}

window.addEventListener('DOMContentLoaded', init);