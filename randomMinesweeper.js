class MineSweeper {
    constructor(mapSize, nMines) {
        this.mapSize = mapSize;
        this.nRows = mapSize[0];
        this.nCols = mapSize[1];
        this.nTiles = this.nRows * this.nCols;

        this.nMines = nMines;

        this.directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        this.revealedCells = 0;
        this.flaggedCells = 0;
        this.timerValue = 0;

        this.done = false;
        this.timerInterval = null;

        this.gameBoard = document.getElementById("gameBoard");
        this.resetButton = document.getElementById("reset");
        this.timerElement = document.getElementById('timer');
        this.minesCounter = document.getElementById('mines-counter');
        this.headBar = document.getElementById('header-bar');

        this.headBar.className = "header-bar";
        this.timerElement.className = "timer";
        this.minesCounter.className = "mines-counter";
        this.resetButton.className = "reset";

        this.width = 31 * this.nCols;

        this.initializeBoard();
        this.renderBoard();

        this.resetButton.addEventListener("click", this.reset.bind(this));
    }

    initializeBoard() {
        this.board = Array.from({ length: this.nRows }, () =>
            Array.from({ length: this.nCols }, () => ({
                isMine: false,
                revealed: false,
                flagged: false,
                count: 0,
            }))
        );

        this.seedMines();
        this.completeBoard();
    }

    seedMines() {
        let placedMines = 0;

        while (placedMines < this.nMines) {
            const row = Math.floor(Math.random() * this.nRows);
            const col = Math.floor(Math.random() * this.nCols);

            if (!this.board[row][col].isMine) {
                this.board[row][col].isMine = true;
                placedMines++;
            }
        }
    }

    completeBoard() {
        this.board.forEach((row, i) => {
            row.forEach((cell, j) => {
                if (!cell.isMine) {
                    cell.count = this.countNeighborsMine(i, j);
                }
            });
        });
    }

    countNeighborsMine(i, j) {
        let count = 0;
        this.directions.forEach(([dx, dy]) => {
            const ni = i + dx;
            const nj = j + dy;

            if (ni >= 0 && ni < this.nRows &&
                nj >= 0 && nj < this.nCols &&
                this.board[ni][nj].isMine) {
                count++;
            }
        });
        return count;
    }

    countFlaggedNeighbors(i, j) {
        let count = 0;
        this.directions.forEach(([dx, dy]) => {
            const ni = i + dx;
            const nj = j + dy;

            if (ni >= 0 && ni < this.nRows &&
                nj >= 0 && nj < this.nCols &&
                this.board[ni][nj].flagged) {
                count++;
            }
        });
        return count;
    }

    renderBoard() {
        this.gameBoard.innerHTML = "";
        this.minesCounter.textContent = (this.nMines - this.flaggedCells);

        for (let i = 0; i < this.nRows; i++) {
            for (let j = 0; j < this.nCols; j++) {
                const cell = document.createElement("div");
                cell.className = "unrevealedCell";

                if (this.board[i][j].revealed) {
                    cell.classList.add("revealed");

                    if (this.board[i][j].isMine) {
                        cell.classList.add("mine");

                    } else if (this.board[i][j].count === 0) {
                        cell.classList.add("n0");
                    } else if (this.board[i][j].count === 1) {
                        cell.classList.add("n1");
                    } else if (this.board[i][j].count === 2) {
                        cell.classList.add("n2");
                    } else if (this.board[i][j].count === 3) {
                        cell.classList.add("n3");
                    } else if (this.board[i][j].count === 4) {
                        cell.classList.add("n4");
                    } else if (this.board[i][j].count === 5) {
                        cell.classList.add("n5");
                    } else if (this.board[i][j].count === 6) {
                        cell.classList.add("n6");
                    } else if (this.board[i][j].count === 7) {
                        cell.classList.add("n7");
                    } else if (this.board[i][j].count === 8) {
                        cell.classList.add("n8");
                    }

                } else if (this.board[i][j].flagged) {
                    cell.classList.add("flagged");

                }

                cell.addEventListener("click", () => this.click(i, j));
                cell.addEventListener("contextmenu", (event) => this.flag(event, i, j));

                this.gameBoard.appendChild(cell);
            }
            this.gameBoard.appendChild(document.createElement("br"));
        }
        this.headBar.style.width = this.width + "px";
    }

    click(row, col) {
        if (!this.timerInterval) {
            this.startTimer();
        }

        if (this.done || this.board[row][col].flagged) return;

        if (row < 0 || row >= this.nRows || col < 0 || col >= this.nCols) {
            return;
        }
        // if first cell is mine
        if (this.revealedCells === 0 && this.board[row][col].isMine) {
            let safetyCell = this.findSafetyCell();
            let random_idx = Math.floor(Math.random() * safetyCell.length);
            let [sx, sy] = safetyCell[random_idx];

            this.board[sx][sy].isMine = true;
            this.board[row][col].isMine = false;
            this.completeBoard();
        }

        if (this.board[row][col].revealed) {
            let nFlaggedNeighbors = this.countFlaggedNeighbors(row, col);
            if (this.board[row][col].count === nFlaggedNeighbors) {
                this.directions.forEach(([dx, dy]) => {
                    const nx = row + dx;
                    const ny = col + dy;

                    if (nx >= 0 && nx < this.nRows &&
                        ny >= 0 && ny < this.nCols &&
                        !this.board[nx][ny].flagged && !this.board[nx][ny].revealed) {

                        if (!this.board[nx][ny].isMine) {
                            this.revealCell(nx, ny);
                        } else {
                            this.gameOver();
                            return;
                        }
                    }
                });
            }
        } else {
            this.revealCell(row, col);
        }

        if (((this.nTiles - this.revealedCells) === this.nMines) && !this.board[row][col].isMine) {
            this.gameComplete();
            return;
        }
        if (this.board[row][col].isMine) {
            this.gameOver();
            return;
        }
        this.sendBoardStateToServer();
    }

    revealCell(row, col) {
        if (this.board[row][col].revealed) return;

        this.board[row][col].revealed = true;
        this.revealedCells++;

        if (this.board[row][col].count === 0 && !this.board[row][col].isMine) {
            this.revealNeighbors([row, col]);
        }

        this.renderBoard();
    }

    revealNeighbors(coord) {
        let queue = [coord];
        let seen = new Set([coord.toString()]);

        while (queue.length) {
            let [x, y] = queue.shift();

            if (this.board[x][y].count === 0) {
                this.directions.forEach(([dx, dy]) => {
                    const nx = x + dx;
                    const ny = y + dy;
                    const neighbor = [nx, ny];

                    if (nx >= 0 && nx < this.nRows &&
                        ny >= 0 && ny < this.nCols &&
                        !seen.has(neighbor.toString())) {

                        seen.add(neighbor.toString());
                        queue.push(neighbor);

                        if (!this.board[nx][ny].revealed) {
                            this.board[nx][ny].revealed = true;
                            this.revealedCells++;
                        }
                    }
                });
            }
        }
    }

    gameComplete() {
        alert("Game Complete! You've found all mines.");
        this.resetButton.classList.add("gg");
        this.flaggedCells = this.nMines;

        let mineCell = this.findMineCell();
        for (let corr of mineCell) {
            let [x, y] = corr;
            this.board[x][y].flagged = true;
        }
        this.done = true;
        this.stopTimer();
        this.renderBoard();
        return;
    }

    gameOver() {
        alert("Game Over! You stepped on a mine.");
        this.resetButton.classList.add("oof");
        let mineCell = this.findMineCell();
        for (let corr of mineCell) {
            let [x, y] = corr;
            this.board[x][y].revealed = true;
        }
        this.done = true;
        this.stopTimer();
        this.renderBoard();
        return;
    }

    flag(event, row, col) {
        event.preventDefault();
        if (this.done) return;

        if (row < 0 || row >= this.nRows || col < 0 || col >= this.nCols || this.board[row][col].revealed) {
            return;
        }
        if (this.board[row][col].flagged) {
            this.flaggedCells--;
            this.board[row][col].flagged = false;
        } else {
            this.flaggedCells++;
            this.board[row][col].flagged = true;
        }
        this.renderBoard();
        this.sendBoardStateToServer();
    }

    findSafetyCell() {
        const safetyCell = [];
        for (let i = 0; i < this.nRows; i++) {
            for (let j = 0; j < this.nCols; j++) {
                if (!this.board[i][j].isMine) {
                    safetyCell.push([i, j]);
                }
            }
        }
        return safetyCell;
    }

    findMineCell() {
        const mineCell = [];
        for (let i = 0; i < this.nRows; i++) {
            for (let j = 0; j < this.nCols; j++) {
                if (this.board[i][j].isMine) {
                    mineCell.push([i, j]);
                }
            }
        }
        return mineCell;
    }

    reset() {
        this.done = false;
        this.revealedCells = 0;
        this.timerValue = 0;
        this.flaggedCells = 0;
        this.resetButton.className = "reset";
        this.stopTimer();
        this.timerElement.textContent = '000';
        this.initializeBoard();
        this.renderBoard();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timerValue++;
            this.timerElement.textContent = this.timerValue.toString().padStart(3, '0');
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    sendBoardStateToServer() {
        const boardState = this.board.map(row => row.map(cell => ({
            isMine: cell.isMine,
            revealed: cell.revealed,
            flagged: cell.flagged,
            count: cell.count
        })));

        fetch('/update_board', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ board: boardState })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    }
}

// Ensure levels are defined properly
const level = {
    easy: { mapSize: [9, 9], nMines: 10 },
    medium: { mapSize: [16, 16], nMines: 40 },
    expert: { mapSize: [16, 30], nMines: 99 }
};

document.addEventListener('DOMContentLoaded', () => {
    const levelSelector = document.getElementById('level');
    let game = new MineSweeper(level['easy'].mapSize, level['easy'].nMines);

    levelSelector.addEventListener('change', (event) => {
        const selectedLevel = event.target.value;
        const { mapSize, nMines } = level[selectedLevel];

        // Reset the game instance
        game.reset();
        game.stopTimer();
        document.getElementById('gameBoard').innerHTML = "";

        // Create a new game instance
        game = new MineSweeper(mapSize, nMines);
    });
});
