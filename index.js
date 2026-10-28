// --- Persediaan Web Audio API Synth ---
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioCtx();
    }
}

function playSound(type) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'boost') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'crash') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'powerup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }
}

// --- Pilihan Kereta ---
const CAR_TYPES = [
    { name: "RED PHANTOM", color: "#e74c3c", accent: "#ff7979", speed: 1.0, handling: 6, class: "car-red" },
    { name: "CYBER VIPER", color: "#00d2d3", accent: "#54a0ff", speed: 1.2, handling: 8, class: "car-blue" },
    { name: "NEON FLASH", color: "#f1c40f", accent: "#ffeaa7", speed: 1.4, handling: 5, class: "car-yellow" }
];
let selectedCarIndex = 0;

// --- Tetapan Canvas & Permainan ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let isGameRunning = false;
let score = 0;
let coins = 0;
let speed = 5;
let baseSpeed = 5;
let fuel = 100;

// Jalan raya
const ROAD_MARGIN = 50;
const LANE_COUNT = 3;
let roadOffset = 0;

// Pemain
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 120,
    width: 40,
    height: 70,
    vx: 0,
    hasShield: false,
    isBoosting: false,
    boostTimer: 0
};

// Objek Musuh & Item
let enemies = [];
let items = [];
let particles = [];

// Kawalan Kunci
const keys = { Left: false, Right: false, Boost: false };

// --- DOM Elements ---
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const uiOverlay = document.getElementById('uiOverlay');
const scoreText = document.getElementById('scoreText');
const coinText = document.getElementById('coinText');
const speedText = document.getElementById('speedText');
const fuelBar = document.getElementById('fuelBar');
const shieldBadge = document.getElementById('shieldBadge');
const nosBadge = document.getElementById('nosBadge');

// --- Event Listeners ---
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

document.getElementById('prevCarBtn').addEventListener('click', () => changeCar(-1));
document.getElementById('nextCarBtn').addEventListener('click', () => changeCar(1));

function changeCar(dir) {
    selectedCarIndex = (selectedCarIndex + dir + CAR_TYPES.length) % CAR_TYPES.length;
    const car = CAR_TYPES[selectedCarIndex];
    
    document.getElementById('carName').innerText = car.name;
    document.getElementById('carStatSpeed').innerText = car.speed > 1.2 ? "Sangat Tinggi" : car.speed > 1.0 ? "Tinggi" : "Sederhana";
    document.getElementById('carStatHandling').innerText = car.handling > 6 ? "Tinggi" : "Sederhana";
    
    const preview = document.getElementById('carPreview');
    preview.className = `car-preview ${car.class}`;
}

// Kawalan Papan Kekunci
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.Left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.Right = true;
    if (e.key === ' ' || e.key === 'Shift') keys.Boost = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.Left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.Right = false;
    if (e.key === ' ' || e.key === 'Shift') keys.Boost = false;
});

// Kawalan Sentuhan Mobile
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnNos = document.getElementById('btnNos');

btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.Left = true; });
btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.Left = false; });
btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.Right = true; });
btnRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.Right = false; });
btnNos.addEventListener('touchstart', (e) => { e.preventDefault(); keys.Boost = true; });
btnNos.addEventListener('touchend', (e) => { e.preventDefault(); keys.Boost = false; });

// --- Logik Utama Permainan ---
function startGame() {
    initAudio();
    
    score = 0;
    coins = 0;
    fuel = 100;
    baseSpeed = 5 * CAR_TYPES[selectedCarIndex].speed;
    speed = baseSpeed;
    
    player.x = canvas.width / 2 - player.width / 2;
    player.hasShield = false;
    player.isBoosting = false;
    
    enemies = [];
    items = [];
    particles = [];
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    uiOverlay.classList.remove('hidden');
    
    isGameRunning = true;
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    isGameRunning = false;
    playSound('crash');
    
    document.getElementById('finalScore').innerText = Math.floor(score) + "m";
    document.getElementById('finalCoins').innerText = coins;
    
    uiOverlay.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

// Penjanaan Objek
function spawnEnemy() {
    const laneWidth = (canvas.width - ROAD_MARGIN * 2) / LANE_COUNT;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const x = ROAD_MARGIN + lane * laneWidth + (laneWidth - 40) / 2;
    
    const colors = ['#9b59b6', '#e67e22', '#2ecc71', '#34495e'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    enemies.push({
        x: x,
        y: -100,
        width: 40,
        height: 70,
        speed: Math.random() * 2 + 2,
        color: randomColor
    });
}

function spawnItem() {
    const laneWidth = (canvas.width - ROAD_MARGIN * 2) / LANE_COUNT;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const x = ROAD_MARGIN + lane * laneWidth + laneWidth / 2;
    
    const rand = Math.random();
    let type = 'coin';
    if (rand < 0.5) type = 'coin';
    else if (rand < 0.7) type = 'fuel';
    else if (rand < 0.85) type = 'shield';
    else type = 'boost';

    items.push({
        x: x,
        y: -50,
        radius: 12,
        type: type
    });
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            radius: Math.random() * 4 + 2,
            color: color,
            life: 30
        });
    }
}

