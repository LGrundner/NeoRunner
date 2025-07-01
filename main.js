// Get references
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const timerDisplay = document.getElementById('timer');
const instructionsDiv = document.getElementById('instructions');
const gameBox = document.getElementById('gameBox');
const scoreDisplay = document.getElementById('score');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

// Game constants
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const PLAYER_SIZE = 32;
const PLAYER_SPEED = 4;

// Game state
let gameRunning = false;
let timer = 30;
let timerInterval = null;

const player = {
  x: GAME_WIDTH / 2 - PLAYER_SIZE / 2,
  y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2,
  width: PLAYER_SIZE,
  height: PLAYER_SIZE,
  color: '#00fff7',
  dx: 0,
  dy: 0,
  frozen: false,
  freezeTimer: 0,
};

// Snippet logic
const SNIPPET_RADIUS = 16;
const SNIPPET_COLORS = ['#00fff7', '#fffb00', '#00ff85', '#ff0033'];
const SNIPPET_VALUES = {
  '#00fff7': 3, // Cyan
  '#fffb00': 2, // Yellow
  '#00ff85': 1, // Green
  '#ff0033': 0, // Red (freeze)
};
const FREEZE_DURATION = 60; // frames (~1s at 60fps)
let snippets = [];
let snippetSpawnTimeout = null;

let score = 0;
function updateScoreDisplay() {
  scoreDisplay.textContent = `Score: ${score}`;
}

function drawPlayer() {
  ctx.save();
  ctx.shadowColor = '#00fff7';
  ctx.shadowBlur = 10;
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.restore();
}

function clearCanvas() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function updatePlayer() {
  if (player.frozen) {
    player.freezeTimer--;
    if (player.freezeTimer <= 0) {
      player.frozen = false;
    }
    return;
  }
  let hitBorder = false;
  player.x += player.dx;
  player.y += player.dy;
  // Clamp to canvas and check border collision
  if (player.x < 0) { player.x = 0; hitBorder = true; }
  if (player.y < 0) { player.y = 0; hitBorder = true; }
  if (player.x + player.width > GAME_WIDTH) { player.x = GAME_WIDTH - player.width; hitBorder = true; }
  if (player.y + player.height > GAME_HEIGHT) { player.y = GAME_HEIGHT - player.height; hitBorder = true; }
  if (hitBorder) {
    player.frozen = true;
    player.freezeTimer = FREEZE_DURATION;
  }
}

function spawnSnippet() {
  // Random position, avoid spawning on player
  let x, y;
  let tries = 0;
  do {
    x = Math.random() * (GAME_WIDTH - SNIPPET_RADIUS * 2) + SNIPPET_RADIUS;
    y = Math.random() * (GAME_HEIGHT - SNIPPET_RADIUS * 2) + SNIPPET_RADIUS;
    tries++;
  } while (
    Math.abs(x - (player.x + player.width / 2)) < PLAYER_SIZE &&
    Math.abs(y - (player.y + player.height / 2)) < PLAYER_SIZE &&
    tries < 10
  );
  const color = SNIPPET_COLORS[Math.floor(Math.random() * SNIPPET_COLORS.length)];
  const snippet = {
    x,
    y,
    color,
    value: SNIPPET_VALUES[color],
    timer: Math.random() * 1000 + 2000, // 2-3 seconds
    created: Date.now(),
    id: Math.random().toString(36).substr(2, 9),
  };
  snippets.push(snippet);
  scheduleNextSnippet();
}

function scheduleNextSnippet() {
  if (!gameRunning) return;
  const delay = Math.random() * 400 + 800; // 0.8-1.2 seconds
  snippetSpawnTimeout = setTimeout(spawnSnippet, delay);
}

function updateSnippets(dt) {
  const now = Date.now();
  snippets = snippets.filter(snippet => {
    // Remove if timer expired
    return now - snippet.created < snippet.timer;
  });
}

function drawSnippets() {
  for (const snippet of snippets) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(snippet.x, snippet.y, SNIPPET_RADIUS, 0, Math.PI * 2);
    ctx.shadowColor = snippet.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = snippet.color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.restore();
  }
}

function checkSnippetCollision() {
  // Player center
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  let collected = false;
  snippets = snippets.filter(snippet => {
    const dx = px - snippet.x;
    const dy = py - snippet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < SNIPPET_RADIUS + PLAYER_SIZE / 2) {
      if (snippet.color === '#ff0033') {
        // Red snippet: freeze player
        player.frozen = true;
        player.freezeTimer = FREEZE_DURATION;
      } else {
        score += snippet.value;
        collected = true;
      }
      return false;
    }
    return true;
  });
  if (collected) updateScoreDisplay();
}

function gameLoop() {
  if (!gameRunning) return;
  clearCanvas();
  updatePlayer();
  updateSnippets();
  checkSnippetCollision();
  drawSnippets();
  drawPlayer();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  gameRunning = true;
  if (instructionsDiv) instructionsDiv.style.display = 'none';
  if (gameBox) gameBox.style.display = 'flex';
  if (gameOverScreen) gameOverScreen.style.display = 'none';
  timer = 30;
  timerDisplay.textContent = timer + ' seconds';
  player.x = GAME_WIDTH / 2 - PLAYER_SIZE / 2;
  player.y = GAME_HEIGHT / 2 - PLAYER_SIZE / 2;
  player.dx = 0;
  player.dy = 0;
  player.frozen = false;
  snippets = [];
  score = 0;
  updateScoreDisplay();
  if (timerInterval) clearInterval(timerInterval);
  if (snippetSpawnTimeout) clearTimeout(snippetSpawnTimeout);
  timerInterval = setInterval(() => {
    timer--;
    timerDisplay.textContent = timer > 0 ? timer + ' seconds' : 'GAME OVER';
    if (timer <= 0) {
      endGame();
    }
  }, 1000);
  scheduleNextSnippet();
  gameLoop();
}

function endGame() {
  gameRunning = false;
  clearInterval(timerInterval);
  clearTimeout(snippetSpawnTimeout);
  timerDisplay.textContent = 'GAME OVER';
  if (gameBox) gameBox.style.display = 'flex';
  if (gameOverScreen) {
    finalScore.textContent = `Dein Score: ${score}`;
    gameOverScreen.style.display = 'flex';
  }
}

// Keyboard controls
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (!player.frozen) {
    if (keys['arrowup'] || keys['w']) player.dy = -PLAYER_SPEED;
    if (keys['arrowdown'] || keys['s']) player.dy = PLAYER_SPEED;
    if (keys['arrowleft'] || keys['a']) player.dx = -PLAYER_SPEED;
    if (keys['arrowright'] || keys['d']) player.dx = PLAYER_SPEED;
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
  // Stop movement on keyup
  if (
    !keys['arrowup'] && !keys['w'] &&
    !keys['arrowdown'] && !keys['s']
  ) player.dy = 0;
  if (
    !keys['arrowleft'] && !keys['a'] &&
    !keys['arrowright'] && !keys['d']
  ) player.dx = 0;
});

startBtn.addEventListener('click', startGame);

if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    startGame();
  });
}

// Initial draw
clearCanvas();
drawPlayer(); 