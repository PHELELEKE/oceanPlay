// ===================================================
// OCEAN RESCUE - 3D GAME (UPGRADED EDITION)
// Graphics: God rays, procedural textures, swaying coral, glow effects,
//           distortion ripple, sparkle particles
// Gameplay: Oxygen stations, chest open animation, shark warning,
//           octopus ink, minimap, rideable turtles, high score
// UI: Power-up timers, oxygen color, starfish radar, score breakdown
// ===================================================

// ===== GLOBAL VARIABLES =====
let scene, camera, renderer, clock;
let diver, ocean;
let starfish = [], pearls = [], sharks = [], jellyfish = [], bubbles = [], coral = [];
let tropicalFish = [], seaTurtles = [], dolphins = [], octopus = [], treasureChests = [];
let oxygenStations = [];
let magnetCollectCount = 0;
let magnetActiveFlag = false;
let ridingTurtle = null;
let sharkWarningSound = null;

// God ray variables
let godRays = [];
let godRayGroup = null;

// Sparkle particle pool
let sparkleParticles = [];

// Distortion overlay
let distortionOverlay = null;
let distortionTime = 0;

// Power-up variables
let powerUps = [];
let activePowerUps = {
    speedBoost: { active: false, endTime: 0 },
    shield: { active: false, endTime: 0 },
    sonar: { active: false, endTime: 0 },
    magnet: { active: false, endTime: 0 }
};
let originalDiverSpeed = 15;
let currentDiverSpeed = 15;

// Sound system
let audioContext;
let musicGain = null;
let heartbeatInterval = null;
let backgroundAudio = null;
let isMusicPlaying = false;

let sounds = {
    collect: null, hit: null, gameOver: null, victory: null,
    sharkBite: null, tension: null, powerUp: null, treasure: null,
    dolphin: null, oxygenRefill: null, chestOpen: null, sharkWarning: null
};
let soundEnabled = true;
let masterGain = null;

// Chase timer - FIXED: 10 seconds chase, 5 seconds rest
let chaseTimer = 0;
let isChaseActive = false;
const CHASE_DURATION = 10;   // Chase for 10 seconds
const REST_DURATION = 5;     // Rest for 5 seconds (total cycle = 15 seconds)

// High score
let highScore = parseInt(localStorage.getItem('oceanRescueHighScore') || '0');
let sessionScores = JSON.parse(localStorage.getItem('oceanRescueScores') || '[]');

let gameState = {
    score: 0, timeLeft: 180, oxygen: 100,
    starfishCollected: 0, targetStarfish: 10,
    difficulty: 'easy', isPlaying: false,
    isGameOver: false, isVictory: false,
    hitCooldown: 0, combo: 0, lastCollectTime: 0,
    pearlsCollected: 0, treasuresCollected: 0,
    checkpoint: null
};

const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
let diverSpeed = 15;
let timerInterval;

// Camera
let mouseX = 0, mouseY = 0;
let targetRotationX = 0, targetRotationY = 0;
let currentRotationX = 0, currentRotationY = 0;
let mouseLookEnabled = false;
let cameraDistance = 12;
let cameraHeight = 5;

// Controller
let gamepadConnected = false;
let gamepadMoveX = 0, gamepadMoveZ = 0, gamepadAscend = 0;
let gamepadLookX = 0, gamepadLookY = 0;

// Visual effect variables
let causticLights = [];
let bubbleTrail = [];
let lastBubbleTime = 0;

// ===== PROCEDURAL TEXTURE GENERATORS =====
function makeSandTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < 256; i++) {
        for (let j = 0; j < 256; j++) {
            const noise = Math.random() * 30;
            const base = 180 + noise;
            ctx.fillStyle = `rgb(${base + 14},${base + 2},${Math.floor(base * 0.6)})`;
            ctx.fillRect(i, j, 1, 1);
        }
    }
    for (let k = 0; k < 120; k++) {
        const x = Math.random() * 256, y = Math.random() * 256;
        const r = Math.random() * 4 + 1;
        const shade = Math.floor(Math.random() * 60 + 120);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${shade},${shade - 10},${shade - 40})`;
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
}

function makeCoralTexture(hexColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const r = (hexColor >> 16) & 255;
    const g = (hexColor >> 8) & 255;
    const b = hexColor & 255;
    for (let i = 0; i < 64; i++) {
        for (let j = 0; j < 64; j++) {
            const n = Math.random() * 40 - 20;
            ctx.fillStyle = `rgb(${Math.min(255, r + n)},${Math.min(255, g + n)},${Math.min(255, b + n)})`;
            ctx.fillRect(i, j, 1, 1);
        }
    }
    return new THREE.CanvasTexture(canvas);
}

function makeSkinTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffccaa';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * 64, y = Math.random() * 64;
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,140,100,${Math.random() * 0.3})`;
        ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
}

function makeRockTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < 64; i++) {
        for (let j = 0; j < 64; j++) {
            const n = Math.random() * 40;
            const v = 80 + n;
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(i, j, 1, 1);
        }
    }
    return new THREE.CanvasTexture(canvas);
}

// ===== SOUND SYSTEM =====
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.6;
        masterGain.connect(audioContext.destination);
        musicGain = audioContext.createGain();
        musicGain.gain.value = 0.35;
        musicGain.connect(masterGain);

        sounds.collect = () => playTone(880, 0.15, 'sine', 0.45);
        sounds.hit = () => playTone(220, 0.25, 'sawtooth', 0.55);
        sounds.gameOver = () => playTone(150, 0.6, 'sawtooth', 0.6);
        sounds.sharkBite = () => {
            playTone(100, 0.35, 'sawtooth', 0.7);
            setTimeout(() => playTone(80, 0.55, 'sawtooth', 0.6), 150);
        };
        sounds.tension = () => playTone(440, 0.08, 'square', 0.35);
        sounds.powerUp = () => {
            playTone(880, 0.1, 'sine', 0.5);
            setTimeout(() => playTone(1046.5, 0.2, 'sine', 0.5), 100);
        };
        sounds.treasure = () => {
            playTone(523.25, 0.15, 'sine', 0.5);
            setTimeout(() => playTone(659.25, 0.15, 'sine', 0.5), 150);
            setTimeout(() => playTone(783.99, 0.3, 'sine', 0.5), 300);
        };
        sounds.dolphin = () => playTone(880, 0.2, 'sine', 0.4);
        sounds.oxygenRefill = () => {
            playTone(600, 0.1, 'sine', 0.4);
            setTimeout(() => playTone(750, 0.1, 'sine', 0.4), 100);
            setTimeout(() => playTone(900, 0.2, 'sine', 0.4), 200);
        };
        sounds.chestOpen = () => {
            playTone(300, 0.1, 'sawtooth', 0.4);
            setTimeout(() => playTone(500, 0.15, 'sine', 0.5), 120);
            setTimeout(() => playTone(700, 0.2, 'sine', 0.5), 260);
            setTimeout(() => playTone(1000, 0.3, 'sine', 0.5), 420);
        };
        sounds.sharkWarning = () => {
            playTone(200, 0.08, 'sawtooth', 0.2);
            setTimeout(() => playTone(180, 0.08, 'sawtooth', 0.2), 200);
        };
        sounds.victory = () => {
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
                setTimeout(() => playTone(f, 0.4, 'sine', 0.5), i * 200);
            });
        };
    } catch(e) {
        console.log('Web Audio not supported');
        soundEnabled = false;
    }
}

function playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!soundEnabled || !audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain); gain.connect(masterGain);
        osc.frequency.value = frequency; osc.type = type;
        gain.gain.value = volume;
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
        osc.start(); osc.stop(audioContext.currentTime + duration);
    } catch(e) {}
}

function startBackgroundMusic() {
    if (!soundEnabled || !gameState.isPlaying) return;
    if (backgroundAudio && !backgroundAudio.paused) return;
    try {
        backgroundAudio = new Audio('Assets/music/2-32-am-wisanga-main-version-02-38-7969.mp3');
        backgroundAudio.loop = true; backgroundAudio.volume = 0.4;
        const p = backgroundAudio.play();
        if (p) p.then(() => { isMusicPlaying = true; }).catch(() => {});
    } catch(e) {}
}

function stopBackgroundMusic() {
    if (backgroundAudio) { backgroundAudio.pause(); backgroundAudio.currentTime = 0; backgroundAudio = null; }
    isMusicPlaying = false;
}

function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
        if (gameState.isPlaying && gameState.oxygen < 30 && soundEnabled && audioContext) {
            const speed = gameState.oxygen < 15 ? 200 : 400;
            playTone(60, 0.1, 'sine', 0.35);
            setTimeout(() => { if (gameState.oxygen < 30) playTone(60, 0.1, 'sine', 0.3); }, speed);
        }
    }, 1000);
}

function stopHeartbeat() {
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
}

// ===== GOD RAYS =====
function createGodRays() {
    godRayGroup = new THREE.Group();
    scene.add(godRayGroup);
    const rayMat = new THREE.MeshBasicMaterial({
        color: 0x88ddff, transparent: true, opacity: 0.06,
        side: THREE.DoubleSide, depthWrite: false
    });
    for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        const spread = 2.5 + Math.random() * 3;
        const height = 35 + Math.random() * 10;
        const geo = new THREE.ConeGeometry(spread, height, 4, 1, true);
        const ray = new THREE.Mesh(geo, rayMat.clone());
        ray.position.set(
            Math.cos(angle) * (Math.random() * 20 - 10),
            ocean ? ocean.position.y - height / 2 : 12,
            Math.sin(angle) * (Math.random() * 20 - 10)
        );
        ray.rotation.set(Math.random() * 0.3 - 0.15, angle, Math.random() * 0.3 - 0.15);
        ray.userData = { baseOpacity: 0.04 + Math.random() * 0.07, speed: 0.3 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 };
        godRayGroup.add(ray);
        godRays.push(ray);
    }
}

function updateGodRays(time) {
    godRays.forEach(ray => {
        ray.material.opacity = ray.userData.baseOpacity + Math.sin(time * ray.userData.speed + ray.userData.phase) * 0.03;
        ray.rotation.y += 0.0008;
    });
}

// ===== UNDERWATER VISUAL EFFECTS =====
function createCaustics() {
    const lights = [];
    for (let i = 0; i < 30; i++) {
        const light = new THREE.PointLight(0x4da8da, 0.3, 30);
        light.position.set(Math.random() * 80 - 40, 25 + Math.random() * 5, Math.random() * 80 - 40);
        scene.add(light);
        lights.push(light);
    }
    return lights;
}