// --- Kemaskini Fizik & Keadaan ---
function update() {
    // Pengurusan Kelajuan NOS & Fuel
    const currentHandling = CAR_TYPES[selectedCarIndex].handling;
    
    if (keys.Boost && fuel > 5) {
        if (!player.isBoosting) {
            playSound('boost');
            player.isBoosting = true;
        }
        speed = baseSpeed * 1.8;
        fuel -= 0.3;
        nosBadge.classList.remove('hidden');
    } else {
        player.isBoosting = false;
        speed = baseSpeed;
        nosBadge.classList.add('hidden');
    }

    fuel -= 0.05;
    if (fuel <= 0) {
        gameOver();
        return;
    }

    // Pergerakan Pemain
    if (keys.Left && player.x > ROAD_MARGIN) {
        player.x -= currentHandling;
    }
    if (keys.Right && player.x < canvas.width - ROAD_MARGIN - player.width) {
        player.x += currentHandling;
    }

    // Pergerakan Jalan
    roadOffset = (roadOffset + speed) % 40;
    score += speed * 0.05;

    // Tambah Kesukaran Mengikut Jarak
    baseSpeed = (5 + score * 0.002) * CAR_TYPES[selectedCarIndex].speed;

    // Penjanaan Objek Berkala
    if (Math.random() < 0.02) spawnEnemy();
    if (Math.random() < 0.015) spawnItem();

    // Kemaskini Objek Musuh
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.y += speed - e.speed;

        // Pengesanan Perlanggaran
        if (checkCollision(player, e)) {
            if (player.hasShield) {
                player.hasShield = false;
                shieldBadge.classList.add('hidden');
                createExplosion(e.x + e.width / 2, e.y + e.height / 2, '#00c8ff');
                enemies.splice(i, 1);
                playSound('crash');
                continue;
            } else {
                createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ff0055');
                gameOver();
                return;
            }
        }

        if (e.y > canvas.height + 100) enemies.splice(i, 1);
    }

    // Kemaskini Item
    for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        item.y += speed;

        // Pengesanan Kutipan Item
        let dist = Math.hypot((player.x + player.width / 2) - item.x, (player.y + player.height / 2) - item.y);
        if (dist < item.radius + player.width / 2) {
            if (item.type === 'coin') {
                coins += 1;
                playSound('coin');
            } else if (item.type === 'fuel') {
                fuel = Math.min(100, fuel + 30);
                playSound('powerup');
            } else if (item.type === 'shield') {
                player.hasShield = true;
                shieldBadge.classList.remove('hidden');
                playSound('powerup');
            } else if (item.type === 'boost') {
                fuel = Math.min(100, fuel + 15);
                playSound('boost');
            }
            items.splice(i, 1);
            continue;
        }

        if (item.y > canvas.height + 50) items.splice(i, 1);
    }

    // Kemaskini Partikel
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Kemaskini UI
    scoreText.innerText = Math.floor(score) + "m";
    coinText.innerText = coins;
    speedText.innerText = Math.floor(speed * 20) + " KM/H";
    fuelBar.style.width = Math.max(0, fuel) + "%";
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// --- Melukis Graffik (Render) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Lukis Jalan Raya Cyber
    ctx.fillStyle = '#111319';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sempadan Jalan Neon
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(ROAD_MARGIN - 5, 0, 5, canvas.height);
    ctx.fillRect(canvas.width - ROAD_MARGIN, 0, 5, canvas.height);

    // Garisan Lorong (Putus-putus)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = -roadOffset;

    const laneWidth = (canvas.width - ROAD_MARGIN * 2) / LANE_COUNT;
    for (let i = 1; i < LANE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(ROAD_MARGIN + i * laneWidth, 0);
        ctx.lineTo(ROAD_MARGIN + i * laneWidth, canvas.height);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Lukis Item
    items.forEach(item => {
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        
        if (item.type === 'coin') {
            ctx.fillStyle = '#f1c40f';
            ctx.shadowColor = '#f1c40f';
        } else if (item.type === 'fuel') {
            ctx.fillStyle = '#2ecc71';
            ctx.shadowColor = '#2ecc71';
        } else if (item.type === 'shield') {
            ctx.fillStyle = '#00c8ff';
            ctx.shadowColor = '#00c8ff';
        } else {
            ctx.fillStyle = '#ff0055';
            ctx.shadowColor = '#ff0055';
        }
        
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Lukis Musuh
    enemies.forEach(e => {
        drawCar(e.x, e.y, e.width, e.height, e.color, false);
    });

    // Lukis Pemain
    const carColor = CAR_TYPES[selectedCarIndex].color;
    drawCar(player.x, player.y, player.width, player.height, carColor, true);

    // Efek Perisai Pemain
    if (player.hasShield) {
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 45, 0, Math.PI * 2);
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00c8ff';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Lukis Partikel
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    });
}

function drawCar(x, y, width, height, color, isPlayer) {
    ctx.save();
    
    // Badan Kereta
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();

    // Cermin Depan / Bumbung
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 5, y + (isPlayer ? 15 : 35), width - 10, 15);

    // Lampu Kereta
    ctx.fillStyle = isPlayer ? '#66fcf1' : '#ff0055';
    const lightY = isPlayer ? y : y + height - 5;
    ctx.fillRect(x + 4, lightY, 8, 5);
    ctx.fillRect(x + width - 12, lightY, 8, 5);

    // Efek Ekzos NOS jika Memecut
    if (isPlayer && player.isBoosting) {
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 15;
        ctx.fillRect(x + 10, y + height, 6, 12);
        ctx.fillRect(x + width - 16, y + height, 6, 12);
    }

    ctx.restore();
}

// --- Loop Utama Permainan ---
function gameLoop() {
    if (!isGameRunning) return;
    
    update();
    draw();
    
    requestAnimationFrame(gameLoop);
}
