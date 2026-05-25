# ApexSudoku - Interactive Sudoku Solver Web App

A modern and fully interactive Sudoku Solver web application built using **HTML, CSS, and JavaScript**.  
This project is inspired by my original **C++ CLI-based Sudoku Solver** that used **Recursion** and **Backtracking Algorithm** to solve Sudoku puzzles efficiently.

The web version transforms the traditional console application into a modern browser-based experience with a responsive UI, real-time validation, animations, and interactive gameplay.

---

# 🚀 Live Demo

🔗 https://sudoku-solver-pfuwxuccw-mukul-69techs-projects.vercel.app/

---

# 📂 GitHub Repository

🔗 https://github.com/mukul-69tech/Sudoku-Solver-Web

---

# ✨ Features

- 🎮 Interactive 9×9 Sudoku Board
- 🧠 Automatic Sudoku Solver
- 🔄 Backtracking Algorithm Visualization
- ⚡ Real-Time Input Validation
- 🎲 Random Sudoku Puzzle Generator
- 🌙 Dark / Light Mode
- 📱 Fully Responsive Design
- 💡 Hint System
- ✅ Solution Checker
- 🔊 Interactive UI Effects
- 🎯 Difficulty Levels (Easy / Medium / Hard)
- 🔁 Reset & Clear Board Functionality
- ❌ Invalid Puzzle Detection
- 🏆 Winning Detection and Feedback

---

# 🛠️ Tech Stack

## Frontend
- HTML5
- CSS3
- JavaScript (Vanilla JS)

## Algorithms & Concepts
- Backtracking Algorithm
- Recursion
- 2D Arrays
- Grid Validation Logic
- Dynamic DOM Manipulation

---

# 🧩 Algorithm Used

The Sudoku Solver is powered by the **Backtracking Algorithm**, a recursive problem-solving technique commonly used in constraint satisfaction problems.

### Validation Rules:
The algorithm ensures:
- No duplicate numbers in a row
- No duplicate numbers in a column
- No duplicate numbers in a 3×3 subgrid

### Solving Process:
1. Find an empty cell
2. Try placing numbers from 1–9
3. Check if placement is valid
4. Recursively solve the next cell
5. Backtrack if a conflict occurs

This approach efficiently solves valid Sudoku puzzles while detecting unsolvable cases.

---



# 📦 Installation & Setup

## Clone Repository

```bash
git clone https://github.com/mukul-69tech/Sudoku-Solver-Web.git