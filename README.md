# Apex Sudoku - Modern Solver & Visualizer
A professional, feature-rich, and interactive Sudoku web application. This project is built as a self-contained, deployment-ready portfolio piece showcasing clean semantic markup, custom CSS glassmorphism styling, a backtracking algorithm visualizer, custom puzzle generation, and dynamic audio synthesis using the Web Audio API.
👉 **Ready to deploy directly to Vercel, Netlify, or GitHub Pages with zero configuration.**
---
## 🌟 Key Features
* **AI Solver Visualizer**: Watch the backtracking algorithm solve any puzzle in real-time. Includes controls to pause, play, step forward step-by-step, or stop the solver, and a speed slider.
* **Instant Solve**: Solves the board instantly using a high-performance recursive backtracking solver.
* **Dynamic Puzzle Generator**: Generates unique Sudoku puzzles dynamically with custom clues for **Easy**, **Medium**, and **Hard** difficulties, structured with perfect rotational symmetry.
* **Interactive Gameplay**:
  * **Real-time Validation**: Highlights conflicting cells (duplicates in rows, columns, or 3x3 grids) in red with vibration shake animations.
  * **Game Timer**: Tracks play-time. Pauses automatically if the game is paused or solved.
  * **Peers Highlighting**: Highlights matching rows, columns, and 3x3 blocks when a cell is focused, creating a satisfying gaming interface.
  * **Smart Hints**: Suggests the correct number for the selected cell based on the pre-solved grid.
* **Modern Premium UI**:
  * Futuristic dark theme (default) and clean light theme.
  * Sleek glassmorphism look (`backdrop-filter: blur(12px)`) with glowing shadows and background animation.
  * **Fully Responsive**: Scales down to fit mobile screens perfectly with an on-screen keypad controller.
* **Synthesized Audio Effects**: Interactive audio effects (key clicks, erase sweeps, hints chimes, error buzzes, and victory fanfare) synthesized directly in-browser using the native **Web Audio API**—no heavy audio files to download or links to break.
* **Victory Confetti**: Custom Canvas particle confetti animation when you complete the board.
---
## 🛠️ Tech Stack
* **Frontend Structure**: HTML5 (Semantic elements)
* **Styling & Theme**: CSS3 (Glassmorphism layout, CSS Custom Variables, Flexbox/Grid, Keyframe Animations)
* **Logic Engine**: Vanilla JavaScript (ES6+, Recursive Backtracking, Timer cycles, Web Audio API, Canvas particle engine)
* **Icons**: FontAwesome v6.4.0
---

---
## 🚀 How to Run Locally
Since this app is built purely with standard web technologies, there are **no dependencies or build steps** required.
1. Clone or download this folder.
2. Open `index.html` directly in any modern web browser (Double click the file or drag it into Chrome/Firefox/Safari/Edge).
3. Alternatively, run using a local server extension (like VS Code Live Server) to preview the glassmorphism blur and audio system locally.
---
## 🧠 Backtracking Algorithm Explanation
The Sudoku Solver uses a depth-first search (DFS) **Backtracking Algorithm**. 
### How it works:
1. It searches for an empty cell on the board.
2. If no empty cell is found, the board is solved and the function returns `true`.
3. If an empty cell is found, it attempts to place digits `1` through `9` in that cell.
4. For each digit, it checks if it is valid (no conflict in row, column, or 3x3 grid).
5. If the digit is valid, it places it in the cell and recursively attempts to solve the rest of the board.
6. If the recursive call returns `true`, it continues. If the recursive call returns `false` (meaning the grid became unsolvable downstream), it **backtracks**: it sets the cell back to empty (`0`) and tries the next digit.
7. If all numbers `1-9` have been tried and none lead to a solution, it returns `false` to trigger backtracking in the parent call.
During **Visual Solve**, the app pauses for a small interval (controlled by the speed slider) on each placement, coloring the cell:
* **Amber/Yellow (`.cell-searching`)** to show active searching.
* **Green (`.cell-valid-placed`)** to show a valid digit was placed.
* **Red/Orange (`.cell-backtracked`)** to show the solver hit a dead-end and is backtracking.
---
