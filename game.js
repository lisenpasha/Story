const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const heatEl = document.getElementById('heat');
const timeEl = document.getElementById('time');
const restartBtn = document.getElementById('restart');

const world = {
  width: 2200,
  height: 1400,
  cell: 100,
};

const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const random = (min, max) => Math.random() * (max - min) + min;

let state;

function resetState() {
  const cops = Array.from({ length: 7 }, () => ({
    x: random(100, world.width - 100),
    y: random(100, world.height - 100),
    speed: random(1.2, 2),
  }));

  state = {
    camera: { x: 0, y: 0 },
    player: {
      x: world.width / 2,
      y: world.height / 2,
      angle: 0,
      speed: 0,
      maxSpeed: 6,
      health: 100,
    },
    checkpoint: spawnCheckpoint(),
    cops,
    score: 0,
    heat: 0,
    time: 120,
    gameOver: false,
    win: false,
  };
}

function spawnCheckpoint() {
  return {
    x: random(120, world.width - 120),
    y: random(120, world.height - 120),
    r: 30,
  };
}

function update(dt) {
  if (state.gameOver) return;

  const p = state.player;
  const left = keys.has('a') || keys.has('arrowleft');
  const right = keys.has('d') || keys.has('arrowright');
  const up = keys.has('w') || keys.has('arrowup');
  const down = keys.has('s') || keys.has('arrowdown');
  const brakeBoost = keys.has(' ');

  if (left) p.angle -= 0.07;
  if (right) p.angle += 0.07;
  if (up) p.speed += 0.2;
  if (down) p.speed -= 0.25;

  p.speed *= brakeBoost ? 0.96 : 0.985;
  const top = brakeBoost ? p.maxSpeed * 1.25 : p.maxSpeed;
  p.speed = Math.max(-2.5, Math.min(top, p.speed));

  p.x += Math.cos(p.angle) * p.speed;
  p.y += Math.sin(p.angle) * p.speed;

  if (p.x < 30 || p.x > world.width - 30 || p.y < 30 || p.y > world.height - 30) {
    p.health -= 18 * dt;
    p.x = Math.min(world.width - 30, Math.max(30, p.x));
    p.y = Math.min(world.height - 30, Math.max(30, p.y));
    p.speed *= -0.45;
  }

  const cp = state.checkpoint;
  const dcp = Math.hypot(p.x - cp.x, p.y - cp.y);
  if (dcp < cp.r + 16) {
    state.score += 150;
    state.heat = Math.min(5, state.heat + 1);
    p.health = Math.min(100, p.health + 8);
    state.checkpoint = spawnCheckpoint();
  }

  for (const cop of state.cops) {
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speedMul = 1 + state.heat * 0.13;
    cop.x += (dx / dist) * cop.speed * speedMul;
    cop.y += (dy / dist) * cop.speed * speedMul;

    if (dist < 30) {
      p.health -= (7 + state.heat * 2.3) * dt;
      p.speed *= 0.96;
    }
  }

  state.time -= dt;
  if (state.time <= 0) {
    state.gameOver = true;
    state.win = state.score >= 1200;
  }

  if (p.health <= 0) {
    p.health = 0;
    state.gameOver = true;
    state.win = false;
  }

  state.camera.x = p.x - canvas.width / 2;
  state.camera.y = p.y - canvas.height / 2;
  state.camera.x = Math.max(0, Math.min(world.width - canvas.width, state.camera.x));
  state.camera.y = Math.max(0, Math.min(world.height - canvas.height, state.camera.y));

  scoreEl.textContent = `${state.score}`;
  healthEl.textContent = `${Math.round(p.health)}`;
  heatEl.textContent = `${state.heat}`;
  timeEl.textContent = `${Math.max(0, Math.ceil(state.time))}`;
}

function drawRoadGrid() {
  for (let x = 0; x <= world.width; x += world.cell) {
    ctx.strokeStyle = x % 400 === 0 ? '#3e498f' : '#252d58';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y <= world.height; y += world.cell) {
    ctx.strokeStyle = y % 400 === 0 ? '#3e498f' : '#252d58';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
}

function drawCar(x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.fillRect(-14, -9, 28, 18);
  ctx.fillStyle = '#0d1020';
  ctx.fillRect(6, -5, 6, 10);
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);

  ctx.fillStyle = '#11173a';
  ctx.fillRect(0, 0, world.width, world.height);
  drawRoadGrid();

  const cp = state.checkpoint;
  ctx.beginPath();
  ctx.arc(cp.x, cp.y, cp.r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(29,229,255,0.2)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#1de5ff';
  ctx.stroke();

  for (const cop of state.cops) {
    drawCar(cop.x, cop.y, Math.atan2(state.player.y - cop.y, state.player.x - cop.x), '#ff7b54');
  }

  drawCar(state.player.x, state.player.y, state.player.angle, '#ff5faf');

  ctx.restore();

  if (state.gameOver) {
    ctx.fillStyle = 'rgba(8,10,22,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '700 44px Inter, sans-serif';
    ctx.fillText(state.win ? 'MISSION PASSED' : 'WASTED', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillStyle = '#d5ddff';
    ctx.fillText(`Final score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillText('Press Restart Run to play again', canvas.width / 2, canvas.height / 2 + 65);
  }
}

let last = performance.now();
function gameLoop(now) {
  const dt = Math.min(0.04, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

restartBtn.addEventListener('click', () => {
  resetState();
  last = performance.now();
});

resetState();
requestAnimationFrame(gameLoop);
