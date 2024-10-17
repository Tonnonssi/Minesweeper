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
        this.helperToggled = false;

        this.gameBoard = document.getElementById("gameBoard");
        this.resetButton = document.getElementById("reset");
        this.timerElement = document.getElementById('timer');
        this.minesCounter = document.getElementById('mines-counter');
        this.headBar = document.getElementById('header-bar');
        this.helper = document.getElementById("helper");

        this.headBar.className = "header-bar";
        this.timerElement.className = "timer";
        this.minesCounter.className = "mines-counter";
        this.resetButton.className = "reset";
        this.helper.className = "helper";

        this.width = 31 * this.nCols;

        this.initializeBoard();
        this.renderBoard();

        this.resetButton.addEventListener("click", this.reset.bind(this));
        this.helper.addEventListener("click", this.toggleHelper.bind(this));  // 여기서 toggleHelper 호출
    }

    showHelperValues() {
    const minColor = [255, 0, 0]; // Red color for min value
    const maxColor = [0, 0, 255]; // Blue color for max value
    
    // Find the minimum and maximum values on the board (for all unrevealed cells)
    let values = [];
    for (let i = 0; i < this.nRows; i++) {
        for (let j = 0; j < this.nCols; j++) {
            // Ensure even unclicked cells have a value, using the default 'value' if none is set
            if (!this.board[i][j].revealed) {
                values.push(this.board[i][j].value || 0); // Fallback to 0 if value is not set
            }
        }
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Helper function to calculate the gradient color with 50% transparency
    function getColorForValue(value, minValue, maxValue) {
        const ratio = (value - minValue) / (maxValue - minValue); // Normalize value between 0 and 1

        const r = Math.round(minColor[0] + ratio * (maxColor[0] - minColor[0]));
        const g = Math.round(minColor[1] + ratio * (maxColor[1] - minColor[1]));
        const b = Math.round(minColor[2] + ratio * (maxColor[2] - minColor[2]));

        return `rgba(${r},${g},${b},0.7)`; // 70% transparency using rgba
    }

    for (let i = 0; i < this.nRows; i++) {
        for (let j = 0; j < this.nCols; j++) {
            const cellElement = document.getElementById(`cell-${i}-${j}`);
            const value = this.board[i][j].value;

            if (!this.board[i][j].revealed) {
                if (this.helperToggled) {
                    const color = getColorForValue(value, minValue, maxValue);

                    // Create a square div of size 30x30 with background color
                    let square = document.createElement("div");
                    square.style.width = "30px";
                    square.style.height = "30px";
                    square.style.backgroundColor = color;
                    square.style.position = "absolute";
                    square.style.top = "0";
                    square.style.left = "0";

                    // Create a text element to display the value
                    let text = document.createElement("div");
                    text.textContent = value || '0'; // If value is 0 or null, display nothing
                    text.style.position = "relative";
                    text.style.zIndex = "1"; // Ensure the text is on top of the square
                    text.style.fontSize = "12px"; // You can adjust the size as needed
                    text.style.color = "#FFFFFF"; // Text color can be changed
                    text.style.display = "flex";
                    text.style.justifyContent = "center";
                    text.style.alignItems = "center";
                    text.style.width = "30px"; // Same size as square
                    text.style.height = "30px"; // Same size as square

                    // Clear the cell content and add both square and text elements
                    cellElement.classList.add('helper-active');
                    cellElement.innerHTML = ''; // Clear the cell content before adding the elements
                    cellElement.style.position = "relative"; // Ensure the positioning is relative for the absolute square
                    cellElement.appendChild(square); // Append the square to the cell
                    cellElement.appendChild(text); // Append the text on top of the square
                } else {
                    cellElement.classList.remove('helper-active');
                    cellElement.innerHTML = ""; // Hide the helper value and clear cell content
                }
            }
        }
    }
}
    
    // toggleHelper()를 추가하여 helperToggled 상태만 변경
    toggleHelper() {
        this.helperToggled = !this.helperToggled;
        this.showHelperValues(); // 상태에 따라 helper 값을 갱신
    }

    async runInference(inputArr) {
        try {
            // 비동기 방식으로 세션을 생성합니다.
            const session = await ort.InferenceSession.create('SOTA_onnx_model.onnx');
          
            const inputTensor = new ort.Tensor('float32', inputArr.flat(3), [1, 11, 9, 9]);
          
            // 입력 피드 정의
            const feeds = { 'input.1': inputTensor };  // input.1은 ONNX 모델의 입력 노드 이름일 수 있음. 노드 이름은 ONNX 모델 구조에 따라 다를 수 있습니다.
          
            // 추론 실행 (비동기)
            const results = await session.run(feeds);
          
            // 출력 노드 가져오기
            const outputNodeName = Object.keys(results)[0]; // 첫 번째 출력 노드
            const resultDict = results[outputNodeName].data; // 결과 데이터 가져오기
          
            return resultDict;
        } catch (error) {
            console.error('Error running inference:', error);
            return null;
        }
    }

    async updateValue() {
        const labelState = this.generate2DArray();
        const inputState = this.convertMultiChannel(labelState);
    
        const qVal = await this.runInference(inputState);  // 비동기 호출 처리
    
        if (!qVal) {
            console.error('Error: Inference failed.');
            return;
        }
    
        // `revealed = true`인 셀의 값을 제외한 qVal 배열 만들기
        const unrevealedQVal = [];
        for (let i = 0; i < this.nRows; i++) {
            for (let j = 0; j < this.nCols; j++) {
                if (!this.board[i][j].revealed) {
                    unrevealedQVal.push(qVal[i * this.nCols + j]);
                }
            }
        }
    
        if (unrevealedQVal.length === 0) {
            console.error('Error: No unrevealed cells available.');
            return;
        }
    
        // unrevealedQVal에서 최소값과 최대값 찾기
        const qMin = Math.min(...unrevealedQVal);
        const qMax = Math.max(...unrevealedQVal);
    
        // Min-Max 스케일링 적용
        const scaledQVal = qVal.map((value, index) => {
            const row = Math.floor(index / this.nCols);
            const col = index % this.nCols;
    
            // revealed가 true인 셀은 스케일링을 하지 않음
            if (this.board[row][col].revealed) {
                return value;  // 이미 공개된 셀은 그대로 둠
            }
    
            // Min-Max 스케일링
            return (value - qMin) / (qMax - qMin);
        });
    
        // 보드에 스케일링된 값을 적용
        for (let i = 0; i < this.nRows; i++) {
            for (let j = 0; j < this.nCols; j++) {
                if (!this.board[i][j].revealed) {
                    this.board[i][j].value = Math.round(scaledQVal[i * this.nCols + j] * 100);  // 스케일링된 값을 적용
                }
            }
        }
    }

    convertMultiChannel(labelMap) {
        // Create an empty arrC of shape (1, 11, 9, 9)
        let multiChannel = Array.from({ length: 1 }, () =>
            Array.from({ length: 11 }, () =>
                Array.from({ length: this.nRows }, () =>
                    Array.from({ length: this.nCols }, () => 0)
                )
            )
        );

        for (let i = 0; i < this.nRows; i++) {
            for (let j = 0; j < this.nCols; j++) {
                let value = labelMap[i][j]; 
                multiChannel[0][value][i][j] = 1; 
            }
        }
    
        return multiChannel;
    }
    

    generate2DArray() {
        return this.board.map(row =>
            row.map(cell => {
                if (cell.revealed) {
                    if (cell.isMine) {
                        return 9; // python : -2
                    } else {
                        return cell.count;
                    }
                } else {
                    return 10; // python : -1
                }
            })
        );
    }

    initializeBoard() {
        this.board = Array.from({ length: this.nRows }, () =>
            Array.from({ length: this.nCols }, () => ({
                isMine: false,
                revealed: false,
                flagged: false,
                count: 0,
                value: 100,
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
        this.gameBoard.innerHTML = ""; // Clear the board before re-rendering
        this.minesCounter.textContent = (this.nMines - this.flaggedCells);
    
        for (let i = 0; i < this.nRows; i++) {
            for (let j = 0; j < this.nCols; j++) {
                const cell = document.createElement("div");
                cell.id = `cell-${i}-${j}`; // Set a unique ID for each cell
                cell.className = "unrevealedCell";
    
                // Clear any previous text content or styles in case of re-render
                cell.textContent = ""; 
                cell.style.backgroundColor = ""; 
    
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
    
                // Add event listeners for left-click and right-click (flagging)
                cell.addEventListener("click", () => this.click(i, j));
                cell.addEventListener("contextmenu", (event) => this.flag(event, i, j));
    
                this.gameBoard.appendChild(cell); // Append the cell to the game board
            }
            this.gameBoard.appendChild(document.createElement("br")); // Line break after each row
        }
    
        // Set the width of the head bar based on the board size
        this.headBar.style.width = this.width + "px";
    
        // helper 상태 유지: render 후 helper 값 표시
        if (this.helperToggled) {
            this.showHelperValues();
        }
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
            this.updateValue();
        }
    
        if (this.board[row][col].revealed) {
            let nFlaggedNeighbors = this.countFlaggedNeighbors(row, col);
            if (this.board[row][col].count === nFlaggedNeighbors) {
                this.directions.forEach(([dx, dy]) => {
                    const nx = row + dx;
                    const ny = col + dy;
    
                    if (nx >= 0 && nx < this.nRows &&
                        ny >= 0 && ny < this.nCols &&
                        !this.board[nx][ny].flagged && 
                        !this.board[nx][ny].revealed) {
    
                        if (!this.board[nx][ny].isMine) {
                            this.revealCell(nx, ny);
                            this.updateValue();
                        } else {
                            this.gameOver();
                            return;
                        }
                    }
                });
            }
        } else {
            this.revealCell(row, col);
            this.updateValue();
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
    
        // helper 상태 유지
        if (this.helperToggled) {
            this.showHelperValues(); // 클릭 후에도 helper 유지
        }
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
        this.toggleHelper();
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
        this.toggleHelper();
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
            count: cell.count,
            value: cell.value
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

document.addEventListener('DOMContentLoaded', async () => {
    const level = {
        easy: { mapSize: [9, 9], nMines: 10 },
        medium: { mapSize: [16, 16], nMines: 40 },
        expert: { mapSize: [16, 30], nMines: 99 }
    };

    let game;

    try {
        game = new MineSweeper(level['easy'].mapSize, level['easy'].nMines);
        await game.reset();  // 게임 초기화 및 렌더링
        console.log("Game initialized and board rendered.");
    } catch (error) {
        console.error("Error initializing game or rendering board:", error);
    }

    console.log("Game board element:", document.getElementById("gameBoard"));
});