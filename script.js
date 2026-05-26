/**
 * ==========================================================================
 * Sudoku Solver - Core Game Engine & Visualizer (Recursive Backtracking)
 * ==========================================================================
 * Fully modular, clean JavaScript with:
 *   - Guaranteed puzzle generation (seeded from 15+ built-in puzzles + random gen)
 *   - Difficulty-based clue removal (Easy: 36 removed, Medium: 46, Hard: 56)
 *   - Real-time conflict validation
 *   - Animated backtracking visualizer
 *   - Keyboard + numpad input
 *   - Sound synthesis via Web Audio API
 *   - Timer, hint system, theme toggle
 * ==========================================================================
 */

// ---------------------------------------------------------------------------
// SECTION 1 — Sound Synthesizer
// ---------------------------------------------------------------------------
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    /** Lazy-initialises the AudioContext on first user interaction */
    _init() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported:', e);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Plays a pure tone.
     * @param {number} freq - Frequency in Hz
     * @param {string} type - OscillatorType ('sine'|'square'|'sawtooth'|'triangle')
     * @param {number} duration - Duration in seconds
     * @param {number} [volume=0.1]
     * @param {number} [delay=0] - Start delay in seconds
     */
    playTone(freq, type, duration, volume = 0.1, delay = 0) {
        if (!this.enabled) return;
        try {
            this._init();
            if (!this.ctx) return;

            const osc  = this.ctx.createOscillator();
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
            // Silently fail — audio is non-critical
        }
    }

    playClick()     { this.playTone(700,    'sine',     0.05,  0.04); }
    playInsert()    { this.playTone(523.25, 'sine',     0.12,  0.06);
                      this.playTone(659.25, 'sine',     0.12,  0.04, 0.04); }
    playError()     { this.playTone(130,    'triangle', 0.2,   0.1);
                      this.playTone(125,    'sawtooth', 0.2,   0.03); }
    playStep()      { this.playTone(950,    'sine',     0.015, 0.015); }
    playBacktrack() { this.playTone(550,    'sine',     0.015, 0.015); }
    playComplete()  { this.playTone(587.33, 'sine',     0.25,  0.06);
                      this.playTone(880.00, 'sine',     0.3,   0.05, 0.08); }

    playErase() {
        try {
            if (!this.enabled) return;
            this._init();
            if (!this.ctx) return;

            const osc  = this.ctx.createOscillator();
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

    playWin() {
        const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
        scale.forEach((freq, idx) => this.playTone(freq, 'sine', 0.3, 0.05, idx * 0.07));
    }
}

const synth = new SoundSynth();

// ---------------------------------------------------------------------------
// SECTION 2 — Built-in Puzzle Bank (15 curated puzzles per difficulty)
// Each puzzle is a flat 81-character string, 0 = empty cell.
// ---------------------------------------------------------------------------
const PUZZLE_BANK = {
    easy: [
        '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
        '120400300040000090300010060009070140050824030031060200080030007090000020004009018',
        '003020600900305001001806400008102900700000008006708200002609500800203009005010300',
        '200080300060070084030500209000105408000000000402706000301007040720040060004010003',
        '000000907000420180000705026100904000050000040000507009920108000034059000507000000',
        '030050040008010500460000012800000060000809000070000008950000241006040800020080070',
        '004310800060000050081000002007000608290080043508000900100000780030000020006041500',
        '500302000000000000020100090000960500900010003004085000050003060000000000000401007',
        '062030400901000080000008050006001009040000070900700600080300000070000103003090560',
        '010007008003680090087000010600070400730904056009060003050000730070098200800700040',
        '000900800020070005060050040030400100050010070004003090070020060500030020008006000',
        '300000000970010000600583000200000060000700005000040700500021009000060014000000063',
        '800000000003600000070090200060005300400803001005200060000010068008500400000000700',
        '061000000007001060000094800006000140000800000071000600009740000080300900000000720',
        '500000010200900604000010300060400050304000901070005020007030000906008002020000007',
    ],
    medium: [
        '010020300004005060070000008006900030000003001040070200100200000020400900007030040',
        '000000000000003085001850400000070020040100005000000000000000000006400790801000000',
        '900000070050600000000090205070000400008050200006000030701040000000003060040000009',
        '700000060010030204000200007003000900070504010006000800100007000209060050080000003',
        '060000000504000300070380060002010000010000050000030200040069080005000906000000070',
        '000030086200000050001000400050090003000603000600040070006000900070000001430050000',
        '509000000000000103000070005040800060000607000080005090300050000206000000000000807',
        '000000040008006000305000907000080600070030050006090000207000509000100800060000000',
        '070000043040009600050030070600000090003080500080000007010050020006700030930000010',
        '000070010204000000010002003000730200300000005006085000900500030000000508050040000',
        '800000000003600000070090200060005300400803001005200060000010068008500400000000700',
        '060000000900700060003008400008000030000040005700302000000007006050000000000060940',
        '003900000060007400000006050900060080040070010070080004050600000002300060000009500',
        '000080070070005040020000600100030009006050100900020008001000020040700050080060000',
        '059000400000043002030000060700010003010030080200040001040000050900380000002000930',
    ],
    hard: [
        '000000000000003085001850400000070020040100005000000000000000000006400790801000000',
        '800000000003600000070090200060005300400803001005200060000010068008500400000000700',
        '000030000000000050050070609090800006407000000000090200000400000500001003301060080',
        '070000200000000001005009007030060000004020900060000080010000040900700000007050030',
        '000000601010004090020007000000500008070030060800002000000900030050200070403000000',
        '040000005000070060003001070000000800006030700090000000030006009060040000700000010',
        '000060040500000001090040300000100000200090005000004000006010090400000006070080000',
        '700000060010030204000200007003000900070504010006000800100007000209060050080000003',
        '060000000504000300070380060002010000010000050000030200040069080005000906000000070',
        '003070000000600040008030600200000900700020003001000008006080400040009000000010500',
        '000005030000600002009000070001004800080030090006200400030000900600007000070100000',
        '050090010000004000400038009003000600900050001006000300200480007000900000080060050',
        '000000009000090400300704001006000000020050080000000700800407006005020000900000000',
        '600070000000800300003050070010000004000602000500000030060010900008004000000080005',
        '090000050001500906060040010000706000700000003000801000050020040802007600040000070',
    ]
};

// ---------------------------------------------------------------------------
// SECTION 3 — State
// ---------------------------------------------------------------------------
/** @type {number[][]} The initial puzzle clues (0 = blank) */
let boardPuzzle   = Array.from({ length: 9 }, () => Array(9).fill(0));
/** @type {number[][]} The player's current working board */
let boardCurrent  = Array.from({ length: 9 }, () => Array(9).fill(0));
/** @type {number[][]} The fully solved reference solution */
let boardSolution = Array.from({ length: 9 }, () => Array(9).fill(0));

/** @type {{r:number, c:number}|null} Currently focused cell */
let selectedCell = null;
/** @type {boolean} True while the animated solver is running */
let isSolving = false;
/** @type {boolean} Signals the async solver to abort */
let cancelSolveRequest = false;

// Timer state
let timerInterval = null;
let timerSeconds  = 0;
let timerPaused   = false;

// ---------------------------------------------------------------------------
// SECTION 4 — DOM Cache
// ---------------------------------------------------------------------------
const boardEl         = document.getElementById('sudoku-board-element');
const statusMsgEl     = document.getElementById('status-message');
const statusBadgeEl   = document.getElementById('status-badge');
const difficultySelect = document.getElementById('difficulty-select');
const btnGenerate     = document.getElementById('btn-generate');
const btnSolveVisual  = document.getElementById('btn-solve-visual');
const btnSolveInstant = document.getElementById('btn-solve-instant');
const btnHint         = document.getElementById('btn-hint');
const btnReset        = document.getElementById('btn-reset');
const btnClear        = document.getElementById('btn-clear');
const btnCheck        = document.getElementById('btn-check');
const btnThemeToggle  = document.getElementById('btn-theme-toggle');
const themeIconSun    = document.getElementById('theme-icon-sun');
const themeIconMoon   = document.getElementById('theme-icon-moon');
const btnSoundToggle  = document.getElementById('btn-sound-toggle');
const soundIconOn     = document.getElementById('sound-icon-on');
const soundIconOff    = document.getElementById('sound-icon-off');
const speedSlider     = document.getElementById('speed-slider');
const speedValueLabel = document.getElementById('speed-value');
const toggleAutocheck = document.getElementById('toggle-autocheck');
const timerTextEl     = document.getElementById('timer-text');
const numpadButtons   = document.querySelectorAll('.numpad-btn:not(.erase-btn)');
const numpadErase     = document.getElementById('numpad-erase');

// ---------------------------------------------------------------------------
// SECTION 5 — DOM Board Rendering
// ---------------------------------------------------------------------------

/**
 * Builds all 81 cell <div> elements inside the board container.
 * Called once during init and after a full clear.
 */
function createBoardDOM() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.classList.add('sudoku-cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.setAttribute('tabindex', '0');
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}`);

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

/**
 * Returns the DOM element for a given grid position.
 * @param {number} r - Row index (0–8)
 * @param {number} c - Column index (0–8)
 */
function getCellDOM(r, c) {
    return boardEl.children[r * 9 + c];
}

/**
 * Syncs the entire board DOM with the current state arrays.
 * - Clears previous state classes
 * - Applies 'original' class to fixed clue cells
 * - Restores selection & validation overlays
 */
function renderBoardDOM() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = getCellDOM(r, c);
            if (!cell) continue;

            const val = boardCurrent[r][c];

            // Clear all dynamic state classes, keep only the base class
            cell.className = 'sudoku-cell';
            cell.textContent = val !== 0 ? String(val) : '';

            if (boardPuzzle[r][c] !== 0) {
                // Fixed clue — visually distinct and not editable
                cell.classList.add('original');
                cell.setAttribute('aria-readonly', 'true');
            } else {
                cell.removeAttribute('aria-readonly');
            }
        }
    }

    // Re-apply selection highlighting
    if (selectedCell) selectCell(selectedCell.r, selectedCell.c);

    // Re-apply conflict highlights if auto-check is on
    if (toggleAutocheck.checked) validateAllBoardCells();
}

// ---------------------------------------------------------------------------
// SECTION 6 — Cell Selection & Highlighting
// ---------------------------------------------------------------------------

/**
 * Selects a cell and highlights its row, column, and 3×3 box.
 * Also highlights cells sharing the same number.
 */
function selectCell(r, c) {
    selectedCell = { r, c };
    const cells = boardEl.querySelectorAll('.sudoku-cell');

    // Remove previous selection classes
    cells.forEach(cell => cell.classList.remove('selected', 'highlighted', 'same-number'));

    const activeCell = getCellDOM(r, c);
    if (!activeCell) return;
    activeCell.classList.add('selected');

    const boxStartRow = r - (r % 3);
    const boxStartCol = c - (c % 3);
    const cellValue   = boardCurrent[r][c];

    cells.forEach(cell => {
        const cr = parseInt(cell.dataset.row, 10);
        const cc = parseInt(cell.dataset.col, 10);

        // Highlight same row / column / box
        const inBox = (cr >= boxStartRow && cr < boxStartRow + 3 &&
                       cc >= boxStartCol && cc < boxStartCol + 3);
        if (cr === r || cc === c || inBox) {
            cell.classList.add('highlighted');
        }

        // Highlight matching number
        if (cellValue !== 0 && boardCurrent[cr][cc] === cellValue) {
            cell.classList.add('same-number');
        }
    });
}

// ---------------------------------------------------------------------------
// SECTION 7 — Player Input
// ---------------------------------------------------------------------------

/**
 * Writes a value into the selected editable cell.
 * @param {number} val - 1–9 to place, 0 to erase
 */
function inputSelectedCellValue(val) {
    if (!selectedCell || isSolving) return;
    const { r, c } = selectedCell;

    // Block editing of original clue cells
    if (boardPuzzle[r][c] !== 0) {
        synth.playError();
        const cell = getCellDOM(r, c);
        cell.classList.add('shake-reject');
        setTimeout(() => cell.classList.remove('shake-reject'), 400);
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

    // Check win condition after every input
    if (checkGameCompleteCondition()) {
        triggerWinSequence();
    }
}

// ---------------------------------------------------------------------------
// SECTION 8 — Sudoku Core Algorithms
// ---------------------------------------------------------------------------

/**
 * Checks whether placing `num` at (r, c) is valid per Sudoku rules.
 * @param {number[][]} grid
 * @param {number} r
 * @param {number} c
 * @param {number} num
 * @returns {boolean}
 */
function isValid(grid, r, c, num) {
    // Row check
    for (let col = 0; col < 9; col++) {
        if (grid[r][col] === num) return false;
    }
    // Column check
    for (let row = 0; row < 9; row++) {
        if (grid[row][c] === num) return false;
    }
    // 3×3 box check
    const boxR = r - (r % 3);
    const boxC = c - (c % 3);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[boxR + i][boxC + j] === num) return false;
        }
    }
    return true;
}

/**
 * Finds the first empty cell (value === 0) in reading order.
 * @param {number[][]} grid
 * @returns {[number, number]} [row, col], or [-1, -1] if board is full
 */
function findEmptyCell(grid) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r][c] === 0) return [r, c];
        }
    }
    return [-1, -1];
}

/**
 * Recursive backtracking solver (deterministic, 1–9 order).
 * Mutates `grid` in-place.
 * @param {number[][]} grid
 * @returns {boolean} true if solved
 */
function solveSudoku(grid) {
    const [r, c] = findEmptyCell(grid);
    if (r === -1) return true; // All cells filled → solved

    for (let num = 1; num <= 9; num++) {
        if (isValid(grid, r, c, num)) {
            grid[r][c] = num;
            if (solveSudoku(grid)) return true;
            grid[r][c] = 0; // Backtrack
        }
    }
    return false; // No valid number → trigger backtrack from caller
}

/**
 * Fills an empty grid with a complete, randomised valid Sudoku solution.
 * Used as the base for puzzle generation.
 * @param {number[][]} grid - Must start as all zeros
 * @returns {boolean}
 */
function fillBoardRandom(grid) {
    const [r, c] = findEmptyCell(grid);
    if (r === -1) return true;

    // Shuffle 1–9 for randomness
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }

    for (const num of nums) {
        if (isValid(grid, r, c, num)) {
            grid[r][c] = num;
            if (fillBoardRandom(grid)) return true;
            grid[r][c] = 0;
        }
    }
    return false;
}

/**
 * Parses a flat 81-char string into a 9×9 grid.
 * @param {string} str
 * @returns {number[][]}
 */
function parseGridString(str) {
    const grid = [];
    for (let r = 0; r < 9; r++) {
        grid.push([]);
        for (let c = 0; c < 9; c++) {
            grid[r].push(parseInt(str[r * 9 + c], 10) || 0);
        }
    }
    return grid;
}

/**
 * Deep-clones a 9×9 grid.
 * @param {number[][]} grid
 * @returns {number[][]}
 */
function cloneGrid(grid) {
    return grid.map(row => [...row]);
}

// ---------------------------------------------------------------------------
// SECTION 9 — Puzzle Generation
// ---------------------------------------------------------------------------

/**
 * Generates and loads a new puzzle for the given difficulty.
 * Strategy:
 *   1. Try to pick a random puzzle from the built-in bank.
 *   2. Fall back to procedural generation if bank is exhausted.
 * Then:
 *   - Solves the full grid to produce `boardSolution`
 *   - Removes cells according to difficulty
 *   - Populates `boardPuzzle` and `boardCurrent`
 *   - Re-renders the board
 *
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 */
function initPuzzleGeneration(difficulty) {
    updateStatus('Generating new puzzle…', 'info');
    resetTimer();

    let puzzleGrid;
    let solutionGrid;

    const bank = PUZZLE_BANK[difficulty] || PUZZLE_BANK.medium;

    // --- Strategy A: use a curated puzzle from the bank ---
    try {
        const rawStr = bank[Math.floor(Math.random() * bank.length)];
        const base   = parseGridString(rawStr);

        // Solve to obtain the canonical solution
        solutionGrid = cloneGrid(base);
        if (!solveSudoku(solutionGrid)) throw new Error('Bank puzzle unsolvable');

        // Apply difficulty-based cell removal on top of the bank puzzle
        puzzleGrid = cloneGrid(base);
        applyDifficultyCellRemoval(puzzleGrid, difficulty);
    } catch (e) {
        // --- Strategy B: procedural generation ---
        console.warn('Falling back to procedural generation:', e);
        const fullGrid = Array.from({ length: 9 }, () => Array(9).fill(0));
        fillBoardRandom(fullGrid);
        solutionGrid = cloneGrid(fullGrid);

        puzzleGrid = cloneGrid(fullGrid);
        applyDifficultyCellRemoval(puzzleGrid, difficulty);
    }

    // Safety net: ensure at least 17 clues remain (minimum for unique puzzle)
    const clueCount = puzzleGrid.flat().filter(v => v !== 0).length;
    if (clueCount < 17) {
        console.warn('Too few clues – regenerating');
        initPuzzleGeneration(difficulty);
        return;
    }

    boardSolution = solutionGrid;
    boardPuzzle   = cloneGrid(puzzleGrid);
    boardCurrent  = cloneGrid(puzzleGrid);

    selectedCell = null;
    renderBoardDOM();

    const clueLabel = boardPuzzle.flat().filter(v => v !== 0).length;
    updateStatus(`${capitalize(difficulty)} puzzle ready! (${clueLabel} clues)`, 'info');
    startTimer();
}

/**
 * Randomly removes cells from a complete grid to create a puzzle.
 * Removal counts: easy ≈ 36, medium ≈ 46, hard ≈ 56.
 * @param {number[][]} grid - Modified in-place
 * @param {string} difficulty
 */
function applyDifficultyCellRemoval(grid, difficulty) {
    const removeCounts = { easy: 36, medium: 46, hard: 56 };
    const toRemove = removeCounts[difficulty] ?? 46;

    // Shuffle all cell indices
    const indices = Array.from({ length: 81 }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Remove up to toRemove cells
    let removed = 0;
    for (const idx of indices) {
        if (removed >= toRemove) break;
        const r = Math.floor(idx / 9);
        const c = idx % 9;
        if (grid[r][c] !== 0) {
            grid[r][c] = 0;
            removed++;
        }
    }
}

// ---------------------------------------------------------------------------
// SECTION 10 — Conflict Validation
// ---------------------------------------------------------------------------

/**
 * Scans all rows, columns, and 3×3 boxes for duplicate values.
 * Marks conflicting cells with the 'error' CSS class.
 * @returns {boolean} true if the board has NO conflicts
 */
function validateAllBoardCells() {
    // First remove all existing error markers
    boardEl.querySelectorAll('.sudoku-cell').forEach(c => c.classList.remove('error'));

    let hasConflict = false;

    // Check rows
    for (let r = 0; r < 9; r++) {
        const seen = {};
        for (let c = 0; c < 9; c++) {
            const val = boardCurrent[r][c];
            if (val !== 0) {
                if (seen[val] !== undefined) {
                    getCellDOM(r, seen[val]).classList.add('error');
                    getCellDOM(r, c).classList.add('error');
                    hasConflict = true;
                } else {
                    seen[val] = c;
                }
            }
        }
    }

    // Check columns
    for (let c = 0; c < 9; c++) {
        const seen = {};
        for (let r = 0; r < 9; r++) {
            const val = boardCurrent[r][c];
            if (val !== 0) {
                if (seen[val] !== undefined) {
                    getCellDOM(seen[val], c).classList.add('error');
                    getCellDOM(r, c).classList.add('error');
                    hasConflict = true;
                } else {
                    seen[val] = r;
                }
            }
        }
    }

    // Check 3×3 boxes
    for (let boxR = 0; boxR < 9; boxR += 3) {
        for (let boxC = 0; boxC < 9; boxC += 3) {
            const seen = {};
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const r   = boxR + i;
                    const c   = boxC + j;
                    const val = boardCurrent[r][c];
                    if (val !== 0) {
                        if (seen[val]) {
                            getCellDOM(seen[val].r, seen[val].c).classList.add('error');
                            getCellDOM(r, c).classList.add('error');
                            hasConflict = true;
                        } else {
                            seen[val] = { r, c };
                        }
                    }
                }
            }
        }
    }

    if (hasConflict) {
        updateStatus('Conflict detected! Duplicate numbers highlighted in red.', 'error');
    }

    return !hasConflict;
}

/**
 * Checks whether the current board matches the solution exactly.
 * @returns {boolean}
 */
function checkGameCompleteCondition() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (boardCurrent[r][c] === 0 || boardCurrent[r][c] !== boardSolution[r][c]) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Validates that the current board state has no conflicts
 * (used before attempting to solve).
 * @returns {boolean}
 */
function isInitialGridValid() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const val = boardCurrent[r][c];
            if (val !== 0) {
                // Temporarily clear and test
                boardCurrent[r][c] = 0;
                const valid = isValid(boardCurrent, r, c, val);
                boardCurrent[r][c] = val;
                if (!valid) return false;
            }
        }
    }
    return true;
}

// ---------------------------------------------------------------------------
// SECTION 11 — Win Sequence
// ---------------------------------------------------------------------------

function triggerWinSequence() {
    pauseTimer();
    synth.playWin();
    updateStatus('Congratulations! Sudoku Solved! 🎉', 'success');

    // Wave animation across all cells
    boardEl.querySelectorAll('.sudoku-cell').forEach((cell, idx) => {
        setTimeout(() => cell.classList.add('cell-win'), idx * 8);
    });
}

// ---------------------------------------------------------------------------
// SECTION 12 — Animated Solver (Backtracking Visualizer)
// ---------------------------------------------------------------------------

/** Async delay helper */
const asyncDelay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Maps the speed slider value (1–100) to a delay in milliseconds.
 * Slider 1  → slowest (~544 ms/step)
 * Slider 100 → fastest (~1 ms/step)
 */
function getVisualDelayMs() {
    const v = parseInt(speedSlider.value, 10);
    return Math.max(1, 550 - v * 5.4);
}

/**
 * The recursive async backtracking visualizer.
 * Mutates `boardCurrent` and updates the DOM at each step.
 * @returns {Promise<boolean>}
 */
async function solveVisualHelper() {
    if (cancelSolveRequest) return false;

    const [r, c] = findEmptyCell(boardCurrent);
    if (r === -1) return true; // Fully solved

    for (let num = 1; num <= 9; num++) {
        if (cancelSolveRequest) return false;

        if (isValid(boardCurrent, r, c, num)) {
            boardCurrent[r][c] = num;

            const cell = getCellDOM(r, c);
            cell.textContent = String(num);
            cell.className   = 'sudoku-cell visual-try';
            synth.playStep();

            await asyncDelay(getVisualDelayMs());

            if (await solveVisualHelper()) {
                cell.className = 'sudoku-cell visual-success';
                return true;
            }

            if (cancelSolveRequest) return false;

            // Backtrack
            boardCurrent[r][c] = 0;
            cell.textContent   = '';
            cell.className     = 'sudoku-cell visual-backtrack';
            synth.playBacktrack();

            await asyncDelay(getVisualDelayMs() * 0.4);
            cell.className = 'sudoku-cell';
        }
    }
    return false;
}

/**
 * Entry point for the animated solver button.
 * If already solving, this acts as a "Stop" button.
 */
async function startVisualSolving() {
    // Toggle: if already running, cancel it
    if (isSolving) {
        cancelSolveRequest = true;
        return;
    }

    if (!isInitialGridValid()) {
        synth.playError();
        updateStatus('Cannot solve — board has conflicting numbers!', 'error');
        return;
    }

    // Pre-check: verify the puzzle is solvable before animating
    const testGrid = cloneGrid(boardCurrent);
    if (!solveSudoku(testGrid)) {
        synth.playError();
        updateStatus('Unsolvable puzzle! Backtracking failed.', 'error');
        return;
    }

    // --- Start solving ---
    isSolving          = true;
    cancelSolveRequest = false;
    pauseTimer();

    updateStatus('Solving… Backtracking in progress.', 'info');

    // Change button to "Stop Solver"
    btnSolveVisual.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
        </svg> Stop Solver`;
    btnSolveVisual.classList.replace('btn-success', 'btn-danger');
    toggleUIControls(true);

    const success = await solveVisualHelper();

    // Restore button
    btnSolveVisual.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg> Visualized Solve`;
    btnSolveVisual.classList.replace('btn-danger', 'btn-success');
    toggleUIControls(false);
    isSolving = false;

    if (success) {
        synth.playComplete();
        renderBoardDOM();
        updateStatus('Puzzle Solved! 🎉 Backtracking algorithm succeeded.', 'success');
    } else if (cancelSolveRequest) {
        // Restore the pre-solve board state
        boardCurrent = cloneGrid(boardPuzzle);
        renderBoardDOM();
        updateStatus('Solving cancelled. Board restored.', 'info');
    }
}

// ---------------------------------------------------------------------------
// SECTION 13 — Instant Solver
// ---------------------------------------------------------------------------

function startInstantSolving() {
    if (isSolving) return;

    if (!isInitialGridValid()) {
        synth.playError();
        updateStatus('Cannot solve — board has conflicting numbers!', 'error');
        return;
    }

    const workingGrid = cloneGrid(boardCurrent);
    const t0          = performance.now();
    const success     = solveSudoku(workingGrid);
    const elapsed     = ((performance.now() - t0) / 1000).toFixed(4);

    if (success) {
        boardCurrent = workingGrid;
        renderBoardDOM();
        synth.playComplete();
        pauseTimer();
        updateStatus(`Solved instantly in ${elapsed}s via backtracking!`, 'success');
    } else {
        synth.playError();
        updateStatus('This puzzle configuration is unsolvable!', 'error');
    }
}

// ---------------------------------------------------------------------------
// SECTION 14 — Hint System
// ---------------------------------------------------------------------------

/**
 * Reveals one randomly chosen incorrect/empty user cell from the solution.
 */
function getHint() {
    if (isSolving) return;

    // Gather cells that are wrong or empty
    const candidates = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (boardPuzzle[r][c] === 0 && boardCurrent[r][c] !== boardSolution[r][c]) {
                candidates.push({ r, c });
            }
        }
    }

    if (candidates.length === 0) {
        synth.playComplete();
        updateStatus('Board is already correctly filled!', 'success');
        return;
    }

    const { r, c } = candidates[Math.floor(Math.random() * candidates.length)];
    boardCurrent[r][c] = boardSolution[r][c];
    renderBoardDOM();
    selectCell(r, c);

    const cellDOM = getCellDOM(r, c);
    cellDOM.classList.add('visual-success');
    synth.playInsert();
    setTimeout(() => cellDOM.classList.remove('visual-success'), 600);

    updateStatus(`Hint placed at Row ${r + 1}, Column ${c + 1}!`, 'success');

    if (checkGameCompleteCondition()) triggerWinSequence();
}

// ---------------------------------------------------------------------------
// SECTION 15 — Board Actions (Reset / Clear / Check)
// ---------------------------------------------------------------------------

/** Restores the board to the original puzzle clues */
function resetBoard() {
    if (isSolving) return;
    boardCurrent = cloneGrid(boardPuzzle);
    selectedCell = null;
    renderBoardDOM();
    resetTimer();
    startTimer();
    synth.playErase();
    updateStatus('Board reset to original puzzle.', 'info');
}

/** Clears the entire board for manual entry */
function clearBoard() {
    if (isSolving) return;
    boardPuzzle   = Array.from({ length: 9 }, () => Array(9).fill(0));
    boardCurrent  = Array.from({ length: 9 }, () => Array(9).fill(0));
    boardSolution = Array.from({ length: 9 }, () => Array(9).fill(0));
    selectedCell  = null;
    createBoardDOM();
    renderBoardDOM();
    resetTimer();
    synth.playErase();
    updateStatus('Board cleared — enter numbers manually, then Solve!', 'info');
}

/** Validates the current board and checks for a win */
function checkBoardSolution() {
    if (isSolving) return;

    const valid = validateAllBoardCells();
    if (!valid) {
        synth.playError();
        return;
    }

    // Check completeness
    const hasEmpty = boardCurrent.some(row => row.includes(0));
    if (hasEmpty) {
        synth.playClick();
        updateStatus('No conflicts found — keep going!', 'info');
        return;
    }

    // Board is full and conflict-free → win!
    triggerWinSequence();
}

// ---------------------------------------------------------------------------
// SECTION 16 — Timer
// ---------------------------------------------------------------------------

function startTimer() {
    clearInterval(timerInterval);
    timerPaused = false;
    timerInterval = setInterval(() => {
        if (!timerPaused) {
            timerSeconds++;
            const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
            const secs = String(timerSeconds % 60).padStart(2, '0');
            timerTextEl.textContent = `${mins}:${secs}`;
        }
    }, 1000);
}

function pauseTimer()  { timerPaused = true; }

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval  = null;
    timerSeconds   = 0;
    timerPaused    = false;
    timerTextEl.textContent = '00:00';
}

// ---------------------------------------------------------------------------
// SECTION 17 — Keyboard Navigation & Input
// ---------------------------------------------------------------------------

function handleKeyboardInput(e) {
    if (isSolving) return;

    // Numpad digits and regular digits
    if (e.key >= '1' && e.key <= '9') {
        if (!selectedCell) return;
        inputSelectedCellValue(parseInt(e.key, 10));
        e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        if (!selectedCell) return;
        inputSelectedCellValue(0);
        e.preventDefault();
    } else if (e.key === 'ArrowUp') {
        if (!selectedCell) { selectCell(0, 0); return; }
        selectCell((selectedCell.r - 1 + 9) % 9, selectedCell.c);
        e.preventDefault();
    } else if (e.key === 'ArrowDown') {
        if (!selectedCell) { selectCell(0, 0); return; }
        selectCell((selectedCell.r + 1) % 9, selectedCell.c);
        e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
        if (!selectedCell) { selectCell(0, 0); return; }
        selectCell(selectedCell.r, (selectedCell.c - 1 + 9) % 9);
        e.preventDefault();
    } else if (e.key === 'ArrowRight') {
        if (!selectedCell) { selectCell(0, 0); return; }
        selectCell(selectedCell.r, (selectedCell.c + 1) % 9);
        e.preventDefault();
    }
}

// ---------------------------------------------------------------------------
// SECTION 18 — UI Utilities
// ---------------------------------------------------------------------------

/** Disables or enables all board-action controls */
function toggleUIControls(disabled) {
    [btnGenerate, btnSolveInstant, btnHint, btnReset, btnClear, btnCheck, difficultySelect]
        .forEach(el => { el.disabled = disabled; });
}

/**
 * Updates the status bar.
 * @param {string} message
 * @param {'info'|'error'|'success'} type
 */
function updateStatus(message, type = 'info') {
    statusMsgEl.textContent   = message;
    statusBadgeEl.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    statusBadgeEl.className   = `status-badge ${type}`;
}

/** Updates the speed label next to the slider */
function updateSpeedLabel() {
    const v = parseInt(speedSlider.value, 10);
    let label = 'Fast';
    if      (v < 25) label = 'Slow';
    else if (v < 55) label = 'Medium';
    else if (v < 85) label = 'Fast';
    else             label = 'Hyper';
    speedValueLabel.textContent = label;
}

/** Capitalises the first letter of a string */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---------------------------------------------------------------------------
// SECTION 19 — Theme & Sound Toggles
// ---------------------------------------------------------------------------

function initThemeToggle() {
    // Respect previously stored preference; default to dark
    const stored = localStorage.getItem('sudoku-theme') || 'dark';
    setTheme(stored);

    btnThemeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
        synth.playClick();
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sudoku-theme', theme);
    themeIconSun.style.display  = theme === 'dark' ? 'block' : 'none';
    themeIconMoon.style.display = theme === 'dark' ? 'none'  : 'block';
}

function initSoundToggle() {
    btnSoundToggle.addEventListener('click', () => {
        synth.enabled = !synth.enabled;
        soundIconOn.style.display  = synth.enabled ? 'block' : 'none';
        soundIconOff.style.display = synth.enabled ? 'none'  : 'block';
        if (synth.enabled) synth.playClick();
    });
}

// ---------------------------------------------------------------------------
// SECTION 20 — Bootstrap / Init
// ---------------------------------------------------------------------------

function init() {
    // Build the 81-cell grid
    createBoardDOM();

    // Apply theme & sound settings
    initThemeToggle();
    initSoundToggle();

    // --- Button event listeners ---
    btnGenerate.addEventListener('click', () => {
        synth.playClick();
        initPuzzleGeneration(difficultySelect.value);
    });

    btnSolveVisual.addEventListener('click', () => {
        startVisualSolving();
    });

    btnSolveInstant.addEventListener('click', () => {
        synth.playClick();
        startInstantSolving();
    });

    btnHint.addEventListener('click', () => {
        synth.playClick();
        getHint();
    });

    btnReset.addEventListener('click', () => {
        synth.playClick();
        resetBoard();
    });

    btnClear.addEventListener('click', () => {
        synth.playClick();
        clearBoard();
    });

    btnCheck.addEventListener('click', () => {
        synth.playClick();
        checkBoardSolution();
    });

    // Speed slider
    speedSlider.addEventListener('input', updateSpeedLabel);
    updateSpeedLabel();

    // Auto-check toggle
    toggleAutocheck.addEventListener('change', () => {
        synth.playClick();
        renderBoardDOM();
    });

    // Virtual numpad
    numpadButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            inputSelectedCellValue(parseInt(btn.dataset.val, 10));
        });
    });
    numpadErase.addEventListener('click', () => inputSelectedCellValue(0));

    // Keyboard input
    document.addEventListener('keydown', handleKeyboardInput);

    // --- Auto-generate a puzzle on load ---
    initPuzzleGeneration(difficultySelect.value);
}

// Wait for the DOM to be fully parsed before initialising
window.addEventListener('DOMContentLoaded', init);