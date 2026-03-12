(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreNode = document.getElementById("score");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");

  const WORLD_WIDTH = 360;
  const WORLD_HEIGHT = 640;

  const gravity = 0.04;
  const moveSpeed = 1.7;
  const jumpVelocity = -3.8;
  const maxFallSpeed = 1.5;
  const platformHeight = 12;
  const maxTilt = 0.32;
  const tiltLerp = 0.18;

  let running = false;
  let moveDir = 0;
  let score = 0;
  let bestHeight = 0;
  let animationId = null;

  const player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT - 100,
    w: 28,
    h: 28,
    vx: 0,
    vy: 0,
    tilt: 0,
    color: "#1d3557",
  };

  const platforms = [];

  function resizeCanvas() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.floor(WORLD_WIDTH * dpr);
    canvas.height = Math.floor(WORLD_HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createPlatform(y, stable = false) {
    const width = stable ? 84 : rand(56, 90);
    return {
      x: rand(0, WORLD_WIDTH - width),
      y,
      w: width,
      h: platformHeight,
      color: stable ? "#2fbf71" : "#37c978",
      drift: stable ? 0 : rand(-0.6, 0.6),
    };
  }

  function resetGame() {
    score = 0;
    bestHeight = 0;
    moveDir = 0;
    scoreNode.textContent = "0";

    player.x = WORLD_WIDTH / 2 - player.w / 2;
    player.y = WORLD_HEIGHT - 90;
    player.vx = 0;
    player.vy = jumpVelocity;
    player.tilt = 0;

    platforms.length = 0;

    let y = WORLD_HEIGHT - platformHeight;
    platforms.push({
      x: 0,
      y,
      w: WORLD_WIDTH,
      h: platformHeight,
      color: "#2fbf71",
      drift: 0,
    });
    for (let i = 0; i < 12; i += 1) {
      y -= rand(46, 72);
      platforms.push(createPlatform(y));
    }
  }

  function spawnPlatforms() {
    let highestY = Infinity;
    for (const p of platforms) {
      if (p.y < highestY) {
        highestY = p.y;
      }
    }

    while (highestY > -120) {
      highestY -= rand(48, 78);
      platforms.push(createPlatform(highestY));
    }

    for (let i = platforms.length - 1; i >= 0; i -= 1) {
      if (platforms[i].y > WORLD_HEIGHT + 40) {
        platforms.splice(i, 1);
      }
    }
  }

  function updatePlatforms() {
    for (const p of platforms) {
      if (p.drift !== 0) {
        p.x += p.drift;
        if (p.x <= 0 || p.x + p.w >= WORLD_WIDTH) {
          p.drift *= -1;
          p.x = Math.max(0, Math.min(WORLD_WIDTH - p.w, p.x));
        }
      }
    }
  }

  function applyInput() {
    player.vx = moveDir * moveSpeed;
  }

  function wrapPlayerX() {
    if (player.x > WORLD_WIDTH) {
      player.x = -player.w;
    } else if (player.x + player.w < 0) {
      player.x = WORLD_WIDTH;
    }
  }

  function platformCollision(prevY) {
    if (player.vy <= 0) {
      return;
    }

    const footPrev = prevY + player.h;
    const footNow = player.y + player.h;

    for (const p of platforms) {
      const wasAbove = footPrev <= p.y;
      const crossed = footNow >= p.y;
      const withinX = player.x + player.w > p.x + 4 && player.x < p.x + p.w - 4;

      if (wasAbove && crossed && withinX) {
        player.y = p.y - player.h;
        player.vy = jumpVelocity;
        return;
      }
    }
  }

  function applyWorldScroll() {
    const triggerY = WORLD_HEIGHT * 0.38;
    if (player.y < triggerY) {
      const delta = triggerY - player.y;
      player.y = triggerY;

      for (const p of platforms) {
        p.y += delta;
      }

      bestHeight += delta;
      score = Math.floor(bestHeight / 8);
      scoreNode.textContent = String(score);
    }
  }

  function checkGameOver() {
    if (player.y > WORLD_HEIGHT + 80) {
      stopGame();
      overlay.classList.add("visible");
      overlay.querySelector("h1").textContent = "Game Over";
      overlay.querySelector("p").textContent = `You scored ${score}. Tap start to jump again.`;
      overlay.querySelectorAll("p")[1].textContent = "Land on every platform to keep climbing.";
    }
  }

  function update() {
    applyInput();
    const prevY = player.y;

    player.vy = Math.min(player.vy + gravity, maxFallSpeed);
    player.x += player.vx;
    player.y += player.vy;
    const targetTilt = (player.vx / moveSpeed) * maxTilt;
    player.tilt += (targetTilt - player.tilt) * tiltLerp;

    wrapPlayerX();
    updatePlatforms();
    platformCollision(prevY);
    applyWorldScroll();
    spawnPlatforms();
    checkGameOver();
  }

  function drawBackground() {
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    for (let i = 0; i < 8; i += 1) {
      const x = (i * 57 + (bestHeight * 0.06) % 80) % (WORLD_WIDTH + 40) - 20;
      const y = (i * 84 + (bestHeight * 0.03) % 120) % (WORLD_HEIGHT + 70) - 35;
      ctx.beginPath();
      ctx.arc(x, y, 14 + (i % 3) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlatform(p) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.w, p.h);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(p.x + 4, p.y + 2, p.w - 8, 3);
  }

  function drawPlayer() {
    const halfW = player.w / 2;
    const halfH = player.h / 2;
    const centerX = player.x + halfW;
    const centerY = player.y + halfH;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(player.tilt);

    ctx.fillStyle = player.color;
    ctx.fillRect(-halfW, -halfH, player.w, player.h);

    ctx.fillStyle = "#ffb703";
    ctx.fillRect(-halfW + 6, -halfH + 8, 6, 6);
    ctx.fillRect(halfW - 12, -halfH + 8, 6, 6);

    ctx.fillStyle = "#e63946";
    ctx.fillRect(-halfW + 8, halfH - 7, player.w - 16, 4);

    ctx.restore();
  }

  function render() {
    drawBackground();

    for (const p of platforms) {
      drawPlatform(p);
    }

    drawPlayer();
  }

  function loop() {
    if (!running) {
      return;
    }

    update();
    render();
    animationId = requestAnimationFrame(loop);
  }

  function startGame() {
    resetGame();
    running = true;
    overlay.classList.remove("visible");
    animationId = requestAnimationFrame(loop);
  }

  function stopGame() {
    running = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function setMoveFromPoint(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    moveDir = x < rect.width / 2 ? -1 : 1;
  }

  canvas.addEventListener("touchstart", (event) => {
    event.preventDefault();
    const touch = event.changedTouches[0];
    setMoveFromPoint(touch.clientX);
  }, { passive: false });

  canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();
    const touch = event.changedTouches[0];
    setMoveFromPoint(touch.clientX);
  }, { passive: false });

  canvas.addEventListener("touchend", () => {
    moveDir = 0;
  });

  canvas.addEventListener("pointerdown", (event) => {
    setMoveFromPoint(event.clientX);
  });

  canvas.addEventListener("pointerup", () => {
    moveDir = 0;
  });

  canvas.addEventListener("pointerleave", () => {
    moveDir = 0;
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      moveDir = -1;
    } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      moveDir = 1;
    }
  });

  window.addEventListener("keyup", (event) => {
    if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(event.key)) {
      moveDir = 0;
    }
  });

  startBtn.addEventListener("click", () => {
    if (!running) {
      startGame();
    }
  });

  window.addEventListener("resize", resizeCanvas);

  resizeCanvas();
  resetGame();
  render();
})();
