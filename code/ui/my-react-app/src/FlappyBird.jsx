import { useEffect, useRef, useState, useCallback } from 'react';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const BIRD_SIZE = 30;
const BIRD_X = 80;
const GRAVITY = 0.5;
const JUMP_FORCE = -8;
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const PIPE_SPEED = 3;
const PIPE_SPAWN_INTERVAL = 1800;

function FlappyBird() {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const lastPipeSpawnRef = useRef(0);
  const [gameState, setGameState] = useState('idle'); // idle, playing, gameover
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('flappyHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const birdRef = useRef({ y: GAME_HEIGHT / 2, velocity: 0 });
  const pipesRef = useRef([]);
  const scoreRef = useRef(0);
  const gameStateRef = useRef('idle');
  const scaleRef = useRef(1);

  // Keep refs in sync with state
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const jump = useCallback(() => {
    if (gameStateRef.current === 'idle') {
      setGameState('playing');
      gameStateRef.current = 'playing';
      birdRef.current = { y: GAME_HEIGHT / 2, velocity: JUMP_FORCE };
      pipesRef.current = [];
      scoreRef.current = 0;
      setScore(0);
      lastPipeSpawnRef.current = 0;
    } else if (gameStateRef.current === 'playing') {
      birdRef.current.velocity = JUMP_FORCE;
    } else if (gameStateRef.current === 'gameover') {
      setGameState('idle');
      gameStateRef.current = 'idle';
      birdRef.current = { y: GAME_HEIGHT / 2, velocity: 0 };
      pipesRef.current = [];
      scoreRef.current = 0;
      setScore(0);
    }
  }, []);

  const spawnPipe = useCallback(() => {
    const minTop = 60;
    const maxTop = GAME_HEIGHT - PIPE_GAP - 60;
    const topHeight = Math.random() * (maxTop - minTop) + minTop;
    pipesRef.current.push({
      x: GAME_WIDTH,
      topHeight,
      scored: false,
    });
  }, []);

  // Handle input
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump]);

  // Canvas scaling for crisp rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const scaleX = containerWidth / GAME_WIDTH;
      const scaleY = containerHeight / GAME_HEIGHT;
      const scale = Math.min(scaleX, scaleY);
      scaleRef.current = scale;

      canvas.style.width = `${GAME_WIDTH * scale}px`;
      canvas.style.height = `${GAME_HEIGHT * scale}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Handle touch/click on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouch = (e) => {
      e.preventDefault();
      jump();
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('mousedown', handleTouch);

    return () => {
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('mousedown', handleTouch);
    };
  }, [jump]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const drawBird = (y) => {
      // Body
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.ellipse(BIRD_X, y, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#DAA520';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Wing
      const wingFlap = Math.sin(Date.now() / 80) * 4;
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      ctx.ellipse(BIRD_X - 5, y + wingFlap, 10, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(BIRD_X + 8, y - 5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(BIRD_X + 10, y - 5, 3, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#FF6347';
      ctx.beginPath();
      ctx.moveTo(BIRD_X + 14, y);
      ctx.lineTo(BIRD_X + 24, y + 3);
      ctx.lineTo(BIRD_X + 14, y + 6);
      ctx.closePath();
      ctx.fill();
    };

    const drawPipe = (pipe) => {
      const grad1 = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      grad1.addColorStop(0, '#2E8B57');
      grad1.addColorStop(0.5, '#3CB371');
      grad1.addColorStop(1, '#2E8B57');

      // Top pipe
      ctx.fillStyle = grad1;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      // Top pipe cap
      ctx.fillStyle = '#228B22';
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 25, PIPE_WIDTH + 10, 25);
      ctx.strokeStyle = '#1B5E20';
      ctx.lineWidth = 2;
      ctx.strokeRect(pipe.x - 5, pipe.topHeight - 25, PIPE_WIDTH + 10, 25);

      // Bottom pipe
      const bottomY = pipe.topHeight + PIPE_GAP;
      ctx.fillStyle = grad1;
      ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, GAME_HEIGHT - bottomY);
      // Bottom pipe cap
      ctx.fillStyle = '#228B22';
      ctx.fillRect(pipe.x - 5, bottomY, PIPE_WIDTH + 10, 25);
      ctx.strokeStyle = '#1B5E20';
      ctx.lineWidth = 2;
      ctx.strokeRect(pipe.x - 5, bottomY, PIPE_WIDTH + 10, 25);
    };

    const drawBackground = () => {
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      skyGrad.addColorStop(0, '#87CEEB');
      skyGrad.addColorStop(0.7, '#B0E0E6');
      skyGrad.addColorStop(1, '#90EE90');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      const cloudOffset = (Date.now() / 50) % (GAME_WIDTH + 200);
      drawCloud(ctx, (100 - cloudOffset + GAME_WIDTH + 200) % (GAME_WIDTH + 200) - 100, 80);
      drawCloud(ctx, (300 - cloudOffset + GAME_WIDTH + 200) % (GAME_WIDTH + 200) - 100, 140);
      drawCloud(ctx, (500 - cloudOffset + GAME_WIDTH + 200) % (GAME_WIDTH + 200) - 100, 60);

      // Ground
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);
      ctx.fillStyle = '#7CCD7C';
      ctx.fillRect(0, GAME_HEIGHT - 25, GAME_WIDTH, 8);
    };

    const drawCloud = (ctx, x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.arc(x + 25, y - 10, 25, 0, Math.PI * 2);
      ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
      ctx.arc(x + 25, y + 5, 18, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawScore = () => {
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText(scoreRef.current, GAME_WIDTH / 2, 60);
      ctx.fillText(scoreRef.current, GAME_WIDTH / 2, 60);
    };

    const drawIdleScreen = () => {
      drawBackground();
      drawBird(GAME_HEIGHT / 2 + Math.sin(Date.now() / 300) * 15);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 4;
      ctx.font = 'bold 52px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText('Flappy Bird', GAME_WIDTH / 2, GAME_HEIGHT / 3);
      ctx.fillText('Flappy Bird', GAME_WIDTH / 2, GAME_HEIGHT / 3);

      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.font = 'bold 22px Arial';
      ctx.strokeText('Tap or Press Space', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
      ctx.fillText('Tap or Press Space', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);

      if (highScore > 0) {
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.strokeText(`Best: ${highScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);
        ctx.fillText(`Best: ${highScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);
      }
    };

    const drawGameOver = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = '#FF4444';
      ctx.strokeStyle = '#8B0000';
      ctx.lineWidth = 4;
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText('Game Over', GAME_WIDTH / 2, GAME_HEIGHT / 3);
      ctx.fillText('Game Over', GAME_WIDTH / 2, GAME_HEIGHT / 3);

      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.font = 'bold 32px Arial';
      ctx.strokeText(`Score: ${scoreRef.current}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
      ctx.fillText(`Score: ${scoreRef.current}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);

      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.strokeText(`Best: ${localStorage.getItem('flappyHighScore') || 0}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
      ctx.fillText(`Best: ${localStorage.getItem('flappyHighScore') || 0}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);

      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px Arial';
      ctx.strokeText('Tap to Restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90);
      ctx.fillText('Tap to Restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90);
    };

    const checkCollision = (bird, pipes) => {
      const birdTop = bird.y - BIRD_SIZE / 2;
      const birdBottom = bird.y + BIRD_SIZE / 2;
      const birdLeft = BIRD_X - BIRD_SIZE / 2;
      const birdRight = BIRD_X + BIRD_SIZE / 2;

      // Ground and ceiling
      if (birdBottom >= GAME_HEIGHT - 25 || birdTop <= 0) return true;

      for (const pipe of pipes) {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + PIPE_WIDTH;

        if (birdRight > pipeLeft && birdLeft < pipeRight) {
          if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + PIPE_GAP) {
            return true;
          }
        }
      }
      return false;
    };

    let lastTime = 0;

    const gameLoop = (timestamp) => {
      const deltaTime = lastTime ? (timestamp - lastTime) / 16.67 : 1;
      lastTime = timestamp;

      const state = gameStateRef.current;

      if (state === 'idle') {
        drawIdleScreen();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (state === 'playing') {
        // Update bird
        birdRef.current.velocity += GRAVITY * deltaTime;
        birdRef.current.y += birdRef.current.velocity * deltaTime;

        // Spawn pipes
        if (!lastPipeSpawnRef.current || timestamp - lastPipeSpawnRef.current > PIPE_SPAWN_INTERVAL) {
          spawnPipe();
          lastPipeSpawnRef.current = timestamp;
        }

        // Update pipes
        pipesRef.current = pipesRef.current.filter(pipe => {
          pipe.x -= PIPE_SPEED * deltaTime;

          // Score
          if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.scored = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }

          return pipe.x > -PIPE_WIDTH;
        });

        // Check collision
        if (checkCollision(birdRef.current, pipesRef.current)) {
          gameStateRef.current = 'gameover';
          setGameState('gameover');

          if (scoreRef.current > highScore) {
            setHighScore(scoreRef.current);
            localStorage.setItem('flappyHighScore', scoreRef.current.toString());
          }
        }
      }

      // Draw
      drawBackground();
      pipesRef.current.forEach(drawPipe);
      drawBird(birdRef.current.y);
      drawScore();

      if (state === 'gameover') {
        drawGameOver();
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [highScore, spawnPipe]);

  return (
    <div className="game-wrapper">
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="game-canvas"
      />
    </div>
  );
}

export default FlappyBird;
