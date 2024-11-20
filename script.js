const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'start'; 
let gameOver = false;
let highScore = 0;

let backgroundImage = new Image();
let characterImage1 = new Image();
let characterImage2 = new Image();
let floorImage = new Image();
let explosionImage = new Image();

let animationFrame = 0;
let pHLevel = 7; 

const camera = {
  x: 15,
  y: 0,
  width: canvas.width,
  height: canvas.height,
  update: function() {
    this.x = player.x - this.width / 2;

    if (this.x < 0) {
      this.x = 0;
    }
  },
};

// Player Object
const player = {
  x: 50,
  y: canvas.height - 200,
  width: 30,
  height: 50,
  velocityX: 0,
  velocityY: 0,
  isJumping: false,
  speed: 4,
  jumpHeight: 12,
  score: 0,
  currentImage: null,
  explosionCounter: 0,
};

class Platform {
  constructor(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.coinsGenerated = false; 
  }

  draw() {
    ctx.fillStyle = this.color;

    const radius = 10;

    ctx.beginPath();
    ctx.moveTo(this.x + radius, this.y);
    ctx.lineTo(this.x + this.width - radius, this.y);
    ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + radius);
    ctx.lineTo(this.x + this.width, this.y + this.height - radius);
    ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - radius, this.y + this.height);
    ctx.lineTo(this.x + radius, this.y + this.height);
    ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - radius);
    ctx.lineTo(this.x, this.y + radius);
    ctx.quadraticCurveTo(this.x, this.y, this.x + radius, this.y);
    ctx.closePath();

    ctx.fill();

    ctx.strokeStyle = 'white'; 
    ctx.lineWidth = 2; 
    ctx.stroke(); 
  }
}

class Coin {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.rotation = 0;
  }

  draw() {
    this.rotation += 0.1;
    if (this.rotation >= Math.PI * 2) {
      this.rotation = 0;
    }

    const currentWidth = this.radius * (1 - 0.5 * Math.abs(Math.sin(this.rotation)));

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(
      this.x - camera.x,
      this.y,
      currentWidth,
      this.radius,
      0,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.fill();
  }
}

function loadAssets(callback) {
  backgroundImage.src = 'gamebackground2.png';
  backgroundImage.onload = function () {
    characterImage1.src = 'character1.png'; 
    characterImage1.onload = function () {
      characterImage2.src = 'character2.png'; 
      characterImage2.onload = function () {
        floorImage.src = 'lavafloor.png'; 
        floorImage.onload = function () {
          explosionImage.src = 'T-fireexplosion.png'; 
          explosionImage.onload = function () {
            callback();
          };
        };
      };
    };
  };
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const platforms = [];
const coins = [];

function generatePlatforms() {
  if (platforms.length === 0 || platforms[platforms.length - 1].x - camera.x < canvas.width - 200) {
    const platformWidth = 200;
    const platformHeight = 20;
    const platformColor = getRandomColor();
    let minHeight = canvas.height / 2;
    let maxHeight = canvas.height - 150;
    const minGap = 50;
    const maxGap = 200;

    const randomGap = Math.floor(Math.random() * (maxGap - minGap + 1) + minGap);
    const xPos = platforms.length === 0 ? player.x + randomGap : platforms[platforms.length - 1].x + platformWidth + randomGap;

    let yPos;
    if (platforms.length === 0) {
      yPos = player.y;
    } else {
      const lastPlatformHeight = platforms[platforms.length - 1].y;
      const reachableMinHeight = Math.max(minHeight, lastPlatformHeight - player.jumpHeight * 2);
      const reachableMaxHeight = Math.min(maxHeight, lastPlatformHeight + player.jumpHeight * 2);
      yPos = Math.floor(Math.random() * (reachableMaxHeight - reachableMinHeight + 1) + reachableMinHeight);
    }

    platforms.push(new Platform(xPos, yPos, platformWidth, platformHeight, platformColor));

    if (platforms.length === 1) {
      setPlayerPositionOnPlatform(platforms[0]);
    }

    generateCoins();
  }
}

function generateCoins() {
  platforms.forEach((platform) => {
    if (!platform.coinsGenerated) {
      const numberOfCoins = Math.floor(Math.random() * 4) + 1; // 1 to 4 coins
      const coinSpacing = platform.width / (numberOfCoins + 1);

      for (let i = 0; i < numberOfCoins; i++) {
        const coinX = platform.x + coinSpacing * (i + 1);
        const coinY = platform.y - 25;
        // Determine coin color based on type
        const isHeavyMetal = Math.random() < 0.5; // 50% chance
        const coinColor = isHeavyMetal ? 'gray' : 'white'; // Gray for heavy metals, white for limestone
        coins.push(new Coin(coinX, coinY, 10, coinColor));
      }
      platform.coinsGenerated = true;
    }
  });
}

function setPlayerPositionOnPlatform(platform) {
  player.x = platform.x;
  player.y = platform.y - player.height;
}

const keys = {};

window.addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  keys[event.code] = true;
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

// Function to Handle Horizontal Player Movement
function handlePlayerMovement() {
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.x -= player.speed;
    player.velocityX = -player.speed;
  } else if (keys['ArrowRight'] || keys['KeyD']) {
    player.x += player.speed;
    player.velocityX = player.speed;
  } else {
    player.velocityX = 0;
  }

  // Prevent the player from going off the screen to the left
  if (player.x < 0) {
    player.x = 0;
  }
}

