// DOM 요소 가져오기
const board = document.getElementById('tetris-board');
const context = board.getContext('2d');
const nextPieceCanvas = document.getElementById('next-piece');
const nextPieceContext = nextPieceCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const startPauseButton = document.getElementById('start-pause-button');

// 게임 상수 정의
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_PIECE_COLS = 4;
const NEXT_PIECE_ROWS = 4;
const BASE_DROP_INTERVAL = 1000;

// 테트로미노 모양과 색상 정의
const COLORS = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // I
    '#0DFF72', // O
    '#F538FF', // L
    '#FF8E0D', // J
    '#FFE138', // S
    '#3877FF',  // Z
    '#000000'  // BOMB
];

const PIECES = [
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]], // T
    [[0, 0, 0, 0], [2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[3, 3], [3, 3]], // O
    [[0, 0, 4], [4, 4, 4], [0, 0, 0]], // L
    [[5, 0, 0], [5, 5, 5], [0, 0, 0]], // J
    [[0, 6, 6], [6, 6, 0], [0, 0, 0]], // S
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]],  // Z
    [[8]] // BOMB
];

// 게임 상태 변수
let grid;
let currentPiece;
let nextPiece;
let score;
let level;
let gameOver;
let animationFrameId;
let isPaused = false;
let gameStarted = false;
let isAnimating = false;

// 게임 보드 초기화
function createEmptyGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// 새로운 테트로미노 생성
function createNewPiece() {
    const rand = Math.floor(Math.random() * PIECES.length);
    const piece = {
        matrix: PIECES[rand],
        color: COLORS[rand + 1],
        x: Math.floor(COLS / 2) - Math.floor(PIECES[rand][0].length / 2),
        y: 0
    };
    return piece;
}


// 그리기 함수
function draw() {
    // 보드 그리기
    context.clearRect(0, 0, board.width, board.height);
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x]) {
                context.fillStyle = COLORS[grid[y][x]];
                context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                context.strokeStyle = '#000';
                context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }

    // 현재 조각 그리기
    if (currentPiece) {
        context.fillStyle = currentPiece.color;
        currentPiece.matrix.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value > 0) {
                    context.fillRect((currentPiece.x + dx) * BLOCK_SIZE, (currentPiece.y + dy) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    context.strokeStyle = '#000';
                    context.strokeRect((currentPiece.x + dx) * BLOCK_SIZE, (currentPiece.y + dy) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }
    
    // 다음 조각 그리기
    drawNextPiece();
}

function drawNextPiece() {
    nextPieceContext.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    if (level >= 5) {
        return;
    }
    if (nextPiece) {
        const piece = nextPiece;
        const blockSize = nextPieceCanvas.width / NEXT_PIECE_COLS;
        nextPieceContext.fillStyle = piece.color;
        
        const startX = (NEXT_PIECE_COLS - piece.matrix[0].length) / 2;
        const startY = (NEXT_PIECE_ROWS - piece.matrix.length) / 2;

        piece.matrix.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value > 0) {
                    nextPieceContext.fillRect(
                        (startX + dx) * blockSize, 
                        (startY + dy) * blockSize, 
                        blockSize, 
                        blockSize
                    );
                    nextPieceContext.strokeStyle = '#000';
                    nextPieceContext.strokeRect(
                        (startX + dx) * blockSize, 
                        (startY + dy) * blockSize, 
                        blockSize, 
                        blockSize
                    );
                }
            });
        });
    }
}


// 충돌 감지
function isValidMove(matrix, x, y) {
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            if (matrix[row][col] && (
                x + col < 0 ||
                x + col >= COLS ||
                y + row >= ROWS ||
                (grid[y + row] && grid[y + row][x + col])
            )) {
                return false;
            }
        }
    }
    return true;
}

// 조각 고정
function lockPiece() {
    currentPiece.matrix.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value > 0) {
                if (currentPiece.y + dy >= 0) {
                    grid[currentPiece.y + dy][currentPiece.x + dx] = value;
                }
            }
        });
    });
}

// 라인 클리어 애니메이션
function playLineClearAnimation(clearedLines) {
    isAnimating = true;
    const duration = 500; // 0.5초
    let start;

    return new Promise(resolve => {
        function animate(time) {
            if (!start) start = time;
            const elapsed = time - start;
            const progress = elapsed / duration;

            draw(); // Re-draw the board

            const flashOpacity = Math.abs(Math.sin(progress * Math.PI * 4)); // Flashing effect

            for (const y of clearedLines) {
                for (let x = 0; x < COLS; x++) {
                    context.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
                    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }

            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                isAnimating = false;
                resolve();
            }
        }
        requestAnimationFrame(animate);
    });
}