function updateCaustics(time) {
    if (!causticLights.length) return;
    causticLights.forEach((light, i) => {
        light.position.x += Math.sin(time * 0.5 + i) * 0.05;
        light.position.z += Math.cos(time * 0.3 + i) * 0.05;
        light.intensity = 0.2 + Math.sin(time * 2 + i) * 0.15;
    });
}

function createDepthFog() {
    scene.fog = new THREE.FogExp2(0x0a1628, 0.008);
}

function updateDepthFog() {
    if (!diver || !scene.fog) return;
    const depth = Math.max(0, -diver.position.y);
    scene.fog.density = Math.min(0.035, 0.008 + (depth / 30) * 0.015);
}

function addPostProcessing() {
    const overlay = document.createElement('div');
    overlay.id = 'underwater-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: '50', backgroundColor: 'rgba(0,50,100,0.15)'
    });
    document.body.appendChild(overlay);

    distortionOverlay = document.createElement('canvas');
    distortionOverlay.id = 'distortion-overlay';
    Object.assign(distortionOverlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: '51', opacity: '0.04'
    });
    distortionOverlay.width = window.innerWidth;
    distortionOverlay.height = window.innerHeight;
    document.body.appendChild(distortionOverlay);

    setInterval(() => {
        if (gameState.isPlaying && diver) {
            const depth = Math.max(0, -diver.position.y);
            const blueIntensity = Math.min(0.4, 0.15 + depth / 50);
            overlay.style.backgroundColor = `rgba(0,50,100,${blueIntensity})`;
        }
    }, 100);
}