// Function to Handle Vertical Player Movement (Gravity and Jumping)
function handlePlayerVerticalMovement() {
  // Apply gravity
  player.velocityY += 0.5;
  player.y += player.velocityY;

  let onPlatform = false;
  const floorHeight = 50;

  // Check collision with the floor
  if (player.y + player.height >= canvas.height - floorHeight) {
    onPlatform = true;
    player.y = canvas.height - player.height - floorHeight;
    player.velocityY = 0;
  }

  // Check collision with platforms
  platforms.forEach((platform) => {
    if (
      player.x < platform.x + platform.width &&
      player.x + player.width > platform.x &&
      player.y + player.height >= platform.y - 5 &&
      player.y + player.height <= platform.y + platform.height
    ) {
      onPlatform = true;
      player.y = platform.y - player.height;
      player.velocityY = 0;
    }
  });

  // Handle jumping
  if (
    (keys['Space'] || keys['ArrowUp'] || keys['KeyW']) &&
    onPlatform &&
    !player.isJumping
  ) {
    player.velocityY = -player.jumpHeight;
    player.isJumping = true;
  }
}

function detectPlatformCollision() {
  const prevY = player.y - player.velocityY;
  let onPlatform = false;

  platforms.forEach((platform) => {
    // Check vertical collision first
    if (
      player.x < platform.x + platform.width &&
      player.x + player.width > platform.x
    ) {
      // Collision on the top side of the platform
      if (
        prevY + player.height <= platform.y &&
        player.y + player.height >= platform.y &&
        player.velocityY >= 0
      ) {
        player.y = platform.y - player.height;
        player.velocityY = 0;
        onPlatform = true;
      }
      // Collision on the bottom side of the platform
      else if (
        prevY >= platform.y + platform.height &&
        player.y <= platform.y + platform.height
      ) {
        player.y = platform.y + platform.height;
        player.velocityY = 0;
      }
    }

    // Check horizontal collision
    if (
      player.y + player.height > platform.y &&
      player.y < platform.y + platform.height
    ) {
      // Collision on the left side of the platform
      if (
        player.x + player.width >= platform.x &&
        player.x + player.width <= platform.x + 5
      ) {
        player.x = platform.x - player.width;
      }
      // Collision on the right side of the platform
      else if (
        player.x <= platform.x + platform.width &&
        player.x >= platform.x + platform.width - 5
      ) {
        player.x = platform.x + platform.width;
      }
    }
  });

  if (onPlatform) {
    player.isJumping = false;
  }
}

// Function to Detect Coin Collision
function detectCoinCollision() {
  coins.forEach((coin, index) => {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const distance = Math.sqrt((playerCenterX - coin.x) ** 2 + (playerCenterY - coin.y) ** 2);
    if (distance < player.width / 2 + coin.radius) {
      if (coin.color === 'white') {
        player.score += 1; // Limestone increases pH level
        pHLevel += 0.1; // Increase pH level
      } else {
        player.score -= 1; // Heavy metals decrease pH level
        pHLevel -= 0.1; // Decrease pH level
        if (pHLevel < 0) pHLevel = 0; // Clamp pH level
      }
      coins.splice(index, 1);
    }
  });
}

