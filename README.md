SudokuX — Backtracking Solver

A premium, portfolio-grade Sudoku Solver Web Application powered by the same Recursive Backtracking Algorithm used in the original C++ project.


🧩 Project Overview
SudokuX transforms the original console-based C++ Sudoku solver into a fully interactive, visually stunning web application. The core solving algorithm — recursive backtracking with row/column/box validation — is preserved exactly, now visualised in real time through animated cell updates.

✨ Features
FeatureDetails🎮 Interactive BoardClick cells + numpad or keyboard⚡ Puzzle GeneratorEasy / Medium / Hard difficulty🧠 Animated SolverWatch backtracking happen live💡 HintsUp to 3 per puzzle✓ ValidationReal-time conflict detection⏱ TimerStart / Pause / Reset🎵 Sound EffectsWeb Audio API tones🌙 Dark/Light ModeFull theme toggle📝 Note ModePress N to toggle pencil notes🏆 Win ScreenConfetti + stats📱 ResponsiveMobile + Desktop⌨️ KeyboardArrow keys + digit input

🛠 Technologies

HTML5 — Semantic structure
CSS3 — Glassmorphism, CSS custom properties, animations
Vanilla JavaScript (ES6+) — No frameworks, no dependencies
Web Audio API — Procedural sound effects
Google Fonts — Syne + JetBrains Mono


🔬 Algorithm Explanation
The solving engine is a direct JavaScript port of the C++ backtracking solver.
Core Functions
isSafe(board, row, col, num)
  → Validates that `num` doesn't appear in the same row, column, or 3×3 box.
  → Mirrors C++ isValid() checking all three constraint types.

findEmpty(board)
  → Scans the 9×9 grid for the first cell with value 0.
  → Equivalent to C++ findUnassigned().

solveSudoku(board)
  → Recursive function:
      1. Call findEmpty() — if none, return true (solved!)
      2. Try digits 1–9
      3. If isSafe() → place digit → recurse
      4. If recursion returns false → reset cell to 0 (backtrack)
      5. If no digit works → return false (trigger parent backtrack)
Time Complexity

Worst case: O(9^m) where m = number of empty cells
In practice much faster due to constraint pruning at each step

Puzzle Generation

Generate a fully solved board using randomised backtracking
Remove cells one by one, checking uniqueness of solution
Stop when target clue count reached for chosen difficulty

🤝 Credits
Inspired by the original C++ Sudoku Solver project using recursion and backtracking. Algorithm logic preserved and ported faithfully to JavaScript.