function updateDistortion(time) {
    if (!distortionOverlay || !gameState.isPlaying) return;
    const ctx = distortionOverlay.getContext('2d');
    const w = distortionOverlay.width, h = distortionOverlay.height;
    ctx.clearRect(0, 0, w, h);
    const numWaves = 6;
    for (let i = 0; i < numWaves; i++) {
        const y = ((time * 30 + i * (h / numWaves)) % h);
        const amp = 2 + Math.sin(time * 0.7 + i) * 1.5;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(100,180,255,${0.04 + Math.sin(time + i) * 0.02})`;
        ctx.lineWidth = 1;
        ctx.moveTo(0, y);
        for (let x = 0; x < w; x += 8) {
            ctx.lineTo(x, y + Math.sin((x / w) * Math.PI * 4 + time * 2 + i) * amp);
        }
        ctx.stroke();
    }
}

// ===== SPARKLE PARTICLES =====
function spawnSparkles(position) {
    for (let i = 0; i < 18; i++) {
        const geo = new THREE.SphereGeometry(0.07 + Math.random() * 0.08, 6, 6);
        const color = [0xffdd00, 0xff8800, 0xff4444, 0x44ffaa, 0xffffff][Math.floor(Math.random() * 5)];
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(position);
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            Math.random() * 0.2 + 0.05,
            (Math.random() - 0.5) * 0.3
        );
        p.userData = { vel, life: 1, decay: 0.025 + Math.random() * 0.02 };
        scene.add(p);
        sparkleParticles.push(p);
    }
}

function updateSparkles() {
    for (let i = sparkleParticles.length - 1; i >= 0; i--) {
        const p = sparkleParticles[i];
        p.userData.life -= p.userData.decay;
        if (p.userData.life <= 0) { scene.remove(p); sparkleParticles.splice(i, 1); continue; }
        p.position.add(p.userData.vel);
        p.userData.vel.y -= 0.003;
        p.material.opacity = p.userData.life;
        p.scale.setScalar(p.userData.life);
    }
}

// ===== BUBBLE TRAIL =====
function createBubbleTrail() {
    const now = Date.now();
    if (now - lastBubbleTime > 100 && gameState.isPlaying && diver) {
        lastBubbleTime = now;
        for (let i = 0; i < Math.floor(Math.random() * 3) + 2; i++) {
            const geo = new THREE.SphereGeometry(0.08, 8, 8);
            const mat = new THREE.MeshPhongMaterial({ color: 0xaaffff, transparent: true, opacity: 0.6, emissive: 0x44aaaa });
            const bubble = new THREE.Mesh(geo, mat);
            bubble.position.copy(diver.position.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.8, -0.5 - Math.random(), (Math.random() - 0.5) * 0.8
            )));
            bubble.userData = {
                life: 1,
                velocity: new THREE.Vector3((Math.random()-0.5)*0.05, 0.05+Math.random()*0.08, (Math.random()-0.5)*0.05)
            };
            scene.add(bubble); bubbleTrail.push(bubble);
        }
    }
    for (let i = bubbleTrail.length - 1; i >= 0; i--) {
        const b = bubbleTrail[i];
        b.userData.life -= 0.02;
        if (b.userData.life <= 0) { scene.remove(b); bubbleTrail.splice(i, 1); }
        else {
            b.position.add(b.userData.velocity);
            b.scale.setScalar(b.userData.life);
            if (b.material) b.material.opacity = b.userData.life * 0.6;
        }
    }
}

// ===== OXYGEN STATIONS =====
function createOxygenStations() {
    for (let i = 0; i < 6; i++) {
        const group = new THREE.Group();

        const pipeGeo = new THREE.CylinderGeometry(0.2, 0.25, 1.2, 8);
        const pipeMat = new THREE.MeshPhongMaterial({ color: 0x8899aa, shininess: 60 });
        const pipe = new THREE.Mesh(pipeGeo, pipeMat);
        pipe.position.y = 0.6;
        group.add(pipe);

        const topGeo = new THREE.SphereGeometry(0.35, 12, 12);
        const topMat = new THREE.MeshPhongMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.7, transparent: true, opacity: 0.85 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 1.4;
        group.add(top);

        const ringGeo = new THREE.TorusGeometry(0.55, 0.05, 8, 24);
        const ringMat = new THREE.MeshPhongMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.5, transparent: true, opacity: 0.5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 1.4;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        group.position.set(Math.random() * 80 - 40, -17, Math.random() * 80 - 40);
        group.userData = { type: 'oxygenStation', cooldown: 0, pulsePhase: Math.random() * Math.PI * 2 };
        scene.add(group);
        oxygenStations.push(group);
    }
}

function updateOxygenStations(time) {
    if (!gameState.isPlaying) return;
    oxygenStations.forEach(station => {
        if (station.userData.cooldown > 0) station.userData.cooldown -= 0.016;
        const pulse = 1 + Math.sin(time * 3 + station.userData.pulsePhase) * 0.15;
        if (station.children[1]) station.children[1].scale.setScalar(pulse);
        if (station.children[2]) station.children[2].scale.setScalar(pulse);

        if (Math.random() < 0.08) {
            const bGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 6, 6);
            const bMat = new THREE.MeshBasicMaterial({ color: 0x99ffee, transparent: true, opacity: 0.7 });
            const b = new THREE.Mesh(bGeo, bMat);
            b.position.copy(station.position).add(new THREE.Vector3((Math.random()-0.5)*0.3, 1.5, (Math.random()-0.5)*0.3));
            b.userData = { life: 1, vel: new THREE.Vector3((Math.random()-0.5)*0.02, 0.07+Math.random()*0.05, (Math.random()-0.5)*0.02), decay: 0.015 };
            scene.add(b);
            sparkleParticles.push(b);
        }

        if (diver && station.userData.cooldown <= 0) {
            const dist = station.position.distanceTo(diver.position);
            if (dist < 3.5) {
                const refillAmt = Math.min(100 - gameState.oxygen, 25);
                if (refillAmt > 0.1) {
                    gameState.oxygen = Math.min(100, gameState.oxygen + refillAmt);
                    station.userData.cooldown = 5;
                    updateUI();
                    if (sounds.oxygenRefill) sounds.oxygenRefill();
                    showNotification('💨 OXYGEN REFILLED! +' + Math.round(refillAmt) + '%', '#00ffcc', '24px');
                }
            }
        }
    });
}

// ===== MINIMAP =====
let minimapCanvas, minimapCtx;
function createMinimap() {
    minimapCanvas = document.createElement('canvas');
    minimapCanvas.width = 160; minimapCanvas.height = 160;
    Object.assign(minimapCanvas.style, {
        position: 'fixed', bottom: '90px', right: '20px',
        border: '2px solid #00fff7', borderRadius: '8px',
        zIndex: '200', background: 'rgba(5,15,35,0.85)', display: 'none'
    });
    document.body.appendChild(minimapCanvas);
    minimapCtx = minimapCanvas.getContext('2d');
}

function updateMinimap() {
    if (!minimapCanvas || !minimapCtx || !gameState.isPlaying || !diver) return;
    const ctx = minimapCtx;
    const W = minimapCanvas.width, H = minimapCanvas.height;
    const worldSize = 96;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(5,15,35,0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#00fff722'; ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);

    function worldToMap(x, z) {
        return {
            mx: ((x + worldSize/2) / worldSize) * W,
            my: ((z + worldSize/2) / worldSize) * H
        };
    }

    coral.forEach(c => {
        const { mx, my } = worldToMap(c.position.x, c.position.z);
        ctx.beginPath(); ctx.arc(mx, my, 2, 0, Math.PI*2);
        ctx.fillStyle = '#6bcb77'; ctx.fill();
    });

    oxygenStations.forEach(s => {
        const { mx, my } = worldToMap(s.position.x, s.position.z);
        ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI*2);
        ctx.fillStyle = '#00ffcc'; ctx.fill();
        ctx.strokeStyle = '#00ffcc44'; ctx.lineWidth = 2;
        ctx.stroke();
    });

    starfish.forEach(star => {
        if (star.userData.collected) return;
        const { mx, my } = worldToMap(star.position.x, star.position.z);
        ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI*2);
        ctx.fillStyle = '#ff5555'; ctx.fill();
    });

    treasureChests.forEach(chest => {
        if (chest.userData.collected) return;
        const { mx, my } = worldToMap(chest.position.x, chest.position.z);
        ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI*2);
        ctx.fillStyle = '#ffd700'; ctx.fill();
    });

    sharks.forEach(shark => {
        const { mx, my } = worldToMap(shark.position.x, shark.position.z);
        ctx.beginPath();
        ctx.moveTo(mx, my - 5); ctx.lineTo(mx - 3, my + 3); ctx.lineTo(mx + 3, my + 3);
        ctx.closePath();
        ctx.fillStyle = '#ff2222'; ctx.fill();
    });

    const { mx, my } = worldToMap(diver.position.x, diver.position.z);
    ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI*2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = '#00fff7'; ctx.lineWidth = 2; ctx.stroke();

    ctx.font = '8px Orbitron, monospace';
    ctx.fillStyle = '#ffffff88';
    ctx.fillText('⭐ STARFISH  🔴 SHARK  💨 O₂', 4, H - 6);
}

// ===== POWER-UP HUD =====
let powerUpHUD = null;
function createPowerUpHUD() {
    powerUpHUD = document.createElement('div');
    Object.assign(powerUpHUD.style, {
        position: 'fixed', top: '90px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '10px', zIndex: '200', pointerEvents: 'none'
    });
    document.body.appendChild(powerUpHUD);
}

function updatePowerUpHUD() {
    if (!powerUpHUD) return;
    powerUpHUD.innerHTML = '';
    const now = Date.now() / 1000;
    const ups = [
        { key: 'speedBoost', icon: '⚡', label: 'SPEED', color: '#ff6b6b' },
        { key: 'shield', icon: '🛡️', label: 'SHIELD', color: '#4ecdc4' },
        { key: 'sonar', icon: '🔊', label: 'SONAR', color: '#feca57' },
        { key: 'magnet', icon: '🧲', label: 'MAGNET', color: '#ff9ff3' }
    ];
    ups.forEach(up => {
        const pu = activePowerUps[up.key];
        if (!pu.active) return;
        const remaining = Math.max(0, pu.endTime - now);
        const pill = document.createElement('div');
        Object.assign(pill.style, {
            background: 'rgba(0,0,0,0.85)', border: `2px solid ${up.color}`,
            borderRadius: '20px', padding: '5px 14px', color: up.color,
            fontFamily: 'Orbitron, monospace', fontSize: '13px', fontWeight: 'bold',
            boxShadow: `0 0 12px ${up.color}88`, display: 'flex', gap: '6px', alignItems: 'center'
        });
        pill.innerHTML = `${up.icon} ${up.label} <span style="color:#fff">${remaining.toFixed(1)}s</span>`;
        powerUpHUD.appendChild(pill);
    });
}

// ===== SHARK WARNING =====
let sharkWarningEl = null;
function createSharkWarning() {
    sharkWarningEl = document.createElement('div');
    sharkWarningEl.id = 'shark-warning';
    Object.assign(sharkWarningEl.style, {
        position: 'fixed', top: '50%', left: '20px', transform: 'translateY(-50%)',
        fontFamily: 'Orbitron, monospace', fontSize: '13px', color: '#ff4444',
        background: 'rgba(0,0,0,0.8)', border: '2px solid #ff4444',
        borderRadius: '10px', padding: '10px 14px', zIndex: '200',
        display: 'none', textAlign: 'center', lineHeight: '1.6'
    });
    document.body.appendChild(sharkWarningEl);
}

function updateSharkWarning() {
    if (!sharkWarningEl || !diver || !gameState.isPlaying) return;
    let closest = Infinity;
    let closestDir = null;
    sharks.forEach(shark => {
        const dist = shark.position.distanceTo(diver.position);
        if (dist < closest) {
            closest = dist;
            const dir = new THREE.Vector3().subVectors(shark.position, diver.position).normalize();
            closestDir = dir;
        }
    });

    if (closest < 15) {
        sharkWarningEl.style.display = 'block';
        const danger = Math.max(0, Math.min(1, 1 - (closest - 3) / 12));
        const arrows = ['↑','↗','→','↘','↓','↙','←','↖'];
        let arrowIdx = 0;
        if (closestDir) {
            const angle = Math.atan2(closestDir.x, closestDir.z);
            arrowIdx = Math.round((angle / (Math.PI * 2) + 1) * 4) % 8;
        }
        sharkWarningEl.style.opacity = 0.6 + danger * 0.4;
        sharkWarningEl.style.borderColor = `rgba(255,${Math.floor(68*(1-danger))},${Math.floor(68*(1-danger))},1)`;
        sharkWarningEl.innerHTML = `🦈<br>${arrows[arrowIdx]}<br>${Math.round(closest)}m`;

        if (closest < 10 && soundEnabled && Math.random() < 0.02) {
            if (sounds.sharkWarning) sounds.sharkWarning();
        }
    } else {
        sharkWarningEl.style.display = 'none';
    }
}

// ===== STARFISH RADAR =====
let radarEl = null;
function createStarfishRadar() {
    radarEl = document.createElement('div');
    Object.assign(radarEl.style, {
        position: 'fixed', top: '50%', right: '20px', transform: 'translateY(-50%)',
        fontFamily: 'Orbitron, monospace', fontSize: '12px', color: '#ff8888',
        background: 'rgba(0,0,0,0.8)', border: '2px solid #ff5555',
        borderRadius: '10px', padding: '10px 14px', zIndex: '200',
        display: 'none', textAlign: 'center', lineHeight: '1.6'
    });
    document.body.appendChild(radarEl);
}

function updateStarfishRadar() {
    if (!radarEl || !diver || !gameState.isPlaying) return;
    let closest = null, closestDist = Infinity;
    starfish.forEach(star => {
        if (star.userData.collected) return;
        const dist = star.position.distanceTo(diver.position);
        if (dist < closestDist) { closestDist = dist; closest = star; }
    });
    if (!closest) { radarEl.style.display = 'none'; return; }
    radarEl.style.display = 'block';
    const dir = new THREE.Vector3().subVectors(closest.position, diver.position).normalize();
    const angle = Math.atan2(dir.x, dir.z);
    const arrows = ['↑','↗','→','↘','↓','↙','←','↖'];
    const idx = Math.round(((angle / (Math.PI * 2)) + 1) * 4) % 8;
    radarEl.innerHTML = `⭐<br>${arrows[idx]}<br>${Math.round(closestDist)}m`;
}

// ===== NOTIFICATION HELPER =====
function showNotification(text, color, fontSize = '20px', duration = 2000) {
    const notif = document.createElement('div');
    notif.textContent = text;
    Object.assign(notif.style, {
        position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        backgroundColor: 'rgba(0,0,0,0.9)', color, padding: '15px 35px',
        borderRadius: '50px', fontFamily: 'Orbitron, monospace', fontSize,
        fontWeight: 'bold', zIndex: '1000', border: `2px solid ${color}`,
        boxShadow: `0 0 20px ${color}`, pointerEvents: 'none'
    });
    document.body.appendChild(notif);
    setTimeout(() => { if (notif.parentNode) notif.remove(); }, duration);
}

// ===== MARINE LIFE CREATION =====
function createMarineLife() {
    const fishColors = [0xff6b6b, 0xffe66d, 0x4ecdc4, 0xff9ff3, 0xfeca57];
    for (let i = 0; i < 30; i++) {
        const fishGroup = new THREE.Group();
        const color = fishColors[Math.floor(Math.random() * fishColors.length)];
        const mat = new THREE.MeshPhongMaterial({ color });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), mat);
        body.scale.set(1.2, 0.6, 0.4);
        fishGroup.add(body);
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 8), mat);
        tail.position.x = -0.7; tail.rotation.z = Math.PI / 2;
        fishGroup.add(tail);
        const stripeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 12), stripeMat);
        stripe.rotation.z = Math.PI / 2; stripe.position.x = 0.1;
        fishGroup.add(stripe);
        fishGroup.position.set(Math.random()*80-40, Math.random()*20-5, Math.random()*80-40);
        fishGroup.userData = { type: 'fish', speed: 2+Math.random()*3, direction: new THREE.Vector3(Math.random()-0.5, (Math.random()-0.5)*0.3, Math.random()-0.5).normalize() };
        scene.add(fishGroup); tropicalFish.push(fishGroup);
    }

    // Turtles with riding support
    for (let i = 0; i < 3; i++) {
        const turtleGroup = new THREE.Group();
        const shellMat = new THREE.MeshPhongMaterial({ color: 0x2d6a4f, map: makeCoralTexture(0x2d6a4f) });
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 16), shellMat);
        shell.scale.set(1.3, 0.5, 0.9);
        turtleGroup.add(shell);
        const headMat = new THREE.MeshPhongMaterial({ color: 0x40916c });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), headMat);
        head.position.x = 0.9; 
        turtleGroup.add(head);
        const flipperPositions = [[-0.3,0.4],[-0.3,-0.4],[0.3,0.4],[0.3,-0.4]];
        flipperPositions.forEach(([fx,fz]) => {
            const flipper = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.25), headMat);
            flipper.position.set(fx, -0.2, fz); 
            turtleGroup.add(flipper);
        });
        turtleGroup.position.set(Math.random()*70-35, -5+Math.random()*10, Math.random()*70-35);
        turtleGroup.userData = { type: 'turtle', speed: 1.5, direction: new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize(), rideOffset: new THREE.Vector3(0, 1.2, 0) };
        scene.add(turtleGroup); 
        seaTurtles.push(turtleGroup);
    }

    // Dolphins
    for (let i = 0; i < 2; i++) {
        const dolphinGroup = new THREE.Group();
        const dMat = new THREE.MeshPhongMaterial({ color: 0x4a90e2 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 1.5, 16), dMat);
        body.rotation.z = Math.PI / 2; dolphinGroup.add(body);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 8), dMat);
        nose.position.x = 1.0; dolphinGroup.add(nose);
        const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 6), dMat);
        dorsal.position.set(0, 0.5, 0); dolphinGroup.add(dorsal);
        dolphinGroup.position.set(Math.random()*60-30, Math.random()*15, Math.random()*60-30);
        dolphinGroup.userData = { type: 'dolphin', speed: 4, direction: new THREE.Vector3(Math.random()-0.5, (Math.random()-0.5)*0.5, Math.random()-0.5).normalize() };
        scene.add(dolphinGroup); dolphins.push(dolphinGroup);
    }

    // Octopus
    for (let i = 0; i < 2; i++) {
        const octoGroup = new THREE.Group();
        const oMat = new THREE.MeshPhongMaterial({ color: 0x8b5cf6 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), oMat);
        octoGroup.add(body);
        for (let t = 0; t < 8; t++) {
            const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 1.0, 6), oMat);
            const angle = (t / 8) * Math.PI * 2;
            tent.position.set(Math.cos(angle)*0.5, -0.65, Math.sin(angle)*0.5);
            tent.rotation.z = Math.cos(angle) * 0.5; tent.rotation.x = Math.sin(angle) * 0.5;
            octoGroup.add(tent);
        }
        octoGroup.position.set(Math.random()*70-35, -8+Math.random()*5, Math.random()*70-35);
        octoGroup.userData = { type: 'octopus', speed: 1, direction: Math.random()*Math.PI*2, inkCooldown: 0, hidden: false };
        scene.add(octoGroup); octopus.push(octoGroup);
    }

    // Treasure chests with lid group for open animation
    for (let i = 0; i < 5; i++) {
        const chestGroup = new THREE.Group();
        const woodMat = new THREE.MeshPhongMaterial({ color: 0x8b5a2b });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 1.2), woodMat);
        chestGroup.add(body);
        const lidGroup = new THREE.Group();
        lidGroup.position.y = 0.3;
        const lid = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 1.25), woodMat);
        lid.position.y = 0.1;
        lidGroup.add(lid);
        chestGroup.add(lidGroup);
        const bandMat = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.3 });
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.08), bandMat);
        band.position.y = 0.1; chestGroup.add(band);
        const light = new THREE.PointLight(0xffd700, 0, 5);
        light.position.y = 0.5; chestGroup.add(light);
        chestGroup.position.set(Math.random()*70-35, -16+Math.random()*2, Math.random()*70-35);
        chestGroup.userData = { type: 'treasure', collected: false, value: 500, lidGroup, light, opening: false, openProgress: 0 };
        scene.add(chestGroup); treasureChests.push(chestGroup);
    }

    // Power-ups
    const puTypes = ['speedBoost', 'shield', 'sonar', 'magnet'];
    const puColors = { speedBoost: 0xff3333, shield: 0x33ffcc, sonar: 0xffcc33, magnet: 0xcc33ff };
    const puNames = { speedBoost: '⚡ SPEED', shield: '🛡️ SHIELD', sonar: '🔊 SONAR', magnet: '🧲 MAGNET' };
    for (let i = 0; i < 12; i++) {
        const type = puTypes[Math.floor(Math.random() * puTypes.length)];
        const group = new THREE.Group();
        const color = puColors[type];
        const coreMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.7, shininess: 100 });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), coreMat);
        group.add(core);
        const glowMat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.25, emissive: color });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), glowMat);
        group.add(glow);
        for (let p = 0; p < 10; p++) {
            const pm = new THREE.MeshBasicMaterial({ color });
            const pc = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), pm);
            const angle = (p / 10) * Math.PI * 2;
            pc.position.set(Math.cos(angle)*0.9, Math.sin(angle*2)*0.4, Math.sin(angle)*0.9);
            group.add(pc);
        }
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 48;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.font = 'Bold 14px Arial'; ctx.textAlign = 'center';
        ctx.fillText(puNames[type], 64, 30);
        const labelMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) });
        const label = new THREE.Sprite(labelMat);
        label.scale.set(1.2, 0.45, 1); label.position.y = -1.0;
        group.add(label);
        group.position.set(Math.random()*70-35, Math.random()*20-8, Math.random()*70-35);
        group.userData = { type, collected: false, bobOffset: Math.random()*Math.PI*2, rotationSpeed: 0.01+Math.random()*0.02 };
        scene.add(group); powerUps.push(group);
    }
}

function updateMarineLife(time, delta) {
    tropicalFish.forEach(fish => {
        fish.position.add(fish.userData.direction.clone().multiplyScalar(fish.userData.speed * delta));
        if (Math.abs(fish.position.x) > 45) fish.userData.direction.x *= -1;
        if (Math.abs(fish.position.z) > 45) fish.userData.direction.z *= -1;
        if (fish.position.y > 20 || fish.position.y < -10) fish.userData.direction.y *= -1;
        fish.rotation.y = Math.atan2(fish.userData.direction.x, fish.userData.direction.z);
        fish.position.y += Math.sin(time * 2) * 0.01;
    });

    seaTurtles.forEach(turtle => {
        if (ridingTurtle === turtle) return;
        turtle.position.add(turtle.userData.direction.clone().multiplyScalar(turtle.userData.speed * delta));
        if (Math.abs(turtle.position.x) > 45) turtle.userData.direction.x *= -1;
        if (Math.abs(turtle.position.z) > 45) turtle.userData.direction.z *= -1;
        turtle.rotation.y = Math.atan2(turtle.userData.direction.x, turtle.userData.direction.z);
    });

    if (!ridingTurtle && diver && gameState.isPlaying) {
        seaTurtles.forEach(turtle => {
            if (diver.position.distanceTo(turtle.position) < 2.5 && keys.shift) {
                ridingTurtle = turtle;
                showNotification('🐢 RIDING TURTLE! Press SHIFT to dismount', '#2d6a4f', '18px', 3000);
            }
        });
    }
    if (ridingTurtle) {
        if (!keys.shift) { ridingTurtle = null; return; }
        if (diver) {
            diver.position.x = ridingTurtle.position.x;
            diver.position.z = ridingTurtle.position.z;
            diver.position.y = ridingTurtle.position.y + 1.2;
            ridingTurtle.position.add(ridingTurtle.userData.direction.clone().multiplyScalar(ridingTurtle.userData.speed * 2.5 * delta));
            if (Math.abs(ridingTurtle.position.x) > 45) ridingTurtle.userData.direction.x *= -1;
            if (Math.abs(ridingTurtle.position.z) > 45) ridingTurtle.userData.direction.z *= -1;
        }
    }

    dolphins.forEach(dolphin => {
        dolphin.position.add(dolphin.userData.direction.clone().multiplyScalar(dolphin.userData.speed * delta));
        if (Math.abs(dolphin.position.x) > 45) dolphin.userData.direction.x *= -1;
        if (Math.abs(dolphin.position.z) > 45) dolphin.userData.direction.z *= -1;
        if (dolphin.position.y > 15 || dolphin.position.y < -5) dolphin.userData.direction.y *= -1;
        dolphin.rotation.y = Math.atan2(dolphin.userData.direction.x, dolphin.userData.direction.z);
        dolphin.position.y += Math.sin(time * 2 + dolphin.position.x) * 0.02;
    });

    octopus.forEach(octo => {
        if (octo.userData.inkCooldown > 0) octo.userData.inkCooldown -= delta;
        const angle = octo.userData.direction + octo.userData.speed * delta;
        octo.position.x += Math.cos(angle) * 0.5 * delta;
        octo.position.z += Math.sin(angle) * 0.5 * delta;
        octo.userData.direction = angle;

        if (diver && !octo.userData.hidden && octo.userData.inkCooldown <= 0 && octo.position.distanceTo(diver.position) < 5) {
            octo.userData.hidden = true;
            octo.userData.inkCooldown = 10;
            const inkMesh = new THREE.Mesh(
                new THREE.SphereGeometry(2.5, 16, 16),
                new THREE.MeshPhongMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.75 })
            );
            inkMesh.position.copy(diver.position);
            scene.add(inkMesh);
            setTimeout(() => scene.remove(inkMesh), 3000);
            const blindDiv = document.createElement('div');
            Object.assign(blindDiv.style, {
                position:'fixed', top:'0', left:'0', width:'100%', height:'100%',
                backgroundColor:'black', zIndex:'999', transition:'opacity 2.5s', pointerEvents:'none'
            });
            blindDiv.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#8b5cf6;font-family:Orbitron,monospace;font-size:28px;text-shadow:0 0 20px #8b5cf6">🐙 INK ATTACK! 🐙</div>';
            document.body.appendChild(blindDiv);
            setTimeout(() => { blindDiv.style.opacity = '0'; }, 800);
            setTimeout(() => { if(blindDiv.parentNode) blindDiv.remove(); }, 3200);
            setTimeout(() => { octo.visible = true; octo.userData.hidden = false; }, 6000);
            octo.visible = false;
        }
        for (let t = 1; t < octo.children.length; t++) {
            octo.children[t].rotation.z = Math.sin(time * 2 + t) * 0.3;
        }
    });
}

// ===== TREASURE & POWER-UPS =====
function updateTreasureAndPowerups() {
    treasureChests.forEach(chest => {
        if (chest.userData.collected) return;
        chest.position.y += Math.sin(Date.now() * 0.002) * 0.003;
        if (chest.userData.light) chest.userData.light.intensity = 0.3 + Math.sin(Date.now() * 0.003) * 0.2;

        if (chest.userData.opening) {
            chest.userData.openProgress = Math.min(1, chest.userData.openProgress + 0.03);
            if (chest.userData.lidGroup) chest.userData.lidGroup.rotation.x = -chest.userData.openProgress * (Math.PI / 2.2);
            if (chest.userData.light) chest.userData.light.intensity = chest.userData.openProgress * 2;
            if (chest.userData.openProgress >= 1) {
                chest.userData.collected = true;
                chest.userData.opening = false;
                spawnSparkles(chest.position.clone().add(new THREE.Vector3(0, 1, 0)));
                setTimeout(() => { chest.visible = false; if(chest.userData.light) chest.userData.light.intensity = 0; }, 500);
            }
            return;
        }

        if (diver && chest.position.distanceTo(diver.position) < 2.5) {
            chest.userData.opening = true;
            gameState.score += chest.userData.value;
            gameState.treasuresCollected = (gameState.treasuresCollected || 0) + 1;
            updateUI();
            if (sounds.chestOpen) sounds.chestOpen();
            showNotification(`💰 TREASURE! +${chest.userData.value} 💰`, '#ffd700', '28px');
        }
    });

    const now = Date.now() / 1000;
    if (activePowerUps.speedBoost.active && now > activePowerUps.speedBoost.endTime) {
        activePowerUps.speedBoost.active = false; diverSpeed = originalDiverSpeed;
    }
    if (activePowerUps.shield.active && now > activePowerUps.shield.endTime) activePowerUps.shield.active = false;
    if (activePowerUps.magnet.active && now > activePowerUps.magnet.endTime) activePowerUps.magnet.active = false;
    if (activePowerUps.sonar.active && now > activePowerUps.sonar.endTime) activePowerUps.sonar.active = false;

    powerUps.forEach(powerUp => {
        if (powerUp.userData.collected) return;
        powerUp.position.y += Math.sin(Date.now() * 0.003 + powerUp.userData.bobOffset) * 0.015;
        powerUp.rotation.y += powerUp.userData.rotationSpeed;
        powerUp.rotation.x += 0.01;
        const scale = 1 + Math.sin(Date.now() * 0.008) * 0.1;
        if (powerUp.children[0]) powerUp.children[0].scale.set(scale, scale, scale);

        if (diver && powerUp.position.distanceTo(diver.position) < 2) {
            powerUp.userData.collected = true; powerUp.visible = false;
            const type = powerUp.userData.type;
            if (type === 'speedBoost') { activePowerUps.speedBoost.active = true; activePowerUps.speedBoost.endTime = now + 10; diverSpeed = 28; }
            else if (type === 'shield') { activePowerUps.shield.active = true; activePowerUps.shield.endTime = now + 15; }
            else if (type === 'sonar') {
                activePowerUps.sonar.active = true; activePowerUps.sonar.endTime = now + 8;
                starfish.forEach(s => { if (!s.userData.collected && s.material) { s.material.emissiveIntensity = 1.5; setTimeout(() => { if(s.material) s.material.emissiveIntensity = 0.4; }, 8000); } });
            }
            else if (type === 'magnet') { activePowerUps.magnet.active = true; activePowerUps.magnet.endTime = now + 12; window._magnetCollectCount = 0; }
            if (sounds.powerUp) sounds.powerUp();
            spawnSparkles(powerUp.position.clone());
            const colors = { speedBoost:'#ff6b6b', shield:'#4ecdc4', sonar:'#feca57', magnet:'#ff9ff3' };
            const labels = { speedBoost:'⚡ SPEED BOOST!', shield:'🛡️ SHIELD ACTIVE!', sonar:'🔊 SONAR PING!', magnet:'🧲 MAGNET ACTIVE!' };
            showNotification(labels[type], colors[type], '26px');
        }
    });
}

// ===== COLLECTIBLES =====
function createStarfish() {
    const shape = new THREE.Shape();
    const arms = 5, outer = 1.0, inner = 0.4;
    for (let i = 0; i < arms * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const angle = (i * Math.PI) / arms;
        if (i === 0) shape.moveTo(Math.cos(angle)*r, Math.sin(angle)*r);
        else shape.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 });
    const mat = new THREE.MeshPhongMaterial({ color: 0xff5555, emissive: 0xff2222, emissiveIntensity: 0.4, shininess: 80 });
    const star = new THREE.Mesh(geo, mat);
    star.position.set(Math.random()*80-40, Math.random()*30-15, Math.random()*80-40);
    star.rotation.x = -Math.PI / 2;
    star.userData = { type: 'starfish', collected: false, bobOffset: Math.random()*Math.PI*2 };
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = haloCanvas.height = 64;
    const hc = haloCanvas.getContext('2d');
    const grad = hc.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0, 'rgba(255,80,80,0.8)');
    grad.addColorStop(1, 'rgba(255,80,80,0)');
    hc.fillStyle = grad; hc.fillRect(0,0,64,64);
    const haloMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(haloCanvas), transparent: true, opacity: 0.7, depthWrite: false });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(4, 4, 1);
    star.add(halo);
    scene.add(star); starfish.push(star);
}

function createPearl() {
    const geo = new THREE.SphereGeometry(0.55, 24, 24);
    const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x44aaff, emissiveIntensity: 0.5, shininess: 150 });
    const pearl = new THREE.Mesh(geo, mat);
    pearl.position.set(Math.random()*80-40, Math.random()*30-15, Math.random()*80-40);
    const hc = document.createElement('canvas'); hc.width = hc.height = 64;
    const ctx = hc.getContext('2d');
    const g = ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba(100,180,255,0.8)'); g.addColorStop(1,'rgba(100,180,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(hc), transparent: true, opacity: 0.6, depthWrite: false }));
    halo.scale.set(3,3,1); pearl.add(halo);
    pearl.userData = { type: 'pearl', collected: false, bobOffset: Math.random()*Math.PI*2 };
    scene.add(pearl); pearls.push(pearl);
}

// ===== WORLD CREATION =====
function createOcean() {
    const geo = new THREE.PlaneGeometry(200, 200, 50, 50);
    const mat = new THREE.MeshPhongMaterial({ color: 0x1a3a5c, transparent: true, opacity: 0.8, shininess: 100, side: THREE.DoubleSide });
    ocean = new THREE.Mesh(geo, mat);
    ocean.rotation.x = -Math.PI / 2; ocean.position.y = 30;
    scene.add(ocean);
    ocean.userData = { time: 0 };

    const skyGeo = new THREE.PlaneGeometry(200, 200);
    const skyCan = document.createElement('canvas'); skyCan.width = 512; skyCan.height = 512;
    const sCtx = skyCan.getContext('2d');
    const skyGrad = sCtx.createLinearGradient(0, 0, 0, 512);
    skyGrad.addColorStop(0, '#87ceeb'); skyGrad.addColorStop(0.4, '#1a8fbf'); skyGrad.addColorStop(1, '#1a3a5c');
    sCtx.fillStyle = skyGrad; sCtx.fillRect(0, 0, 512, 512);
    for (let c = 0; c < 8; c++) {
        sCtx.fillStyle = 'rgba(255,255,255,0.7)';
        const cx = Math.random()*512, cy = Math.random()*150+20;
        for (let b = 0; b < 5; b++) sCtx.beginPath(), sCtx.arc(cx+b*18-36, cy+Math.random()*10, 20+Math.random()*15, 0, Math.PI*2), sCtx.fill();
    }
    const skyMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(skyCan), side: THREE.DoubleSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.rotation.x = -Math.PI / 2; sky.position.y = 35;
    scene.add(sky);

    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x0a1628, side: THREE.DoubleSide });
    const seaBed = new THREE.Mesh(floorGeo, floorMat);
    seaBed.rotation.x = -Math.PI / 2; seaBed.position.y = -20;
    scene.add(seaBed);
}

function createLighting() {
    scene.add(new THREE.AmbientLight(0x4da8da, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(10, 50, 10); scene.add(sun);
    const p1 = new THREE.PointLight(0x00fff7, 0.6, 60);
    p1.position.set(-20, 10, -20); scene.add(p1);
    const p2 = new THREE.PointLight(0x00a8cc, 0.6, 60);
    p2.position.set(20, 5, 20); scene.add(p2);
    const back = new THREE.PointLight(0x4da8da, 0.4, 80);
    back.position.set(0, 0, -20); scene.add(back);
}

function createSeaBed() {
    const sandTex = makeSandTexture();
    const bedMat = new THREE.MeshLambertMaterial({ map: sandTex });
    const sandBed = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), bedMat);
    sandBed.rotation.x = -Math.PI / 2; sandBed.position.y = -18;
    scene.add(sandBed);
    const rockTex = makeRockTexture();
    for (let i = 0; i < 25; i++) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(Math.random()*1.5+0.6), new THREE.MeshLambertMaterial({ map: rockTex }));
        rock.position.set(Math.random()*90-45, -17.5, Math.random()*90-45);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        scene.add(rock);
    }
}

function createDiver() {
    const diverGroup = new THREE.Group();
    const skinTex = makeSkinTexture();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3a3a5a, shininess: 40 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 16), bodyMat);
    body.rotation.x = Math.PI / 2; diverGroup.add(body);
    const headMat = new THREE.MeshPhongMaterial({ map: skinTex });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 24), headMat);
    head.position.x = 1.3; diverGroup.add(head);
    const gogglesMat = new THREE.MeshPhongMaterial({ color: 0x00fff7, emissive: 0x00fff7, emissiveIntensity: 0.5, shininess: 100 });
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.9), gogglesMat);
    goggles.position.set(1.6, 0.1, 0); diverGroup.add(goggles);
    const tankMat = new THREE.MeshPhongMaterial({ color: 0xff6666, shininess: 60 });
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.6, 16), tankMat);
    tank.position.set(-1.1, -0.3, 0); diverGroup.add(tank);
    const finMat = new THREE.MeshPhongMaterial({ color: 0x00ccff, shininess: 50 });
    [0.6, -0.6].forEach((fz) => {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 1.3), finMat);
        fin.position.set(-1.6, -0.9, fz); diverGroup.add(fin);
    });
    const armMat = new THREE.MeshPhongMaterial({ color: 0x3a3a5a });
    [0.9, -0.9].forEach((az) => {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 1.3, 8), armMat);
        arm.position.set(-0.9, 0.35, az); arm.rotation.z = Math.PI / 3; diverGroup.add(arm);
    });
    const diverLight = new THREE.PointLight(0xffffff, 0.4, 8);
    diverLight.position.set(1.5, 0, 0); diverGroup.add(diverLight);
    diverGroup.position.set(0, 0, 0);
    scene.add(diverGroup); 
    diver = diverGroup;
}

function createCoralReefs() {
    const coralColorList = [0xff6b6b, 0xff8e53, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff4499];
    for (let i = 0; i < 30; i++) {
        const coralGroup = new THREE.Group();
        const color = coralColorList[Math.floor(Math.random() * coralColorList.length)];
        const coralTex = makeCoralTexture(color);
        const height = Math.random() * 3.5 + 1.2;
        const coralMat = new THREE.MeshPhongMaterial({ color, map: coralTex });
        const coralMesh = new THREE.Mesh(new THREE.ConeGeometry(0.6+Math.random()*0.6, height, 8), coralMat);
        coralMesh.position.y = height / 2;
        coralGroup.add(coralMesh);
        if (Math.random() > 0.4) {
            const branchHeight = height * 0.6;
            const branch = new THREE.Mesh(new THREE.ConeGeometry(0.25, branchHeight, 6), coralMat);
            branch.position.set(0.4, height * 0.5, 0.2); branch.rotation.z = 0.5;
            coralGroup.add(branch);
        }
        coralGroup.position.set(Math.random()*85-42.5, -17, Math.random()*85-42.5);
        coralGroup.userData = { swayPhase: Math.random()*Math.PI*2, swaySpeed: 0.5+Math.random()*0.5 };
        scene.add(coralGroup); coral.push(coralGroup);
    }
}

function updateCoralSway(time) {
    coral.forEach(c => {
        const sway = Math.sin(time * c.userData.swaySpeed + c.userData.swayPhase) * 0.04;
        c.rotation.z = sway; c.rotation.x = sway * 0.5;
    });
}

function createCollectibles() {
    for (let i = 0; i < 20; i++) createStarfish();
    for (let i = 0; i < 15; i++) createPearl();
}

function createEnemies() {
    const sharkCount = gameState.difficulty === 'easy' ? 3 : gameState.difficulty === 'normal' ? 5 : 7;
    const jellyCount = gameState.difficulty === 'easy' ? 4 : gameState.difficulty === 'normal' ? 6 : 8;
    for (let i = 0; i < sharkCount; i++) createShark();
    for (let i = 0; i < jellyCount; i++) createJellyfish();
}

function createShark() {
    const sharkGroup = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color: 0x5a5a6a, shininess: 50 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 3, 16), mat);
    body.rotation.z = Math.PI / 2; sharkGroup.add(body);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 16), mat);
    head.position.x = 2.0; sharkGroup.add(head);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 8), mat);
    tail.rotation.z = -Math.PI / 2; tail.position.x = -2.2; sharkGroup.add(tail);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 8), mat);
    fin.position.y = 0.7; sharkGroup.add(fin);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    eyeL.position.set(1.5, 0.25, 0.55); sharkGroup.add(eyeL);
    sharkGroup.position.set(Math.random()*80-40, Math.random()*12-4, Math.random()*80-40);
    sharkGroup.userData = { type:'shark', speed:4.5, chaseSpeed:7, direction:new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize() };
    scene.add(sharkGroup); sharks.push(sharkGroup);
}

function createJellyfish() {
    const jellyGroup = new THREE.Group();
    const bellMat = new THREE.MeshPhongMaterial({ color: 0xffaaff, transparent: true, opacity: 0.7, emissive: 0xff44aa, emissiveIntensity: 0.3 });
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16, 0, Math.PI*2, 0, Math.PI/2), bellMat);
    jellyGroup.add(bell);
    const innerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshPhongMaterial({ color: 0xffccff, emissive: 0xff88cc, emissiveIntensity: 0.5, transparent: true, opacity: 0.4 }));
    jellyGroup.add(innerGlow);
    for (let i = 0; i < 8; i++) {
        const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.03, 2.2, 6), new THREE.MeshPhongMaterial({ color: 0xff88cc, transparent: true, opacity: 0.6 }));
        tent.position.set(Math.cos(i*Math.PI/4)*0.6, -1.1, Math.sin(i*Math.PI/4)*0.6);
        jellyGroup.add(tent);
    }
    jellyGroup.position.set(Math.random()*80-40, Math.random()*22, Math.random()*80-40);
    jellyGroup.userData = { type:'jellyfish', speed: gameState.difficulty==='easy'?2:gameState.difficulty==='normal'?3.5:5, direction:Math.random()*Math.PI*2, pulsePhase:Math.random()*Math.PI*2 };
    scene.add(jellyGroup); jellyfish.push(jellyGroup);
}

function createBubbleParticles() {
    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshPhongMaterial({ color: 0xccffff, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 150; i++) {
        const bubble = new THREE.Mesh(geo, mat.clone());
        bubble.position.set(Math.random()*90-45, Math.random()*60-20, Math.random()*90-45);
        bubble.userData = { speed: Math.random()*2.5+1, wobble: Math.random()*Math.PI*2 };
        scene.add(bubble); bubbles.push(bubble);
    }
}

// ===== UI FUNCTIONS =====
function addQuitButton() {
    const btn = document.createElement('button');
    btn.innerHTML = '🚪 QUIT TO MENU';
    Object.assign(btn.style, { position:'fixed', bottom:'20px', right:'20px', padding:'14px 28px', backgroundColor:'rgba(255,71,87,0.95)', color:'white', border:'none', borderRadius:'12px', fontFamily:'Orbitron,monospace', fontSize:'14px', fontWeight:'bold', cursor:'pointer', zIndex:'200' });
    btn.onmouseenter = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseleave = () => btn.style.transform = 'scale(1)';
    btn.onclick = () => {
        if (gameState.isPlaying) endGame(false);
        stopBackgroundMusic(); stopHeartbeat();
        gameState.isPlaying = false;
        document.getElementById('start-screen').style.display = 'flex';
        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('gameover-screen').style.display = 'none';
        document.getElementById('victory-screen').style.display = 'none';
        if (diver) diver.position.set(0,0,0);
        mouseLookEnabled = false; document.body.style.cursor = 'auto';
    };
    document.body.appendChild(btn);
}

function addSoundToggleButton() {
    const btn = document.createElement('button');
    btn.innerHTML = '🔊 MUSIC ON';
    Object.assign(btn.style, { position:'fixed', bottom:'20px', left:'20px', padding:'14px 28px', backgroundColor:'rgba(0,168,204,0.95)', color:'white', border:'none', borderRadius:'12px', fontFamily:'Orbitron,monospace', fontSize:'14px', fontWeight:'bold', cursor:'pointer', zIndex:'200' });
    btn.onmouseenter = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseleave = () => btn.style.transform = 'scale(1)';
    btn.onclick = () => {
        soundEnabled = !soundEnabled;
        btn.innerHTML = soundEnabled ? '🔊 MUSIC ON' : '🔇 MUSIC OFF';
        btn.style.backgroundColor = soundEnabled ? 'rgba(0,168,204,0.95)' : 'rgba(100,100,100,0.95)';
        if (soundEnabled && gameState.isPlaying) startBackgroundMusic(); else stopBackgroundMusic();
    };
    document.body.appendChild(btn);
}

function addVolumeControl() {
    const vol = document.createElement('div');
    Object.assign(vol.style, { position:'fixed', top:'20px', right:'20px', backgroundColor:'rgba(0,0,0,0.8)', padding:'12px 18px', borderRadius:'12px', zIndex:'200', fontFamily:'Orbitron,monospace', fontSize:'12px', color:'#00fff7', border:'1px solid #00fff7' });
    vol.innerHTML = `<div style="margin-bottom:8px">🔊 VOLUME</div><input type="range" id="volume-slider" min="0" max="100" value="65" style="width:130px">`;
    document.body.appendChild(vol);
    document.getElementById('volume-slider').addEventListener('input', e => {
        const v = e.target.value / 100;
        if (backgroundAudio) backgroundAudio.volume = v * 0.6;
        if (masterGain) masterGain.gain.value = v * 0.8;
    });
}

function addMouseInstruction() {
    const instr = document.createElement('div');
    Object.assign(instr.style, { position:'fixed', bottom:'80px', right:'20px', backgroundColor:'rgba(0,0,0,0.8)', color:'#00fff7', padding:'10px 18px', borderRadius:'25px', fontSize:'11px', fontFamily:'Orbitron,monospace', zIndex:'200', pointerEvents:'none', border:'1px solid #00fff7' });
    instr.innerHTML = '🖱️ CLICK TO LOOK | ESC RELEASE | 🐢 HOLD SHIFT NEAR TURTLE TO RIDE';
    document.body.appendChild(instr);
}

function showStartScreen() {
    const ls = document.getElementById('loading-screen');
    if (ls) ls.style.display = 'none';
    const ss = document.getElementById('start-screen');
    if (ss) ss.style.display = 'flex';
    const hs = document.getElementById('high-score-display');
    if (hs) hs.textContent = `🏆 BEST: ${highScore}`;
}

// ===== GAME FUNCTIONS =====
function setupEventListeners() {
    document.addEventListener('keydown', e => {
        if (e.key.toLowerCase()==='w') keys.w=true;
        if (e.key.toLowerCase()==='a') keys.a=true;
        if (e.key.toLowerCase()==='s') keys.s=true;
        if (e.key.toLowerCase()==='d') keys.d=true;
        if (e.key===' ') { keys.space=true; e.preventDefault(); }
        if (e.key==='Shift') { keys.shift=true; e.preventDefault(); }
        if (e.key==='Escape') { mouseLookEnabled=false; document.body.style.cursor='auto'; document.exitPointerLock?.(); }
    });
    document.addEventListener('keyup', e => {
        if (e.key.toLowerCase()==='w') keys.w=false;
        if (e.key.toLowerCase()==='a') keys.a=false;
        if (e.key.toLowerCase()==='s') keys.s=false;
        if (e.key.toLowerCase()==='d') keys.d=false;
        if (e.key===' ') keys.space=false;
        if (e.key==='Shift') { keys.shift=false; if(ridingTurtle){ridingTurtle=null;} }
    });
    renderer.domElement.addEventListener('click', () => {
        if (gameState.isPlaying) { mouseLookEnabled=true; renderer.domElement.requestPointerLock(); document.body.style.cursor='none'; }
    });
    document.addEventListener('mousemove', e => {
        if (mouseLookEnabled && gameState.isPlaying) {
            targetRotationX += e.movementX * 0.003;
            targetRotationY += e.movementY * 0.003;
            targetRotationY = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, targetRotationY));
        }
    });
    document.addEventListener('pointerlockchange', () => {
        mouseLookEnabled = document.pointerLockElement === renderer.domElement;
        document.body.style.cursor = mouseLookEnabled ? 'none' : 'auto';
    });
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (distortionOverlay) { distortionOverlay.width = window.innerWidth; distortionOverlay.height = window.innerHeight; }
    });
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', startGame);
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    const victoryRestartBtn = document.getElementById('victory-restart-btn');
    if (victoryRestartBtn) victoryRestartBtn.addEventListener('click', restartGame);
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.difficulty = btn.dataset.difficulty;
        });
    });
}

function initGamepadSupport() {
    window.addEventListener('gamepadconnected', e => { gamepadConnected = true; });
    window.addEventListener('gamepaddisconnected', () => { gamepadConnected = false; });
}

function updateGamepadInput() {
    if (!gamepadConnected) return;
    const gp = navigator.getGamepads()[0];
    if (!gp) return;
    const dz = 0.15;
    const rx = gp.axes[0]||0, ry = gp.axes[1]||0;
    gamepadMoveX = Math.abs(rx)>dz?rx:0;
    gamepadMoveZ = Math.abs(ry)>dz?ry:0;
    if (gp.axes.length>3) {
        const cx=Math.abs(gp.axes[2])>dz?gp.axes[2]:0, cy=Math.abs(gp.axes[3])>dz?gp.axes[3]:0;
        if (cx||cy) { const s=0.008; targetRotationX+=cx*s; targetRotationY=Math.max(-Math.PI/2.5,Math.min(Math.PI/2.5,targetRotationY+cy*s)); }
    }
    gamepadAscend = 0;
    if (gp.buttons[4]?.pressed) gamepadAscend=1;
    if (gp.buttons[5]?.pressed) gamepadAscend=-1;
    if (gp.buttons[0]?.pressed && !gameState.isPlaying && !gameState.isGameOver) startGame();
    if (gp.buttons[9]?.pressed && (gameState.isGameOver||gameState.isVictory)) restartGame();
}

function startGame() {
    if (audioContext?.state==='suspended') audioContext.resume().then(()=>startBackgroundMusic()); else startBackgroundMusic();
    startHeartbeat();
    diverSpeed = originalDiverSpeed;
    activePowerUps = { speedBoost:{active:false,endTime:0}, shield:{active:false,endTime:0}, sonar:{active:false,endTime:0}, magnet:{active:false,endTime:0} };
    if (gameState.difficulty==='easy') { gameState.targetStarfish=12; gameState.timeLeft=200; }
    else if (gameState.difficulty==='normal') { gameState.targetStarfish=15; gameState.timeLeft=170; }
    else { gameState.targetStarfish=18; gameState.timeLeft=140; }
    gameState.score=0; gameState.oxygen=100; gameState.starfishCollected=0;
    gameState.isPlaying=true; gameState.isGameOver=false; gameState.isVictory=false;
    gameState.hitCooldown=0; gameState.combo=0; gameState.pearlsCollected=0; gameState.treasuresCollected=0;
    gameState.checkpoint=null;
    if (diver) diver.position.set(0,0,0);
    sharks.forEach(s=>scene.remove(s)); jellyfish.forEach(j=>scene.remove(j));
    sharks=[]; jellyfish=[];
    createEnemies();
    starfish.forEach(s=>{s.userData.collected=false;s.visible=true;});
    pearls.forEach(p=>{p.userData.collected=false;p.visible=true;});
    powerUps.forEach(p=>{p.userData.collected=false;p.visible=true;});
    treasureChests.forEach(c=>{c.userData.collected=false;c.visible=true;c.userData.opening=false;c.userData.openProgress=0;if(c.userData.lidGroup)c.userData.lidGroup.rotation.x=0;if(c.userData.light)c.userData.light.intensity=0.3;});
    document.getElementById('start-screen').style.display='none';
    document.getElementById('game-ui').style.display='flex';
    document.getElementById('gameover-screen').style.display='none';
    document.getElementById('victory-screen').style.display='none';
    if (minimapCanvas) minimapCanvas.style.display='block';
    if (sharkWarningEl) sharkWarningEl.style.display='none';
    if (radarEl) radarEl.style.display='none';
    updateUI(); startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameState.isPlaying) return;
        gameState.timeLeft--;
        gameState.oxygen = Math.max(0, gameState.oxygen - 0.25);
        if (!gameState.checkpoint && gameState.starfishCollected >= Math.floor(gameState.targetStarfish / 2)) {
            gameState.checkpoint = { score: gameState.score, oxygen: gameState.oxygen, timeLeft: gameState.timeLeft, starfish: gameState.starfishCollected };
            showNotification('💾 CHECKPOINT SAVED! Halfway there!', '#00ffcc', '20px', 2500);
        }
        updateUI();
        if (gameState.timeLeft<=0||gameState.oxygen<=0) endGame(false);
    }, 1000);
}

function updateUI() {
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = gameState.score;
    const mins = Math.floor(Math.max(0,gameState.timeLeft)/60);
    const secs = Math.floor(Math.max(0,gameState.timeLeft)%60);
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    const oxyFill = document.getElementById('oxygen-fill');
    if (oxyFill) {
        oxyFill.style.width = `${Math.max(0,gameState.oxygen)}%`;
        if (gameState.oxygen>50) oxyFill.style.background='linear-gradient(90deg,#2ed573,#00fff7)';
        else if (gameState.oxygen>25) oxyFill.style.background='linear-gradient(90deg,#ffd700,#ff8c00)';
        else oxyFill.style.background='linear-gradient(90deg,#ff4757,#ff0000)';
    }
    const targetEl = document.getElementById('target');
    if (targetEl) targetEl.textContent = `${gameState.starfishCollected}/${gameState.targetStarfish}`;
    updatePowerUpHUD();
}

function endGame(victory) {
    gameState.isPlaying=false; gameState.isGameOver=true;
    clearInterval(timerInterval); mouseLookEnabled=false; document.body.style.cursor='auto';
    stopHeartbeat(); stopBackgroundMusic();
    if (minimapCanvas) minimapCanvas.style.display='none';
    if (sharkWarningEl) sharkWarningEl.style.display='none';
    if (radarEl) radarEl.style.display='none';
    const starBonus = gameState.starfishCollected * 100;
    const timeBonus = Math.max(0, gameState.timeLeft * 10);
    const pearlBonus = (gameState.pearlsCollected || 0) * 25;
    const treasureBonus = (gameState.treasuresCollected || 0) * 500;
    const finalScore = gameState.score + starBonus + timeBonus + pearlBonus + treasureBonus;

    if (finalScore > highScore) {
        highScore = finalScore;
        localStorage.setItem('oceanRescueHighScore', highScore);
    }
    sessionScores.unshift({ score: finalScore, difficulty: gameState.difficulty, victory, date: new Date().toLocaleDateString() });
    sessionScores = sessionScores.slice(0, 5);
    localStorage.setItem('oceanRescueScores', JSON.stringify(sessionScores));

    if (victory) {
        if (sounds.victory) sounds.victory();
        document.getElementById('victory-score').textContent = finalScore;
        const vBreak = document.getElementById('victory-breakdown');
        if (vBreak) vBreak.innerHTML = buildScoreBreakdown(starBonus, timeBonus, pearlBonus, treasureBonus);
        const hsBadge = document.getElementById('victory-hs');
        if (hsBadge) hsBadge.textContent = finalScore >= highScore ? '🏆 NEW HIGH SCORE!' : `🏆 Best: ${highScore}`;
        document.getElementById('victory-screen').style.display='flex';
    } else {
        if (sounds.gameOver) sounds.gameOver();
        document.getElementById('final-score').textContent = finalScore;
        const breakdown = document.getElementById('gameover-breakdown');
        if (breakdown) breakdown.innerHTML = buildScoreBreakdown(starBonus, timeBonus, pearlBonus, treasureBonus);
        const goHs = document.getElementById('gameover-hs');
        if (goHs) goHs.textContent = `🏆 Best: ${highScore}`;
        document.getElementById('gameover-title').textContent = gameState.oxygen<=0?'💀 OUT OF OXYGEN! 💀':'⏰ TIME UP! ⏰';
        if (gameState.checkpoint) {
            showNotification('💾 Checkpoint saved at ' + gameState.checkpoint.starfish + ' starfish collected!', '#00ffcc', '16px', 4000);
        }
        document.getElementById('gameover-screen').style.display='flex';
    }
    document.getElementById('game-ui').style.display='none';
    renderLeaderboard();
}

function buildScoreBreakdown(starBonus, timeBonus, pearlBonus, treasureBonus) {
    return `
        <div style="font-family:Orbitron,monospace;font-size:14px;color:#aaddff;margin-top:10px;line-height:2">
            ⭐ Starfish: <span style="color:#ff8888">+${gameState.score}</span><br>
            🌟 Starfish Bonus: <span style="color:#ffaa44">+${starBonus}</span><br>
            ⏱️ Time Bonus: <span style="color:#44ffaa">+${timeBonus}</span><br>
            💎 Pearls: <span style="color:#aaccff">+${pearlBonus}</span><br>
            💰 Treasures: <span style="color:#ffd700">+${treasureBonus}</span>
        </div>`;
}

function renderLeaderboard() {
    const el = document.getElementById('leaderboard-list');
    if (!el || !sessionScores.length) return;
    el.innerHTML = sessionScores.map((s,i)=>
        `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ffffff22;font-size:13px">
            <span>${i+1}. ${s.victory?'✅':'❌'} ${s.difficulty.toUpperCase()}</span>
            <span style="color:#ffd700">${s.score}</span>
            <span style="color:#888">${s.date}</span>
        </div>`
    ).join('');
}

function restartGame() {
    gameState.score=0; gameState.oxygen=100; gameState.starfishCollected=0;
    gameState.isPlaying=true; gameState.isGameOver=false; gameState.isVictory=false;
    gameState.hitCooldown=0; gameState.combo=0; gameState.pearlsCollected=0; gameState.treasuresCollected=0;
    if (diver) diver.position.set(0,0,0);
    starfish.forEach(s=>{s.userData.collected=false;s.visible=true;});
    pearls.forEach(p=>{p.userData.collected=false;p.visible=true;});
    powerUps.forEach(p=>{p.userData.collected=false;p.visible=true;});
    sharks.forEach(s=>scene.remove(s)); jellyfish.forEach(j=>scene.remove(j));
    sharks=[]; jellyfish=[]; createEnemies();
    document.getElementById('gameover-screen').style.display='none';
    document.getElementById('victory-screen').style.display='none';
    document.getElementById('game-ui').style.display='flex';
    if (minimapCanvas) minimapCanvas.style.display='block';
    updateUI(); startTimer(); startBackgroundMusic(); startHeartbeat();
}

function updateDiver(delta) {
    if (!diver||!gameState.isPlaying) return;
    if (ridingTurtle) {
        currentRotationX += (targetRotationX-currentRotationX)*0.1;
        currentRotationY += (targetRotationY-currentRotationY)*0.1;
        const r=cameraDistance, xO=Math.sin(currentRotationX)*Math.cos(currentRotationY)*r;
        const yO=Math.sin(currentRotationY)*r+cameraHeight, zO=Math.cos(currentRotationX)*Math.cos(currentRotationY)*r;
        camera.position.set(diver.position.x+xO, diver.position.y+yO, diver.position.z+zO);
        camera.lookAt(diver.position);
        return;
    }
    const speed = diverSpeed * delta;
    let inputX=0, inputZ=0, moveY=0;
    if (keys.d) inputX=1; if (keys.a) inputX=-1;
    if (keys.s) inputZ=1; if (keys.w) inputZ=-1;
    if (keys.space) moveY=1; if (keys.shift) moveY=-1;
    if (gamepadConnected) {
        updateGamepadInput();
        if (Math.abs(gamepadMoveX)>0.1) inputX=gamepadMoveX;
        if (Math.abs(gamepadMoveZ)>0.1) inputZ=gamepadMoveZ;
        if (Math.abs(gamepadAscend)>0.1) moveY=gamepadAscend;
    }
    const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
    const forward = new THREE.Vector3(camDir.x,0,camDir.z).normalize();
    const right = new THREE.Vector3(-forward.z,0,forward.x);
    const moveDelta = new THREE.Vector3();
    moveDelta.addScaledVector(forward, inputZ); moveDelta.addScaledVector(right, inputX);
    diver.position.x += moveDelta.x*speed; diver.position.z += moveDelta.z*speed; diver.position.y += moveY*speed;
    diver.position.x=Math.max(-48,Math.min(48,diver.position.x));
    diver.position.y=Math.max(-18,Math.min(28,diver.position.y));
    diver.position.z=Math.max(-48,Math.min(48,diver.position.z));
    diver.rotation.z = Math.sin(Date.now()*0.002)*0.05;
    currentRotationX += (targetRotationX-currentRotationX)*0.1;
    currentRotationY += (targetRotationY-currentRotationY)*0.1;
    const rr=cameraDistance, xO=Math.sin(currentRotationX)*Math.cos(currentRotationY)*rr;
    const yO=Math.sin(currentRotationY)*rr+cameraHeight, zO=Math.cos(currentRotationX)*Math.cos(currentRotationY)*rr;
    camera.position.set(diver.position.x+xO, diver.position.y+yO, diver.position.z+zO);
    camera.lookAt(diver.position);
}

function updateCollectibles(time) {
    if (!gameState.isPlaying) return;
    const magnetActive = activePowerUps.magnet.active;
    if (magnetActive&&!window._magnetActiveFlag) { window._magnetActiveFlag=true; window._magnetCollectCount=0; showNotification('🧲 MAGNET - Pulls 3 starfish!','#ff9ff3','22px'); }
    if (!magnetActive&&window._magnetActiveFlag) { window._magnetActiveFlag=false; window._magnetCollectCount=0; }
    if (window._magnetCollectCount===undefined) window._magnetCollectCount=0;

    for (let i=0;i<starfish.length;i++) {
        const star=starfish[i];
        if (star.userData.collected) continue;
        star.position.y+=Math.sin(time*2+star.userData.bobOffset)*0.015;
        star.rotation.z+=0.025;
        if (magnetActive&&diver&&window._magnetCollectCount<3) {
            const dist=star.position.distanceTo(diver.position);
            if (dist>2&&dist<8) {
                const pull=new THREE.Vector3().subVectors(diver.position,star.position).normalize();
                star.position.addScaledVector(pull,0.15);
            }
        }
        if (diver&&star.position.distanceTo(diver.position)<2.5) {
            const byMagnet=magnetActive&&window._magnetCollectCount<3;
            if (byMagnet) window._magnetCollectCount++;
            star.userData.collected=true; star.visible=false;
            spawnSparkles(star.position.clone());
            gameState.score+=50+(gameState.combo*5);
            gameState.starfishCollected++; gameState.combo++;
            gameState.lastCollectTime=Date.now()/1000;
            updateUI();
            if (sounds.collect) sounds.collect();
            if (gameState.combo>1) showNotification('🔥 x'+gameState.combo+' COMBO! +'+gameState.combo*5,'#ffaa00','20px',700);
            if (gameState.starfishCollected>=gameState.targetStarfish) setTimeout(()=>endGame(true),500);
        }
    }

    for (let j=0;j<pearls.length;j++) {
        const pearl=pearls[j];
        if (pearl.userData.collected) continue;
        pearl.position.y+=Math.sin(time*3+pearl.userData.bobOffset)*0.02;
        if (diver&&pearl.position.distanceTo(diver.position)<2.5) {
            pearl.userData.collected=true; pearl.visible=false;
            spawnSparkles(pearl.position.clone());
            gameState.score+=25; gameState.pearlsCollected=(gameState.pearlsCollected||0)+1;
            updateUI(); if (sounds.collect) sounds.collect();
        }
    }
    if ((Date.now()/1000-gameState.lastCollectTime)>3) gameState.combo=0;
}

// ===== UPDATED ENEMIES WITH CORRECT CHASE BEHAVIOR =====
function updateEnemies(time, delta) {
    if (!gameState.isPlaying) return;
    const sd = Math.min(delta, 0.033);
    if (gameState.hitCooldown > 0) gameState.hitCooldown -= sd;
    
    // CHASE TIMER SYSTEM - Only on HARD difficulty
    if (gameState.difficulty === 'hard') {
        // Update chase timer continuously
        chaseTimer += sd;
        
        // Chase for 10 seconds, then rest for 5 seconds (15 second total cycle)
        if (chaseTimer >= CHASE_DURATION + REST_DURATION) {
            chaseTimer = 0;  // Reset timer to start new chase cycle
        }
        
        // Chase is active for first 10 seconds of each 15-second cycle
        isChaseActive = chaseTimer < CHASE_DURATION;
        
        // Visual feedback for player - red glow when sharks are chasing
        if (isChaseActive) {
            document.body.style.boxShadow = 'inset 0 0 30px rgba(255,0,0,0.3)';
            document.body.style.border = '2px solid rgba(255,0,0,0.4)';
        } else {
            document.body.style.boxShadow = 'none';
            document.body.style.border = 'none';
        }
    }
    
    // Update each shark individually
    sharks.forEach((shark, index) => {
        if (!shark || !shark.userData) return;
        const data = shark.userData;
        
        // HARD DIFFICULTY: Individual shark chase behavior
        if (gameState.difficulty === 'hard' && isChaseActive && diver && gameState.isPlaying) {
            // Calculate direction to diver
            const toDiver = new THREE.Vector3().subVectors(diver.position, shark.position).normalize();
            
            // Each shark has individual chase speed with slight variation
            const individualSpeed = data.chaseSpeed + (index * 0.2);
            shark.position.addScaledVector(toDiver, individualSpeed * sd);
            
            // Store the direction for rotation
            data.direction = toDiver;
            
            // Add a small trail effect when chasing (visual feedback)
            if (Math.random() < 0.05) {
                const trail = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15, 4, 4),
                    new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5 })
                );
                trail.position.copy(shark.position);
                scene.add(trail);
                setTimeout(() => scene.remove(trail), 200);
            }
        } 
        else {
            // NORMAL MOVEMENT (when not chasing or on Easy/Normal difficulty)
            shark.position.addScaledVector(data.direction, data.speed * sd);
            
            // Bounce off boundaries
            if (Math.abs(shark.position.x) > 48) data.direction.x *= -1;
            if (Math.abs(shark.position.z) > 48) data.direction.z *= -1;
            
            // Add some randomness to movement
            if (Math.random() < 0.02) {
                data.direction.x += (Math.random() - 0.5) * 0.3;
                data.direction.z += (Math.random() - 0.5) * 0.3;
                data.direction.normalize();
            }
        }
        
        // Tail wag animation
        if (shark.children[1]) shark.children[1].rotation.y = Math.sin(time * 4 + index) * 0.3;
        
        // Vertical oscillation (sharks swim up and down slightly)
        shark.position.y = Math.sin(time + shark.position.x * 0.1 + index) * 3.5;
        
        // Rotate shark to face movement direction
        shark.rotation.y = Math.atan2(data.direction.x, data.direction.z);
        
        // COLLISION WITH DIVER
        if (diver && gameState.hitCooldown <= 0) {
            const distance = shark.position.distanceTo(diver.position);
            if (distance < 3.2) {
                // Check if shield is active
                if (activePowerUps.shield.active) { 
                    showNotification('🛡️ SHIELD BLOCKED!', '#4ecdc4', '22px', 800); 
                } 
                else {
                    // Apply damage
                    gameState.oxygen = Math.max(0, gameState.oxygen - 18);
                    gameState.hitCooldown = 0.6;
                    updateUI(); 
                    flashDamage();
                    
                    // Play sounds
                    if (sounds.hit) sounds.hit(); 
                    if (sounds.sharkBite) sounds.sharkBite();
                    
                    // Knockback effect - push diver away from shark
                    const knockback = shark.position.clone().sub(diver.position).normalize();
                    diver.position.addScaledVector(knockback, 5);
                    
                    // Check for game over
                    if (gameState.oxygen <= 0) endGame(false);
                }
            }
        }
    });
    
    // JELLYFISH update
    jellyfish.forEach(jelly => {
        if (!jelly || !jelly.userData) return;
        const data = jelly.userData;
        data.direction += data.speed * 0.015 * sd;
        jelly.position.x += Math.cos(data.direction) * 0.07 * (sd * 30);
        jelly.position.z += Math.sin(data.direction) * 0.07 * (sd * 30);
        jelly.position.y += Math.sin(time * 2.5 + data.pulsePhase) * 0.025;
        
        // Pulsing animation
        const sc = 1 + Math.sin(time * 5) * 0.12;
        jelly.scale.set(sc, 1, sc);
        
        // Bioluminescence effect
        if (jelly.children[1]) {
            jelly.children[1].material.emissiveIntensity = 0.3 + Math.sin(time * 4 + data.pulsePhase) * 0.3;
        }
        
        // Jellyfish collision
        if (diver && gameState.hitCooldown <= 0 && !activePowerUps.shield.active) {
            if (jelly.position.distanceTo(diver.position) < 2.8) {
                gameState.oxygen = Math.max(0, gameState.oxygen - 10);
                gameState.hitCooldown = 0.4;
                updateUI(); 
                flashDamage();
                if (sounds.hit) sounds.hit();
                if (gameState.oxygen <= 0) endGame(false);
            }
        }
    });
}

function flashDamage() {
    const flash=document.createElement('div');
    Object.assign(flash.style, { position:'fixed',top:'0',left:'0',width:'100%',height:'100%',backgroundColor:'rgba(255,0,0,0.5)',pointerEvents:'none',zIndex:'1000' });
    document.body.appendChild(flash);
    setTimeout(()=>flash.remove(),150);
}

function updateBubbles(time) {
    bubbles.forEach(b => {
        b.position.y+=b.userData.speed*0.025;
        b.position.x+=Math.sin(time*2.5+b.userData.wobble)*0.025;
        if (b.position.y>35) { b.position.y=-22; b.position.x=Math.random()*90-45; b.position.z=Math.random()*90-45; }
    });
}

// ===== INIT =====
function init() {
    console.log("Ocean Rescue - UPGRADED EDITION!");
    initAudio();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0,5,12);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a1628);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.insertBefore(renderer.domElement, document.body.firstChild);
    clock = new THREE.Clock();

    createOcean(); createLighting(); createSeaBed(); createDiver();
    createCoralReefs(); createCollectibles(); createEnemies();
    createBubbleParticles();
    causticLights = createCaustics();
    createDepthFog(); addPostProcessing();
    createMarineLife(); createGodRays();
    createOxygenStations();

    setupEventListeners(); animate(); initGamepadSupport();

    createMinimap(); createPowerUpHUD();
    createSharkWarning(); createStarfishRadar();
    addQuitButton(); addSoundToggleButton();
    addVolumeControl(); addMouseInstruction();

    console.log("UPGRADED game ready!");
    showStartScreen();
}

// ===== ANIMATE =====
function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.033);
    const time = clock.getElapsedTime();
    updateDiver(delta);
    updateCollectibles(time);
    updateEnemies(time, delta);
    updateBubbles(time);
    updateCaustics(time);
    updateDepthFog();
    createBubbleTrail();
    updateMarineLife(time, delta);
    updateTreasureAndPowerups();
    updateGodRays(time);
    updateCoralSway(time);
    updateOxygenStations(time);
    updateSparkles();
    updateDistortion(time);
    updateMinimap();
    updateSharkWarning();
    updateStarfishRadar();
    renderer.render(scene, camera);
}

init();