// Function to Check Ground Collision (Redundant if handled in Vertical Movement)
function checkGroundCollision() {
  const floorHeight = 50;

  if (player.y + player.height > canvas.height - floorHeight) {
    player.y = canvas.height - player.height - floorHeight;
    player.velocityY = 0;
  }
}

// Function to Reset the Game
function resetGame() {
  gameOver = false;
  gameState = 'start'; 
  player.x = 50;
  player.y = canvas.height - 200;
  player.velocityX = 0;
  player.velocityY = 0;
  player.score = 0;
  pHLevel = 7; 
  camera.x = 0;
  platforms.length = 0;
  coins.length = 0;
  generatePlatforms();
  player.explosionCounter = 0;
}

function startGame() {
  gameState = 'playing';
  gameOver = false;
  pHLevel = 7; 
  player.score = 0;
  player.explosionCounter = 0;
  camera.x = 2;
  platforms.length = 0;
  coins.length = 0;
  generatePlatforms();
}

function update() {
  if (gameState === 'playing' && !gameOver) {
    handlePlayerVerticalMovement();
    detectPlatformCollision();
    checkGroundCollision();
    detectCoinCollision();

    let onPlatform = false;
    platforms.forEach((platform) => {
      if (
        player.x < platform.x + platform.width &&
        player.x + player.width > platform.x &&
        player.y + player.height === platform.y
      ) {
        onPlatform = true;
      }
    });
    player.isJumping = !onPlatform;

    const prevX = player.x; 
    handlePlayerMovement();
    generateCoins();
    detectCoinCollision();

    player.velocityX = player.x - prevX;

    camera.update();

    if (player.isJumping) {
      player.currentImage = characterImage1;
      animationFrame = 0; 
    } else {
      if (keys['ArrowLeft'] || keys['KeyA'] || keys['ArrowRight'] || keys['KeyD']) {
        animationFrame++;
      } else {
        animationFrame = 0; 
      }
      if (animationFrame % 20 < 10) {
        player.currentImage = characterImage1;
      } else {
        player.currentImage = characterImage2;
      }
    }

    generatePlatforms();
  }

  if (pHLevel <= 0 && gameState === 'playing') {
    gameOver = true;
    gameState = 'gameOver';
    if (player.score > highScore) {
      highScore = player.score;
    }
  }

  if (player.y + player.height >= canvas.height - 50 && gameState === 'playing') {
    gameOver = true;
    gameState = 'gameOver';
    if (player.score > highScore) {
      highScore = player.score;
    }
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === 'start') {
    drawStartScreen();
  } else {
    drawBackground();

    ctx.save();
    ctx.translate(-camera.x, 0);
    platforms.forEach((platform) => platform.draw());
    drawFloor();
    ctx.restore();
    coins.forEach((coin) => coin.draw());

    drawCharacter();

    drawScoreBox();
    drawHighScoreBox();
    drawPHLevelBox();

    if (gameState === 'gameOver') {
      drawGameOverAndReset();
    }
  }
}

function drawCharacter() {
  const characterHeight = player.height;
  const characterWidth = (characterImage1.width / characterImage1.height) * characterHeight;

  if (!gameOver) {
    ctx.save();
    ctx.translate(-camera.x, 0);

    if (player.velocityX < 0) {
      ctx.scale(-1, 1);
      ctx.drawImage(
        player.currentImage,
        -player.x - characterWidth + characterWidth,
        player.y,
        -characterWidth,
        characterHeight
      );
    } else {
      ctx.drawImage(
        player.currentImage,
        player.x,
        player.y,
        characterWidth,
        characterHeight
      );
    }

    ctx.restore();
  }

  if (gameState === 'gameOver' && player.explosionCounter < 50) {
    const explosionWidth = characterWidth * 2;
    const explosionHeight = characterHeight * 2;

    ctx.save();
    ctx.translate(-camera.x, 0);
    ctx.drawImage(
      explosionImage,
      player.x - (explosionWidth - characterWidth) / 2,
      player.y - (explosionHeight - characterHeight) / 2,
      explosionWidth,
      explosionHeight
    );
    ctx.restore();

    player.explosionCounter++;
  }
}