// 줄 제거
async function clearLines() {
    let linesToClear = [];
    for (let y = ROWS - 1; y >= 0; y--) {
        if (grid[y].every(value => value > 0)) {
            linesToClear.push(y);
        }
    }

    const linesCleared = linesToClear.length;
    if (linesCleared > 0) {
        if (linesCleared >= 3) {
            await playLineClearAnimation(linesToClear);
        }
        
        for (const y of linesToClear) {
            grid.splice(y, 1);
        }
        
        for (let i = 0; i < linesCleared; i++) {
            grid.unshift(Array(COLS).fill(0));
        }

        score += linesCleared * 100 * linesCleared;
        updateLevel();
        scoreElement.textContent = score;
    }
}

// 레벨 업데이트
function updateLevel() {
    const newLevel = Math.min(5, 1 + Math.floor(score / 2000));
    if (newLevel > level) {
        level = newLevel;
        dropInterval = BASE_DROP_INTERVAL / level;
        levelElement.textContent = level;
    }
}

// 회전
function rotate() {
    const matrix = currentPiece.matrix;
    const N = matrix.length;
    const newMatrix = Array.from({ length: N }, () => Array(N).fill(0));

    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            newMatrix[x][N - 1 - y] = matrix[y][x];
        }
    }
    if (isValidMove(newMatrix, currentPiece.x, currentPiece.y)) {
        currentPiece.matrix = newMatrix;
    }
}


// 게임 루프
let lastTime = 0;
let dropCounter = 0;
let dropInterval = BASE_DROP_INTERVAL;

function gameLoop(time = 0) {
    if (isPaused || isAnimating) {
        if (!isPaused) {
           animationFrameId = requestAnimationFrame(gameLoop);
        }
        return;
    }
    if (gameOver) {
        cancelAnimationFrame(animationFrameId);
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, board.width, board.height);
        context.font = '30px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('게임 오버', board.width / 2, board.height / 2);
        startPauseButton.disabled = false;
        startPauseButton.textContent = "다시 시작";
        gameStarted = false;
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        dropPiece();
    }

    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

async function hardDrop() {
    while (isValidMove(currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
    }
    await landPiece();
}

async function dropPiece() {
    if (isValidMove(currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        dropCounter = 0;
    } else {
        await landPiece();
    }
}

function detonateBomb(x, y) {
    score += 500; // 폭탄 점수 추가
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const newX = x + j;
            const newY = y + i;
            if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS) {
                grid[newY][newX] = 0;
            }
        }
    }
}


async function landPiece() {
    // BOMB
    if (currentPiece.matrix[0][0] === 8) {
        detonateBomb(currentPiece.x, currentPiece.y);
    } else {
        lockPiece();
    }
    await clearLines();
    currentPiece = nextPiece;
    nextPiece = createNewPiece();
    if (!isValidMove(currentPiece.matrix, currentPiece.x, currentPiece.y)) {
        gameOver = true;
    }
    dropCounter = 0;
}

// 키보드 입력 처리
document.addEventListener('keydown', event => {
    if (gameOver || isPaused || isAnimating) return;

    if (event.key === 'ArrowLeft') {
        if (isValidMove(currentPiece.matrix, currentPiece.x - 1, currentPiece.y)) {
            currentPiece.x--;
        }
    } else if (event.key === 'ArrowRight') {
        if (isValidMove(currentPiece.matrix, currentPiece.x + 1, currentPiece.y)) {
            currentPiece.x++;
        }
    } else if (event.key === 'ArrowDown') {
        dropPiece();
    } else if (event.key === 'ArrowUp') {
        rotate();
    } else if (event.key === ' ' || event.key === 'Spacebar') { 
        hardDrop();
    }
});

// 게임 시작 함수
function startGame() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    grid = createEmptyGrid();
    currentPiece = createNewPiece();
    nextPiece = createNewPiece();
    score = 0;
    level = 1;
    scoreElement.textContent = score;
    levelElement.textContent = level;
    gameOver = false;
    dropInterval = BASE_DROP_INTERVAL;
    startPauseButton.textContent = '게임 멈춤';
    gameStarted = true;
    isPaused = false;
    isAnimating = false;
    lastTime = performance.now();
    
    gameLoop();
}

function togglePause() {
    isPaused = !isPaused;
    startPauseButton.textContent = isPaused ? '게임 시작' : '게임 멈춤';
    if (!isPaused) {
        lastTime = performance.now();
        gameLoop();
    } else {
        cancelAnimationFrame(animationFrameId);
    }
}

// 시작/일시정지 버튼 이벤트 리스너
startPauseButton.addEventListener('click', () => {
    if (!gameStarted) {
        startGame();
    } else {
        togglePause();
    }
});

// 초기 화면
function init() {
     context.clearRect(0, 0, board.width, board.height);
     nextPieceContext.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
}

init();