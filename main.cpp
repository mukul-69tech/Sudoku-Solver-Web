#include <iostream>
#include <vector>
using namespace std;

class SudokuSolver {
private:
    vector<vector<int>> board;

public:
    SudokuSolver(vector<vector<int>> initialBoard) {
        board = initialBoard;
    }

    void printBoard() {
        cout << "\n========= Solved Sudoku =========\n\n";

        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) {
                cout << board[i][j] << " ";

                if ((j + 1) % 3 == 0 && j != 8)
                    cout << "| ";
            }

            cout << endl;

            if ((i + 1) % 3 == 0 && i != 8)
                cout << "---------------------" << endl;
        }
    }

    bool isSafe(int row, int col, int num) {

        // Row Check
        for (int x = 0; x < 9; x++) {
            if (board[row][x] == num)
                return false;
        }

        // Column Check
        for (int x = 0; x < 9; x++) {
            if (board[x][col] == num)
                return false;
        }

        // 3x3 Grid Check
        int startRow = row - row % 3;
        int startCol = col - col % 3;

        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (board[i + startRow][j + startCol] == num)
                    return false;
            }
        }

        return true;
    }

    bool solveSudoku() {

        int row = -1;
        int col = -1;
        bool isEmpty = false;

        // Find Empty Cell
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) {

                if (board[i][j] == 0) {
                    row = i;
                    col = j;
                    isEmpty = true;
                    break;
                }
            }

            if (isEmpty)
                break;
        }

        // Puzzle Solved
        if (!isEmpty)
            return true;

        // Try Numbers 1-9
        for (int num = 1; num <= 9; num++) {

            if (isSafe(row, col, num)) {

                board[row][col] = num;

                if (solveSudoku())
                    return true;

                // Backtracking
                board[row][col] = 0;
            }
        }

        return false;
    }

    bool isValidBoard() {

        for (int row = 0; row < 9; row++) {

            for (int col = 0; col < 9; col++) {

                int current = board[row][col];

                if (current != 0) {

                    board[row][col] = 0;

                    if (!isSafe(row, col, current)) {
                        board[row][col] = current;
                        return false;
                    }

                    board[row][col] = current;
                }
            }
        }

        return true;
    }
};

int main() {

    vector<vector<int>> puzzle(9, vector<int>(9));

    cout << "========== Sudoku Solver ==========" << endl;
    cout << "Enter Sudoku Puzzle (Use 0 for empty cells)" << endl;
    cout << "-----------------------------------" << endl;

    // User Input
    for (int i = 0; i < 9; i++) {

        for (int j = 0; j < 9; j++) {

            cin >> puzzle[i][j];

            // Input Validation
            if (puzzle[i][j] < 0 || puzzle[i][j] > 9) {

                cout << "Invalid Input! Enter values between 0 and 9 only." << endl;
                return 0;
            }
        }
    }

    SudokuSolver solver(puzzle);

    // Board Validation
    if (!solver.isValidBoard()) {

        cout << "\nInvalid Sudoku Puzzle! Duplicate values found." << endl;
        return 0;
    }

    cout << "\nSolving Sudoku..." << endl;

    // Solve Puzzle
    if (solver.solveSudoku()) {

        solver.printBoard();
    }
    else {

        cout << "\nNo Solution Exists For This Sudoku Puzzle." << endl;
    }

    return 0;
}