function drawFloor() {
  const tileWidth = floorImage.width;
  const tileHeight = floorImage.height;
  const numTiles = Math.ceil(canvas.width / tileWidth) + 1;

  const startX = Math.floor(camera.x / tileWidth) * tileWidth;

  for (let i = 0; i < numTiles; i++) {
    ctx.drawImage(
      floorImage,
      startX + i * tileWidth,
      canvas.height - 50,
      tileWidth,
      tileHeight
    );
  }
}

function drawScoreBox() {
  drawRoundedRect(5, 5, 150, 35, 5, 'white', 'black', 3);
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  
  ctx.fillText(`Score: ${player.score}`, 70, 30);
}

function drawHighScoreBox() {
  drawRoundedRect(canvas.width - 185, 5, 180, 35, 5, 'white', 'black', 3);
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  
  ctx.fillText(`High Score: ${highScore}`, canvas.width - 100, 30);
}

function drawPHLevelBox() {
  drawRoundedRect(5, 45, 200, 35, 5, 'white', 'black', 3);
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  
  ctx.fillText(`pH Level: ${pHLevel.toFixed(1)}`, 90, 70);
}

function drawGameOverAndReset() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'red';
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 50);

  const buttonWidth = 120;
  const buttonHeight = 40;
  const buttonX = canvas.width / 2 - buttonWidth / 2;
  const buttonY = canvas.height / 2 + 20;

  ctx.fillStyle = '#4CAF50'; // Green color
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

  ctx.fillStyle = 'white';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Reset', canvas.width / 2, buttonY + 28);
}

function drawStartScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.font = '36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Hello! Welcome to our game', canvas.width / 2, canvas.height / 2 - 150);

  ctx.font = '24px Arial';
  ctx.fillText('Before you begin, a few things to know:', canvas.width / 2, canvas.height / 2 - 100);

  ctx.font = '20px Arial';
  ctx.textAlign = 'left';
  const bulletPoints = [
    '• You are a water droplet.',
    '• You are trying to avoid the gray coins because those are',
    '  heavy metals like iron that will lower your pH level.',
    '• You are trying to collect the white coins because they are limestone',
    '  and will increase your pH level.',
    '• You want to try to increase your pH level as much as possible.'
  ];

  const startX = canvas.width / 2 - 250;
  let startY = canvas.height / 2 - 60;
  bulletPoints.forEach(point => {
    ctx.fillText(point, startX, startY);
    startY += 40;
  });

  const buttonWidth = 120;
  const buttonHeight = 40;
  const buttonX = canvas.width / 2 - buttonWidth / 2;
  
  const buttonY = startY + 40; // Increased spacing from +20 to +40

  ctx.fillStyle = '#4CAF50'; // Green color
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

  ctx.fillStyle = 'white';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Start', canvas.width / 2, buttonY + 28);
}

function drawBackground() {
  const scale = canvas.height / backgroundImage.height;
  const scaledWidth = backgroundImage.width * scale;
  const numImages = Math.ceil(canvas.width / scaledWidth) + 1;

  let offsetX = (camera.x * 0.5) % scaledWidth;
  for (let i = 0; i < numImages; i++) {
    ctx.drawImage(backgroundImage, i * scaledWidth - offsetX, 0, scaledWidth, canvas.height);
  }
}

function drawRoundedRect(x, y, width, height, radius, fillColor, borderColor, borderWidth) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  if (borderColor && borderWidth) {
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  }
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', (event) => {
  if (gameState === 'start') {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonX = canvas.width / 2 - buttonWidth / 2;

    const buttonY = canvas.height / 2 - 60 + 6 * 40 + 40;

    if (
      clickX >= buttonX &&
      clickX <= buttonX + buttonWidth &&
      clickY >= buttonY &&
      clickY <= buttonY + buttonHeight
    ) {
      startGame();
    }
  } else if (gameState === 'gameOver') {
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = canvas.height / 2 + 20;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    if (
      clickX >= buttonX &&
      clickX <= buttonX + buttonWidth &&
      clickY >= buttonY &&
      clickY <= buttonY + buttonHeight
    ) {
      resetGame();
    }
  }
});

window.addEventListener('keydown', (event) => {
  if (gameState === 'start' && (event.code === 'Space' || event.code === 'Enter')) {
    startGame();
  }
});

generatePlatforms();
loadAssets(function() {
  gameLoop();
});
