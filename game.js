// ===================================================
// OCEAN RESCUE - 3D GAME (COMPLETE EDITION - BIGGER ITEMS)
// ===================================================

// ===== GLOBAL VARIABLES =====
let scene, camera, renderer, clock;
let diver, ocean;
let starfish = [], pearls = [], sharks = [], jellyfish = [], bubbles = [], coral = [];
let tropicalFish = [], seaTurtles = [], dolphins = [], octopus = [], treasureChests = [];
// Add this with your other global variables at the top of the file
let magnetCollectCount = 0;
let magnetActiveFlag = false;

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
    collect: null,
    hit: null,
    gameOver: null,
    victory: null,
    sharkBite: null,
    tension: null,
    powerUp: null,
    treasure: null,
    dolphin: null
};
let soundEnabled = true;
let masterGain = null;

// Chase timer variables
let chaseTimer = 0;
let isChaseActive = false;
const CHASE_DURATION = 10;
const REST_DURATION = 10;

let gameState = {
    score: 0,
    timeLeft: 180,
    oxygen: 100,
    starfishCollected: 0,
    targetStarfish: 10,
    difficulty: 'easy',
    isPlaying: false,
    isGameOver: false,
    isVictory: false,
    hitCooldown: 0,
    combo: 0,
    lastCollectTime: 0
};

const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
let diverSpeed = 15;

let timerInterval;

// Camera control variables
let mouseX = 0, mouseY = 0;
let targetRotationX = 0, targetRotationY = 0;
let currentRotationX = 0, currentRotationY = 0;
let mouseLookEnabled = false;
let cameraDistance = 12;
let cameraHeight = 5;

// Controller variables
let gamepadConnected = false;
let gamepadId = null;
let gamepadMoveX = 0;
let gamepadMoveZ = 0;
let gamepadAscend = 0;
let gamepadLookX = 0;
let gamepadLookY = 0;

// Visual effect variables
let causticLights = [];
let bubbleTrail = [];
let lastBubbleTime = 0;

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
        
        sounds.victory = () => {
            playTone(523.25, 0.25, 'sine', 0.5);
            setTimeout(() => playTone(659.25, 0.25, 'sine', 0.5), 200);
            setTimeout(() => playTone(783.99, 0.35, 'sine', 0.5), 400);
            setTimeout(() => playTone(1046.5, 0.6, 'sine', 0.5), 600);
        };
    } catch(e) {
        console.log('Web Audio not supported');
        soundEnabled = false;
    }
}

function playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!soundEnabled || !audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(masterGain);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.value = volume;
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch(e) {}
}

function startBackgroundMusic() {
    if (!soundEnabled || !gameState.isPlaying) return;
    if (backgroundAudio && !backgroundAudio.paused) return;
    
    try {
        backgroundAudio = new Audio('Assets/music/2-32-am-wisanga-main-version-02-38-7969.mp3');
        backgroundAudio.loop = true;
        backgroundAudio.volume = 0.4;
        
        const playPromise = backgroundAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('🎵 Background music playing!');
                isMusicPlaying = true;
            }).catch(error => {
                console.log('Click on game to start music:', error);
            });
        }
    } catch(e) {
        console.log('Error loading music:', e);
    }
}

function stopBackgroundMusic() {
    if (backgroundAudio) {
        backgroundAudio.pause();
        backgroundAudio.currentTime = 0;
        backgroundAudio = null;
    }
    isMusicPlaying = false;
}

function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    
    heartbeatInterval = setInterval(() => {
        if (gameState.isPlaying && gameState.oxygen < 30 && soundEnabled && audioContext) {
            const speed = gameState.oxygen < 15 ? 200 : 400;
            playTone(60, 0.1, 'sine', 0.35);
            setTimeout(() => {
                if (gameState.oxygen < 30) playTone(60, 0.1, 'sine', 0.3);
            }, speed);
        }
    }, 1000);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
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
    const density = 0.008 + (depth / 30) * 0.015;
    scene.fog.density = Math.min(0.035, density);
}

function addPostProcessing() {
    const overlay = document.createElement('div');
    overlay.id = 'underwater-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '50';
    overlay.style.backgroundColor = 'rgba(0, 50, 100, 0.15)';
    document.body.appendChild(overlay);
    
    setInterval(() => {
        if (gameState.isPlaying && diver) {
            const depth = Math.max(0, -diver.position.y);
            const blueIntensity = Math.min(0.4, 0.15 + depth / 50);
            overlay.style.backgroundColor = `rgba(0, 50, 100, ${blueIntensity})`;
        }
    }, 100);
}

function createBubbleTrail() {
    const now = Date.now();
    if (now - lastBubbleTime > 100 && gameState.isPlaying && diver) {
        lastBubbleTime = now;
        
        const bubbleCount = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < bubbleCount; i++) {
            const bubbleGeometry = new THREE.SphereGeometry(0.08, 8, 8);
            const bubbleMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xaaffff, 
                transparent: true, 
                opacity: 0.6,
                emissive: 0x44aaaa
            });
            const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
            
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                -0.5 - Math.random(),
                (Math.random() - 0.5) * 0.8
            );
            bubble.position.copy(diver.position.clone().add(offset));
            bubble.userData = {
                life: 1,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.05,
                    0.05 + Math.random() * 0.08,
                    (Math.random() - 0.5) * 0.05
                )
            };
            scene.add(bubble);
            bubbleTrail.push(bubble);
        }
    }
    
    for (let i = bubbleTrail.length - 1; i >= 0; i--) {
        const bubble = bubbleTrail[i];
        bubble.userData.life -= 0.02;
        if (bubble.userData.life <= 0) {
            scene.remove(bubble);
            bubbleTrail.splice(i, 1);
        } else {
            bubble.position.add(bubble.userData.velocity);
            bubble.scale.setScalar(bubble.userData.life);
            if (bubble.material) bubble.material.opacity = bubble.userData.life * 0.6;
        }
    }
}

// ===== BIGGER AND BETTER MARINE LIFE CREATION =====
function createMarineLife() {
    // Tropical Fish (unchanged)
    const colors = [0xff6b6b, 0xffe66d, 0x4ecdc4, 0xff9ff3, 0xfeca57];
    for (let i = 0; i < 30; i++) {
        const fishGroup = new THREE.Group();
        
        const bodyGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const fishMat = new THREE.MeshPhongMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
        const body = new THREE.Mesh(bodyGeo, fishMat);
        body.scale.set(1.2, 0.6, 0.4);
        fishGroup.add(body);
        
        const tailGeo = new THREE.ConeGeometry(0.25, 0.5, 8);
        const tail = new THREE.Mesh(tailGeo, fishMat);
        tail.position.x = -0.7;
        tail.rotation.z = Math.PI / 2;
        fishGroup.add(tail);
        
        fishGroup.position.set(
            Math.random() * 80 - 40,
            Math.random() * 20 - 5,
            Math.random() * 80 - 40
        );
        fishGroup.userData = {
            type: 'fish',
            speed: 2 + Math.random() * 3,
            direction: new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * 0.3, Math.random() - 0.5).normalize()
        };
        scene.add(fishGroup);
        tropicalFish.push(fishGroup);
    }
    
    // Sea Turtles (slightly bigger)
    for (let i = 0; i < 3; i++) {
        const turtleGroup = new THREE.Group();
        
        const shellGeo = new THREE.SphereGeometry(0.65, 16, 16);
        const shellMat = new THREE.MeshPhongMaterial({ color: 0x2d6a4f });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        shell.scale.set(1.3, 0.5, 0.9);
        turtleGroup.add(shell);
        
        const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
        const headMat = new THREE.MeshPhongMaterial({ color: 0x40916c });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.x = 0.9;
        turtleGroup.add(head);
        
        turtleGroup.position.set(
            Math.random() * 70 - 35,
            -5 + Math.random() * 10,
            Math.random() * 70 - 35
        );
        turtleGroup.userData = {
            type: 'turtle',
            speed: 1.5,
            direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
        };
        scene.add(turtleGroup);
        seaTurtles.push(turtleGroup);
    }
    
    // Dolphins
    for (let i = 0; i < 2; i++) {
        const dolphinGroup = new THREE.Group();
        
        const bodyGeo = new THREE.CylinderGeometry(0.4, 0.3, 1.5, 16);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x4a90e2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.z = Math.PI / 2;
        dolphinGroup.add(body);
        
        const noseGeo = new THREE.ConeGeometry(0.2, 0.5, 8);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.position.x = 1.0;
        dolphinGroup.add(nose);
        
        dolphinGroup.position.set(
            Math.random() * 60 - 30,
            0 + Math.random() * 15,
            Math.random() * 60 - 30
        );
        dolphinGroup.userData = {
            type: 'dolphin',
            speed: 4,
            direction: new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * 0.5, Math.random() - 0.5).normalize()
        };
        scene.add(dolphinGroup);
        dolphins.push(dolphinGroup);
    }
    
    // Octopus
    for (let i = 0; i < 2; i++) {
        const octoGroup = new THREE.Group();
        
        const bodyGeo = new THREE.SphereGeometry(0.55, 16, 16);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x8b5cf6 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        octoGroup.add(body);
        
        // Add tentacles
        const tentacleGeo = new THREE.CylinderGeometry(0.1, 0.07, 0.8, 6);
        for (let t = 0; t < 6; t++) {
            const tentacle = new THREE.Mesh(tentacleGeo, bodyMat);
            const angle = (t / 6) * Math.PI * 2;
            tentacle.position.set(Math.cos(angle) * 0.6, -0.6, Math.sin(angle) * 0.6);
            tentacle.rotation.z = angle;
            octoGroup.add(tentacle);
        }
        
        octoGroup.position.set(
            Math.random() * 70 - 35,
            -8 + Math.random() * 5,
            Math.random() * 70 - 35
        );
        octoGroup.userData = {
            type: 'octopus',
            speed: 1,
            direction: Math.random() * Math.PI * 2,
            inkCooldown: 0,
            hidden: false
        };
        scene.add(octoGroup);
        octopus.push(octoGroup);
    }
    
    // Treasure Chests (bigger and more noticeable)
    for (let i = 0; i < 5; i++) {
        const chestGroup = new THREE.Group();
        
        const bodyGeo = new THREE.BoxGeometry(0.9, 0.6, 1.2);
        const woodMat = new THREE.MeshPhongMaterial({ color: 0x8b5a2b });
        const body = new THREE.Mesh(bodyGeo, woodMat);
        chestGroup.add(body);
        
        const lidGeo = new THREE.BoxGeometry(0.95, 0.2, 1.25);
        const lid = new THREE.Mesh(lidGeo, woodMat);
        lid.position.y = 0.4;
        chestGroup.add(lid);
        
        // Gold band
        const bandMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
        const bandGeo = new THREE.BoxGeometry(0.95, 0.08, 0.08);
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = 0.1;
        chestGroup.add(band);
        
        // Gold corners
        const cornerGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const corners = [[-0.45, -0.25, 0.55], [0.45, -0.25, 0.55], [-0.45, -0.25, -0.55], [0.45, -0.25, -0.55]];
        corners.forEach(pos => {
            const corner = new THREE.Mesh(cornerGeo, bandMat);
            corner.position.set(pos[0], pos[1], pos[2]);
            chestGroup.add(corner);
        });
        
        chestGroup.position.set(
            Math.random() * 70 - 35,
            -12 + Math.random() * 4,
            Math.random() * 70 - 35
        );
        chestGroup.userData = {
            type: 'treasure',
            collected: false,
            value: 500
        };
        scene.add(chestGroup);
        treasureChests.push(chestGroup);
    }
    
    // ===== BIGGER POWER-UPS (MUCH MORE VISIBLE!) =====
    const powerUpTypes = ['speedBoost', 'shield', 'sonar', 'magnet'];
    const powerUpColors = {
        speedBoost: 0xff3333,
        shield: 0x33ffcc,
        sonar: 0xffcc33,
        magnet: 0xcc33ff
    };
    const powerUpNames = {
        speedBoost: '⚡ SPEED',
        shield: '🛡️ SHIELD',
        sonar: '🔊 SONAR',
        magnet: '🧲 MAGNET'
    };
    
    for (let i = 0; i < 12; i++) {  // Increased from 8 to 12 power-ups
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        const powerUpGroup = new THREE.Group();
        const color = powerUpColors[type];
        
        // Large glowing core (BIGGER!)
        const coreGeo = new THREE.SphereGeometry(0.55, 32, 32);
        const coreMat = new THREE.MeshPhongMaterial({ 
            color: color, 
            emissive: color, 
            emissiveIntensity: 0.6,
            shininess: 100
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        powerUpGroup.add(core);
        
        // Outer glow ring
        const ringGeo = new THREE.SphereGeometry(0.7, 16, 16);
        const ringMat = new THREE.MeshPhongMaterial({ 
            color: color, 
            transparent: true, 
            opacity: 0.3,
            emissive: color
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        powerUpGroup.add(ring);
        
        // Floating particles around power-up (more particles)
        const particleCount = 12;
        for (let p = 0; p < particleCount; p++) {
            const particleGeo = new THREE.SphereGeometry(0.08, 6, 6);
            const particleMat = new THREE.MeshPhongMaterial({ color: color, emissive: color });
            const particle = new THREE.Mesh(particleGeo, particleMat);
            const angle = (p / particleCount) * Math.PI * 2;
            const radius = 0.9;
            particle.position.set(Math.cos(angle) * radius, Math.sin(angle * 2) * 0.5, Math.sin(angle) * radius);
            powerUpGroup.add(particle);
        }
        
        // Add a floating text label
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'Bold 16px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(powerUpNames[type], canvas.width/2, canvas.height/2);
        const texture = new THREE.CanvasTexture(canvas);
        const labelMat = new THREE.SpriteMaterial({ map: texture });
        const label = new THREE.Sprite(labelMat);
        label.scale.set(1.2, 0.6, 1);
        label.position.y = -0.8;
        powerUpGroup.add(label);
        
        powerUpGroup.position.set(
            Math.random() * 70 - 35,
            Math.random() * 20 - 8,
            Math.random() * 70 - 35
        );
        powerUpGroup.userData = {
            type: type,
            collected: false,
            bobOffset: Math.random() * Math.PI * 2,
            rotationSpeed: 0.01 + Math.random() * 0.02
        };
        scene.add(powerUpGroup);
        powerUps.push(powerUpGroup);
    }
}

function updateMarineLife(time, delta) {
    // Tropical fish
    tropicalFish.forEach(fish => {
        fish.position.add(fish.userData.direction.clone().multiplyScalar(fish.userData.speed * delta));
        
        if (Math.abs(fish.position.x) > 45) fish.userData.direction.x *= -1;
        if (Math.abs(fish.position.z) > 45) fish.userData.direction.z *= -1;
        if (fish.position.y > 20) fish.userData.direction.y *= -1;
        if (fish.position.y < -10) fish.userData.direction.y *= -1;
        
        fish.rotation.y = Math.atan2(fish.userData.direction.x, fish.userData.direction.z);
        fish.position.y += Math.sin(time * 2) * 0.01;
    });
    
    // Sea turtles
    seaTurtles.forEach(turtle => {
        turtle.position.add(turtle.userData.direction.clone().multiplyScalar(turtle.userData.speed * delta));
        
        if (Math.abs(turtle.position.x) > 45) turtle.userData.direction.x *= -1;
        if (Math.abs(turtle.position.z) > 45) turtle.userData.direction.z *= -1;
        
        turtle.rotation.y = Math.atan2(turtle.userData.direction.x, turtle.userData.direction.z);
    });
    
    // Dolphins
    dolphins.forEach(dolphin => {
        dolphin.position.add(dolphin.userData.direction.clone().multiplyScalar(dolphin.userData.speed * delta));
        
        if (Math.abs(dolphin.position.x) > 45) dolphin.userData.direction.x *= -1;
        if (Math.abs(dolphin.position.z) > 45) dolphin.userData.direction.z *= -1;
        if (dolphin.position.y > 15) dolphin.userData.direction.y *= -1;
        if (dolphin.position.y < -5) dolphin.userData.direction.y *= -1;
        
        dolphin.rotation.y = Math.atan2(dolphin.userData.direction.x, dolphin.userData.direction.z);
    });
    
    // Octopus
    octopus.forEach(octo => {
        if (octo.userData.inkCooldown > 0) {
            octo.userData.inkCooldown -= delta;
        }
        
        const angle = octo.userData.direction + octo.userData.speed * delta;
        octo.position.x += Math.cos(angle) * 0.5 * delta;
        octo.position.z += Math.sin(angle) * 0.5 * delta;
        octo.userData.direction = angle;
        
        if (diver && !octo.userData.hidden && octo.userData.inkCooldown <= 0 && 
            octo.position.distanceTo(diver.position) < 4) {
            octo.userData.hidden = true;
            octo.visible = false;
            octo.userData.inkCooldown = 8;
            
            const inkCloud = new THREE.Mesh(
                new THREE.SphereGeometry(2, 16, 16),
                new THREE.MeshPhongMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.7 })
            );
            inkCloud.position.copy(diver.position);
            scene.add(inkCloud);
            setTimeout(() => scene.remove(inkCloud), 2000);
            
            const blindDiv = document.createElement('div');
            blindDiv.style.position = 'fixed';
            blindDiv.style.top = '0';
            blindDiv.style.left = '0';
            blindDiv.style.width = '100%';
            blindDiv.style.height = '100%';
            blindDiv.style.backgroundColor = 'black';
            blindDiv.style.zIndex = '1000';
            blindDiv.style.transition = 'opacity 2s';
            document.body.appendChild(blindDiv);
            setTimeout(() => blindDiv.style.opacity = '0', 100);
            setTimeout(() => blindDiv.remove(), 2000);
            
            setTimeout(() => {
                octo.visible = true;
                octo.userData.hidden = false;
            }, 5000);
        }
    });
}

function updateTreasureAndPowerups() {
    // Treasure chests - NO magnet attraction! Must swim to them
    treasureChests.forEach(chest => {
        if (chest.userData.collected) return;
        
        // Add floating animation
        chest.position.y += Math.sin(Date.now() * 0.002) * 0.005;
        chest.rotation.y += 0.01;
        
        // NO MAGNET EFFECT for treasure chests - must swim to them manually
        if (diver && chest.position.distanceTo(diver.position) < 2.5) {
            chest.userData.collected = true;
            chest.visible = false;
            gameState.score += chest.userData.value;
            updateUI();
            if (sounds.treasure) sounds.treasure();
            
            const notif = document.createElement('div');
            notif.textContent = `💰 +${chest.userData.value} TREASURE! 💰`;
            notif.style.position = 'fixed';
            notif.style.top = '30%';
            notif.style.left = '50%';
            notif.style.transform = 'translate(-50%, -50%)';
            notif.style.backgroundColor = 'rgba(0,0,0,0.9)';
            notif.style.color = '#ffd700';
            notif.style.padding = '20px 40px';
            notif.style.borderRadius = '50px';
            notif.style.fontFamily = 'Orbitron, monospace';
            notif.style.fontSize = '28px';
            notif.style.fontWeight = 'bold';
            notif.style.zIndex = '1000';
            notif.style.border = '3px solid #ffd700';
            notif.style.boxShadow = '0 0 30px #ffd700';
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 2000);
        }
    });
    
    // Power-ups (remain the same, no changes needed)
    const now = Date.now() / 1000;
    
    if (activePowerUps.speedBoost.active && now > activePowerUps.speedBoost.endTime) {
        activePowerUps.speedBoost.active = false;
        diverSpeed = originalDiverSpeed;
    }
    if (activePowerUps.shield.active && now > activePowerUps.shield.endTime) {
        activePowerUps.shield.active = false;
    }
    if (activePowerUps.magnet.active && now > activePowerUps.magnet.endTime) {
        activePowerUps.magnet.active = false;
    }
    if (activePowerUps.sonar.active && now > activePowerUps.sonar.endTime) {
        activePowerUps.sonar.active = false;
    }
    
    powerUps.forEach(powerUp => {
        if (powerUp.userData.collected) return;
        
        // Animate power-up
        powerUp.position.y += Math.sin(Date.now() * 0.003 + powerUp.userData.bobOffset) * 0.015;
        powerUp.rotation.y += powerUp.userData.rotationSpeed;
        powerUp.rotation.x += 0.01;
        powerUp.rotation.z += 0.005;
        
        // Pulse scale
        const scale = 1 + Math.sin(Date.now() * 0.008) * 0.1;
        if (powerUp.children[0]) powerUp.children[0].scale.set(scale, scale, scale);
        
        if (diver && powerUp.position.distanceTo(diver.position) < 2) {
            powerUp.userData.collected = true;
            powerUp.visible = false;
            
            const type = powerUp.userData.type;
            if (type === 'speedBoost') {
                activePowerUps.speedBoost.active = true;
                activePowerUps.speedBoost.endTime = now + 10;
                diverSpeed = 28;
            } else if (type === 'shield') {
                activePowerUps.shield.active = true;
                activePowerUps.shield.endTime = now + 15;
            } else if (type === 'sonar') {
                activePowerUps.sonar.active = true;
                activePowerUps.sonar.endTime = now + 8;
                starfish.forEach(star => {
                    if (!star.userData.collected && star.material) {
                        star.material.emissiveIntensity = 1.2;
                        setTimeout(() => {
                            if (star.material) star.material.emissiveIntensity = 0.2;
                        }, 8000);
                    }
                });
            } else if (type === 'magnet') {
                activePowerUps.magnet.active = true;
                activePowerUps.magnet.endTime = now + 12;
            }
            
            if (sounds.powerUp) sounds.powerUp();
            
            let color = '#ffd700', text = 'POWER-UP!';
            if (type === 'speedBoost') { color = '#ff6b6b'; text = '⚡ SPEED BOOST! ⚡'; }
            else if (type === 'shield') { color = '#4ecdc4'; text = '🛡️ SHIELD ACTIVE! 🛡️'; }
            else if (type === 'sonar') { color = '#feca57'; text = '🔊 SONAR PING! 🔊'; }
            else if (type === 'magnet') { color = '#ff9ff3'; text = '🧲 MAGNET ACTIVE! 🧲'; }
            
            const notif = document.createElement('div');
            notif.textContent = text;
            notif.style.position = 'fixed';
            notif.style.top = '30%';
            notif.style.left = '50%';
            notif.style.transform = 'translate(-50%, -50%)';
            notif.style.backgroundColor = 'rgba(0,0,0,0.9)';
            notif.style.color = color;
            notif.style.padding = '20px 40px';
            notif.style.borderRadius = '50px';
            notif.style.fontFamily = 'Orbitron, monospace';
            notif.style.fontSize = '28px';
            notif.style.fontWeight = 'bold';
            notif.style.zIndex = '1000';
            notif.style.border = `3px solid ${color}`;
            notif.style.boxShadow = `0 0 30px ${color}`;
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 2000);
        }
    });
}

// ===== BIGGER STARFISH AND PEARLS =====
function createStarfish() {
    const starShape = new THREE.Shape();
    const arms = 5;
    const outerRadius = 1.0;  // BIGGER!
    const innerRadius = 0.4;
    
    for (let i = 0; i < arms * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / arms;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) starShape.moveTo(x, y);
        else starShape.lineTo(x, y);
    }
    starShape.closePath();

    const starGeometry = new THREE.ExtrudeGeometry(starShape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 });
    const starMaterial = new THREE.MeshPhongMaterial({ color: 0xff5555, emissive: 0xff2222, emissiveIntensity: 0.4 });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(Math.random() * 80 - 40, Math.random() * 30 - 15, Math.random() * 80 - 40);
    star.rotation.x = -Math.PI / 2;
    star.userData = { type: 'starfish', collected: false, bobOffset: Math.random() * Math.PI * 2 };
    scene.add(star);
    starfish.push(star);
}

function createPearl() {
    const pearlGeometry = new THREE.SphereGeometry(0.55, 24, 24);  // BIGGER!
    const pearlMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x44aaff, emissiveIntensity: 0.3, shininess: 100 });
    const pearl = new THREE.Mesh(pearlGeometry, pearlMaterial);
    pearl.position.set(Math.random() * 80 - 40, Math.random() * 30 - 15, Math.random() * 80 - 40);
    pearl.userData = { type: 'pearl', collected: false, bobOffset: Math.random() * Math.PI * 2 };
    scene.add(pearl);
    pearls.push(pearl);
}

// ===== INITIALIZE =====
function init() {
    console.log("Starting Ocean Rescue with BIGGER Power-Ups & Collectibles!");
    
    initAudio();
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a1628);
    document.body.insertBefore(renderer.domElement, document.body.firstChild);

    clock = new THREE.Clock();

    createOcean();
    createLighting();
    createSeaBed();
    createDiver();
    createCoralReefs();
    createCollectibles();
    createEnemies();
    createBubbleParticles();
    
    // New visual effects
    causticLights = createCaustics();
    createDepthFog();
    addPostProcessing();
    createMarineLife();

    setupEventListeners();
    animate();
    initGamepadSupport();

    console.log("Game ready!");
    showStartScreen();
    
    addMouseInstruction();
    addQuitButton();
    addSoundToggleButton();
    addVolumeControl();
}

// [All the other functions (createOcean, createLighting, createSeaBed, createDiver, 
// createCoralReefs, createEnemies, createBubbleParticles, setupEventListeners, 
// initGamepadSupport, updateGamepadInput, startGame, startTimer, updateUI, endGame, 
// restartGame, updateDiver, updateCollectibles, updateEnemies, flashDamage, 
// updateBubbles, animate, etc. remain exactly the same as your working version]

// I'll continue with the rest of the functions - they stay the same as your working version
// [The following functions remain unchanged from your working game.js]

function createOcean() {
    const oceanGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const oceanMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a3a5c,
        transparent: true,
        opacity: 0.8,
        shininess: 100,
        side: THREE.DoubleSide
    });
    ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = 30;
    scene.add(ocean);

    const floorGeometry = new THREE.PlaneGeometry(200, 200);
    const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x0a1628, side: THREE.DoubleSide });
    const seaBed = new THREE.Mesh(floorGeometry, floorMaterial);
    seaBed.rotation.x = -Math.PI / 2;
    seaBed.position.y = -20;
    scene.add(seaBed);
}

function createLighting() {
    const ambientLight = new THREE.AmbientLight(0x4da8da, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(10, 50, 10);
    scene.add(sunLight);

    const pointLight1 = new THREE.PointLight(0x00fff7, 0.6, 60);
    pointLight1.position.set(-20, 10, -20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00a8cc, 0.6, 60);
    pointLight2.position.set(20, 5, 20);
    scene.add(pointLight2);
    
    // Add a backlight for better visibility
    const backLight = new THREE.PointLight(0x4da8da, 0.4, 80);
    backLight.position.set(0, 0, -20);
    scene.add(backLight);
}

function createSeaBed() {
    const bedGeometry = new THREE.PlaneGeometry(120, 120);
    const bedMaterial = new THREE.MeshLambertMaterial({ color: 0xc2b280 });
    const sandBed = new THREE.Mesh(bedGeometry, bedMaterial);
    sandBed.rotation.x = -Math.PI / 2;
    sandBed.position.y = -18;
    scene.add(sandBed);

    for (let i = 0; i < 25; i++) {
        const rockGeometry = new THREE.DodecahedronGeometry(Math.random() * 1.5 + 0.6);
        const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x6a6a6a });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(Math.random() * 90 - 45, -17.5, Math.random() * 90 - 45);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        scene.add(rock);
    }
}

function createDiver() {
    const diverGroup = new THREE.Group();

    const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.8, 2.2, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x3a3a5a });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    diverGroup.add(body);

    const headGeometry = new THREE.SphereGeometry(0.65, 24, 24);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffccaa });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.x = 1.3;
    diverGroup.add(head);

    const gogglesGeometry = new THREE.BoxGeometry(0.5, 0.35, 0.9);
    const gogglesMaterial = new THREE.MeshPhongMaterial({ color: 0x00fff7, emissive: 0x00fff7, emissiveIntensity: 0.4 });
    const goggles = new THREE.Mesh(gogglesGeometry, gogglesMaterial);
    goggles.position.set(1.6, 0.1, 0);
    diverGroup.add(goggles);

    const tankGeometry = new THREE.CylinderGeometry(0.45, 0.45, 1.6, 16);
    const tankMaterial = new THREE.MeshPhongMaterial({ color: 0xff8888 });
    const tank = new THREE.Mesh(tankGeometry, tankMaterial);
    tank.position.set(-1.1, -0.3, 0);
    diverGroup.add(tank);

    const finGeometry = new THREE.BoxGeometry(0.9, 0.12, 1.3);
    const finMaterial = new THREE.MeshPhongMaterial({ color: 0x00ccff });
    
    const finLeft = new THREE.Mesh(finGeometry, finMaterial);
    finLeft.position.set(-1.6, -0.9, 0.6);
    diverGroup.add(finLeft);

    const finRight = new THREE.Mesh(finGeometry, finMaterial);
    finRight.position.set(-1.6, -0.9, -0.6);
    diverGroup.add(finRight);

    const armGeometry = new THREE.CylinderGeometry(0.23, 0.23, 1.3, 8);
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0x3a3a5a });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.9, 0.35, 0.9);
    leftArm.rotation.z = Math.PI / 3;
    diverGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(-0.9, 0.35, -0.9);
    rightArm.rotation.z = Math.PI / 3;
    diverGroup.add(rightArm);

    diverGroup.position.set(0, 0, 0);
    scene.add(diverGroup);
    diver = diverGroup;
}

function createCoralReefs() {
    const coralColors = [0xff6b6b, 0xff8e53, 0xffd93d, 0x6bcb77, 0x4d96ff];
    
    for (let i = 0; i < 30; i++) {
        const coralGroup = new THREE.Group();
        const height = Math.random() * 3.5 + 1.2;
        const coralGeometry = new THREE.ConeGeometry(0.6 + Math.random() * 0.6, height, 8);
        const coralMaterial = new THREE.MeshPhongMaterial({ color: coralColors[Math.floor(Math.random() * coralColors.length)] });
        const coralMesh = new THREE.Mesh(coralGeometry, coralMaterial);
        coralMesh.position.y = height / 2;
        coralGroup.add(coralMesh);
        coralGroup.position.set(Math.random() * 85 - 42.5, -17, Math.random() * 85 - 42.5);
        scene.add(coralGroup);
        coral.push(coralGroup);
    }
}

function createCollectibles() {
    for (let i = 0; i < 20; i++) createStarfish();  // More starfish
    for (let i = 0; i < 15; i++) createPearl();     // More pearls
}

function createEnemies() {
    const sharkCount = gameState.difficulty === 'easy' ? 3 : gameState.difficulty === 'normal' ? 5 : 7;
    const jellyCount = gameState.difficulty === 'easy' ? 4 : gameState.difficulty === 'normal' ? 6 : 8;

    for (let i = 0; i < sharkCount; i++) createShark();
    for (let i = 0; i < jellyCount; i++) createJellyfish();
}

function createShark() {
    const sharkGroup = new THREE.Group();
    
    const bodyGeometry = new THREE.CylinderGeometry(0.7, 0.5, 3, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x5a5a6a });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    sharkGroup.add(body);

    const headGeometry = new THREE.ConeGeometry(0.8, 1.4, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.x = 2.0;
    sharkGroup.add(head);

    const tailGeometry = new THREE.ConeGeometry(0.6, 1.4, 8);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.rotation.z = -Math.PI / 2;
    tail.position.x = -2.2;
    sharkGroup.add(tail);

    const finGeometry = new THREE.ConeGeometry(0.45, 0.9, 8);
    const fin = new THREE.Mesh(finGeometry, bodyMaterial);
    fin.position.y = 0.7;
    sharkGroup.add(fin);

    sharkGroup.position.set(Math.random() * 80 - 40, Math.random() * 12 - 4, Math.random() * 80 - 40);
    sharkGroup.userData = { 
        type: 'shark', 
        speed: 4.5,
        chaseSpeed: 7,
        direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
    };
    scene.add(sharkGroup);
    sharks.push(sharkGroup);
}

function createJellyfish() {
    const jellyGroup = new THREE.Group();
    const bellGeometry = new THREE.SphereGeometry(0.9, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const bellMaterial = new THREE.MeshPhongMaterial({ color: 0xffaaff, transparent: true, opacity: 0.7, emissive: 0xff44aa, emissiveIntensity: 0.2 });
    const bell = new THREE.Mesh(bellGeometry, bellMaterial);
    jellyGroup.add(bell);

    for (let i = 0; i < 8; i++) {
        const tentacleGeometry = new THREE.CylinderGeometry(0.07, 0.03, 2.2, 6);
        const tentacleMaterial = new THREE.MeshPhongMaterial({ color: 0xff88cc, transparent: true, opacity: 0.6 });
        const tentacle = new THREE.Mesh(tentacleGeometry, tentacleMaterial);
        tentacle.position.set(Math.cos(i * Math.PI / 4) * 0.6, -1.1, Math.sin(i * Math.PI / 4) * 0.6);
        jellyGroup.add(tentacle);
    }

    jellyGroup.position.set(Math.random() * 80 - 40, Math.random() * 22, Math.random() * 80 - 40);
    jellyGroup.userData = { 
        type: 'jellyfish', 
        speed: gameState.difficulty === 'easy' ? 2 : gameState.difficulty === 'normal' ? 3.5 : 5,
        direction: Math.random() * Math.PI * 2,
        pulsePhase: Math.random() * Math.PI * 2
    };
    scene.add(jellyGroup);
    jellyfish.push(jellyGroup);
}

function createBubbleParticles() {
    const bubbleGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const bubbleMaterial = new THREE.MeshPhongMaterial({ color: 0xccffff, transparent: true, opacity: 0.5 });

    for (let i = 0; i < 150; i++) {
        const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial.clone());
        bubble.position.set(Math.random() * 90 - 45, Math.random() * 60 - 20, Math.random() * 90 - 45);
        bubble.userData = { speed: Math.random() * 2.5 + 1, wobble: Math.random() * Math.PI * 2 };
        scene.add(bubble);
        bubbles.push(bubble);
    }
}

// ===== UI FUNCTIONS =====
function addQuitButton() {
    const quitBtn = document.createElement('button');
    quitBtn.id = 'quit-btn';
    quitBtn.innerHTML = '🚪 QUIT TO MENU';
    quitBtn.style.position = 'fixed';
    quitBtn.style.bottom = '20px';
    quitBtn.style.right = '20px';
    quitBtn.style.padding = '14px 28px';
    quitBtn.style.backgroundColor = 'rgba(255, 71, 87, 0.95)';
    quitBtn.style.color = 'white';
    quitBtn.style.border = 'none';
    quitBtn.style.borderRadius = '12px';
    quitBtn.style.fontFamily = 'Orbitron, monospace';
    quitBtn.style.fontSize = '14px';
    quitBtn.style.fontWeight = 'bold';
    quitBtn.style.cursor = 'pointer';
    quitBtn.style.zIndex = '200';
    quitBtn.style.transition = 'all 0.2s';
    document.body.appendChild(quitBtn);
    
    quitBtn.onmouseenter = () => { quitBtn.style.transform = 'scale(1.05)'; };
    quitBtn.onmouseleave = () => { quitBtn.style.transform = 'scale(1)'; };
    
    quitBtn.onclick = () => {
        if (gameState.isPlaying) endGame(false);
        stopBackgroundMusic();
        stopHeartbeat();
        gameState.isPlaying = false;
        document.getElementById('start-screen').style.display = 'flex';
        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('gameover-screen').style.display = 'none';
        document.getElementById('victory-screen').style.display = 'none';
        if (diver) diver.position.set(0, 0, 0);
        mouseLookEnabled = false;
        document.body.style.cursor = 'auto';
    };
}

function addSoundToggleButton() {
    const soundBtn = document.createElement('button');
    soundBtn.id = 'sound-btn';
    soundBtn.innerHTML = '🔊 MUSIC ON';
    soundBtn.style.position = 'fixed';
    soundBtn.style.bottom = '20px';
    soundBtn.style.left = '20px';
    soundBtn.style.padding = '14px 28px';
    soundBtn.style.backgroundColor = 'rgba(0, 168, 204, 0.95)';
    soundBtn.style.color = 'white';
    soundBtn.style.border = 'none';
    soundBtn.style.borderRadius = '12px';
    soundBtn.style.fontFamily = 'Orbitron, monospace';
    soundBtn.style.fontSize = '14px';
    soundBtn.style.fontWeight = 'bold';
    soundBtn.style.cursor = 'pointer';
    soundBtn.style.zIndex = '200';
    soundBtn.style.transition = 'all 0.2s';
    document.body.appendChild(soundBtn);
    
    soundBtn.onmouseenter = () => { soundBtn.style.transform = 'scale(1.05)'; };
    soundBtn.onmouseleave = () => { soundBtn.style.transform = 'scale(1)'; };
    
    soundBtn.onclick = () => {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
            soundBtn.innerHTML = '🔊 MUSIC ON';
            soundBtn.style.backgroundColor = 'rgba(0, 168, 204, 0.95)';
            if (gameState.isPlaying) startBackgroundMusic();
        } else {
            soundBtn.innerHTML = '🔇 MUSIC OFF';
            soundBtn.style.backgroundColor = 'rgba(100, 100, 100, 0.95)';
            stopBackgroundMusic();
        }
    };
}

function addVolumeControl() {
    const volumeContainer = document.createElement('div');
    volumeContainer.style.position = 'fixed';
    volumeContainer.style.top = '20px';
    volumeContainer.style.right = '20px';
    volumeContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
    volumeContainer.style.padding = '12px 18px';
    volumeContainer.style.borderRadius = '12px';
    volumeContainer.style.zIndex = '200';
    volumeContainer.style.fontFamily = 'Orbitron, monospace';
    volumeContainer.style.fontSize = '12px';
    volumeContainer.style.color = '#00fff7';
    volumeContainer.style.border = '1px solid #00fff7';
    
    volumeContainer.innerHTML = `
        <div style="margin-bottom: 8px;">🔊 VOLUME</div>
        <input type="range" id="volume-slider" min="0" max="100" value="65" style="width: 130px;">
    `;
    document.body.appendChild(volumeContainer);
    
    const slider = document.getElementById('volume-slider');
    slider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        if (backgroundAudio) backgroundAudio.volume = volume * 0.6;
        if (masterGain) masterGain.gain.value = volume * 0.8;
    });
}

function addMouseInstruction() {
    const instruction = document.createElement('div');
    instruction.id = 'mouse-instruction';
    instruction.innerHTML = '🖱️ CLICK GAME TO LOOK | ESC TO RELEASE | 🎵 MUSIC | ⚡ POWER-UPS ARE BIG & COLORFUL!';
    instruction.style.position = 'fixed';
    instruction.style.bottom = '80px';
    instruction.style.right = '20px';
    instruction.style.backgroundColor = 'rgba(0,0,0,0.8)';
    instruction.style.color = '#00fff7';
    instruction.style.padding = '10px 18px';
    instruction.style.borderRadius = '25px';
    instruction.style.fontSize = '11px';
    instruction.style.fontFamily = 'Orbitron, monospace';
    instruction.style.zIndex = '200';
    instruction.style.pointerEvents = 'none';
    instruction.style.border = '1px solid #00fff7';
    document.body.appendChild(instruction);
}

function showStartScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'flex';
}

// ===== GAME FUNCTIONS =====
function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'w') keys.w = true;
        if (e.key.toLowerCase() === 'a') keys.a = true;
        if (e.key.toLowerCase() === 's') keys.s = true;
        if (e.key.toLowerCase() === 'd') keys.d = true;
        if (e.key === ' ') { keys.space = true; e.preventDefault(); }
        if (e.key === 'Shift') { keys.shift = true; e.preventDefault(); }
        if (e.key === 'Escape') {
            mouseLookEnabled = false;
            document.body.style.cursor = 'auto';
            document.exitPointerLock?.();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key.toLowerCase() === 'w') keys.w = false;
        if (e.key.toLowerCase()=== 'a') keys.a = false;
        if (e.key.toLowerCase() === 's') keys.s = false;
        if (e.key.toLowerCase() === 'd') keys.d = false;
        if (e.key === ' ') keys.space = false;
        if (e.key === 'Shift') keys.shift = false;
    });

    renderer.domElement.addEventListener('click', () => {
        if (gameState.isPlaying) {
            mouseLookEnabled = true;
            renderer.domElement.requestPointerLock();
            document.body.style.cursor = 'none';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (mouseLookEnabled && gameState.isPlaying) {
            targetRotationX += e.movementX * 0.003;
            targetRotationY += e.movementY * 0.003;
            targetRotationY = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, targetRotationY));
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
    window.addEventListener('gamepadconnected', (e) => {
        console.log('Gamepad connected:', e.gamepad.id);
        gamepadConnected = true;
    });
    window.addEventListener('gamepaddisconnected', () => { gamepadConnected = false; });
}

function updateGamepadInput() {
    if (!gamepadConnected) return;
    const gamepad = navigator.getGamepads()[0];
    if (!gamepad) return;
    
    const deadZone = 0.15;
    
    // LEFT STICK - Movement (WASD)
    let rawX = gamepad.axes[0] || 0;
    let rawY = gamepad.axes[1] || 0;
    
    gamepadMoveX = Math.abs(rawX) > deadZone ? rawX : 0;
    gamepadMoveZ = Math.abs(rawY) > deadZone ? rawY : 0;
    
    // RIGHT STICK - Camera control (Mouse look)
    // Most controllers use axes 2 and 3 for right stick
    if (gamepad.axes.length > 3) {
        let rightX = gamepad.axes[2] || 0;
        let rightY = gamepad.axes[3] || 0;
        
        // Apply deadzone to right stick
        let camX = Math.abs(rightX) > deadZone ? rightX : 0;
        let camY = Math.abs(rightY) > deadZone ? rightY : 0;
        
        // If right stick is being used, control camera
        if (camX !== 0 || camY !== 0) {
            // Sensitivity for camera (adjustable)
            const cameraSensitivity = 0.008;
            
            // Update camera rotation (same as mouse)
            targetRotationX += camX * cameraSensitivity;
            targetRotationY += camY * cameraSensitivity;
            
            // Limit vertical rotation (can't look too far up/down)
            targetRotationY = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, targetRotationY));
        }
    }
    
    // Alternative: Some controllers use axes 4 and 5 for right stick
    if (gamepad.axes.length > 5 && gamepad.axes[2] === 0 && gamepad.axes[3] === 0) {
        let altRightX = gamepad.axes[4] || 0;
        let altRightY = gamepad.axes[5] || 0;
        
        let camX = Math.abs(altRightX) > deadZone ? altRightX : 0;
        let camY = Math.abs(altRightY) > deadZone ? altRightY : 0;
        
        if (camX !== 0 || camY !== 0) {
            const cameraSensitivity = 0.008;
            targetRotationX += camX * cameraSensitivity;
            targetRotationY += camY * cameraSensitivity;
            targetRotationY = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, targetRotationY));
        }
    }
    
    // ASCEND/DESCEND - Shoulder buttons or triggers
    gamepadAscend = 0;
    
    // Left shoulder (L1) - Ascend
    if (gamepad.buttons[4] && gamepad.buttons[4].pressed) {
        gamepadAscend = 1;
    }
    // Right shoulder (R1) - Descend
    if (gamepad.buttons[5] && gamepad.buttons[5].pressed) {
        gamepadAscend = -1;
    }
    
    // Alternative: Triggers for ascend/descend
    if (gamepadAscend === 0 && gamepad.axes.length > 4) {
        let leftTrigger = gamepad.axes[4] || 0;
        let rightTrigger = gamepad.axes[5] || 0;
        if (leftTrigger > 0.3) {
            gamepadAscend = leftTrigger;
        } else if (rightTrigger > 0.3) {
            gamepadAscend = -rightTrigger;
        }
    }
    
    // START GAME / RESTART with A button (button 0)
    if (gamepad.buttons[0] && gamepad.buttons[0].pressed) {
        if (!gameState.isPlaying && !gameState.isGameOver && !gameState.isVictory) {
            startGame();
        }
    }
    
    // RESTART with Start button (button 9) when game over
    if (gamepad.buttons[9] && gamepad.buttons[9].pressed) {
        if (gameState.isGameOver || gameState.isVictory) {
            restartGame();
        }
    }
}

function startGame() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => startBackgroundMusic());
    } else {
        startBackgroundMusic();
    }
    startHeartbeat();
    
    diverSpeed = originalDiverSpeed;
    activePowerUps = { speedBoost: { active: false, endTime: 0 }, shield: { active: false, endTime: 0 }, sonar: { active: false, endTime: 0 }, magnet: { active: false, endTime: 0 } };
    
    if (gameState.difficulty === 'easy') {
        gameState.targetStarfish = 12;
        gameState.timeLeft = 200;
    } else if (gameState.difficulty === 'normal') {
        gameState.targetStarfish = 15;
        gameState.timeLeft = 170;
    } else {
        gameState.targetStarfish = 18;
        gameState.timeLeft = 140;
    }

    gameState.score = 0;
    gameState.oxygen = 100;
    gameState.starfishCollected = 0;
    gameState.isPlaying = true;
    gameState.isGameOver = false;
    gameState.isVictory = false;
    gameState.hitCooldown = 0;
    gameState.combo = 0;

    if (diver) diver.position.set(0, 0, 0);

    sharks.forEach(shark => scene.remove(shark));
    jellyfish.forEach(jelly => scene.remove(jelly));
    sharks = [];
    jellyfish = [];
    createEnemies();

    starfish.forEach(star => { star.userData.collected = false; star.visible = true; });
    pearls.forEach(pearl => { pearl.userData.collected = false; pearl.visible = true; });
    
    // Reset power-ups
    powerUps.forEach(powerUp => { powerUp.userData.collected = false; powerUp.visible = true; });

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'flex';
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'none';

    updateUI();
    startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameState.isPlaying) return;
        gameState.timeLeft--;
        gameState.oxygen = Math.max(0, gameState.oxygen - 0.25);
        updateUI();
        if (gameState.timeLeft <= 0 || gameState.oxygen <= 0) endGame(false);
    }, 1000);
}

function updateUI() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) scoreElement.textContent = gameState.score;
    
    const minutes = Math.floor(Math.max(0, gameState.timeLeft) / 60);
    const seconds = Math.floor(Math.max(0, gameState.timeLeft) % 60);
    const timerElement = document.getElementById('timer');
    if (timerElement) timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const oxygenFill = document.getElementById('oxygen-fill');
    if (oxygenFill) oxygenFill.style.width = `${Math.max(0, gameState.oxygen)}%`;
    
    const targetElement = document.getElementById('target');
    if (targetElement) targetElement.textContent = `${gameState.starfishCollected}/${gameState.targetStarfish}`;
}

function endGame(victory) {
    gameState.isPlaying = false;
    gameState.isGameOver = true;
    clearInterval(timerInterval);
    mouseLookEnabled = false;
    document.body.style.cursor = 'auto';
    stopHeartbeat();
    stopBackgroundMusic();

    const finalScore = gameState.score + (gameState.starfishCollected * 100) + Math.max(0, gameState.timeLeft * 10);

    if (victory) {
        if (soundEnabled && sounds.victory) sounds.victory();
        const victoryScore = document.getElementById('victory-score');
        if (victoryScore) victoryScore.textContent = finalScore;
        document.getElementById('victory-screen').style.display = 'flex';
    } else {
        if (soundEnabled && sounds.gameOver) sounds.gameOver();
        const finalScoreElement = document.getElementById('final-score');
        if (finalScoreElement) finalScoreElement.textContent = finalScore;
        const gameoverTitle = document.getElementById('gameover-title');
        if (gameoverTitle) gameoverTitle.textContent = gameState.oxygen <= 0 ? '💀 OUT OF OXYGEN! 💀' : '⏰ TIME UP! ⏰';
        document.getElementById('gameover-screen').style.display = 'flex';
    }
    document.getElementById('game-ui').style.display = 'none';
}

function restartGame() {
    gameState.score = 0;
    gameState.oxygen = 100;
    gameState.starfishCollected = 0;
    gameState.isPlaying = true;
    gameState.isGameOver = false;
    gameState.isVictory = false;
    gameState.hitCooldown = 0;
    gameState.combo = 0;
    
    if (diver) diver.position.set(0, 0, 0);

    starfish.forEach(star => { star.userData.collected = false; star.visible = true; });
    pearls.forEach(pearl => { pearl.userData.collected = false; pearl.visible = true; });
    powerUps.forEach(powerUp => { powerUp.userData.collected = false; powerUp.visible = true; });
    
    sharks.forEach(shark => scene.remove(shark));
    jellyfish.forEach(jelly => scene.remove(jelly));
    sharks = [];
    jellyfish = [];
    createEnemies();

    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'flex';

    updateUI();
    startTimer();
    startBackgroundMusic();
    startHeartbeat();
}

function updateDiver(delta) {
    if (!diver || !gameState.isPlaying) return;

    const speed = diverSpeed * delta;
    let moveX = 0, moveZ = 0, moveY = 0;

    let inputX = 0, inputZ = 0;
    if (keys.d) inputX = 1;
    if (keys.a) inputX = -1;
    if (keys.s) inputZ = 1;
    if (keys.w) inputZ = -1;
    if (keys.space) moveY = 1;
    if (keys.shift) moveY = -1;

    if (gamepadConnected) {
        updateGamepadInput();
        if (Math.abs(gamepadMoveX) > 0.1) inputX = gamepadMoveX;
        if (Math.abs(gamepadMoveZ) > 0.1) inputZ = gamepadMoveZ;
        if (Math.abs(gamepadAscend) > 0.1) moveY = gamepadAscend;
    }

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    const forward = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    
    let moveDelta = new THREE.Vector3();
    moveDelta.addScaledVector(forward, inputZ);
    moveDelta.addScaledVector(right, inputX);
    
    diver.position.x += moveDelta.x * speed;
    diver.position.z += moveDelta.z * speed;
    diver.position.y += moveY * speed;

    diver.position.x = Math.max(-48, Math.min(48, diver.position.x));
    diver.position.y = Math.max(-18, Math.min(28, diver.position.y));
    diver.position.z = Math.max(-48, Math.min(48, diver.position.z));

    currentRotationX += (targetRotationX - currentRotationX) * 0.1;
    currentRotationY += (targetRotationY - currentRotationY) * 0.1;
    
    const radius = cameraDistance;
    const xOffset = Math.sin(currentRotationX) * Math.cos(currentRotationY) * radius;
    const yOffset = Math.sin(currentRotationY) * radius + cameraHeight;
    const zOffset = Math.cos(currentRotationX) * Math.cos(currentRotationY) * radius;
    
    camera.position.x = diver.position.x + xOffset;
    camera.position.y = diver.position.y + yOffset;
    camera.position.z = diver.position.z + zOffset;
    camera.lookAt(diver.position);
}

function updateCollectibles(time) {
    if (!gameState.isPlaying) return;

    const magnetActive = activePowerUps.magnet.active;
    const magnetRange = 8;
    const magnetPullStrength = 0.15;
    
    // Reset magnet counter when power-up first activates
    if (magnetActive && !window._magnetActiveFlag) {
        window._magnetActiveFlag = true;
        window._magnetCollectCount = 0;
        
        // Show notification about limit
        const limitNotif = document.createElement('div');
        limitNotif.textContent = '🧲 MAGNET ACTIVE - Will pull 3 starfish! 🧲';
        limitNotif.style.position = 'fixed';
        limitNotif.style.top = '25%';
        limitNotif.style.left = '50%';
        limitNotif.style.transform = 'translate(-50%, -50%)';
        limitNotif.style.backgroundColor = 'rgba(0,0,0,0.9)';
        limitNotif.style.color = '#ff9ff3';
        limitNotif.style.padding = '15px 30px';
        limitNotif.style.borderRadius = '50px';
        limitNotif.style.fontFamily = 'Orbitron, monospace';
        limitNotif.style.fontSize = '20px';
        limitNotif.style.fontWeight = 'bold';
        limitNotif.style.border = '2px solid #ff9ff3';
        limitNotif.style.zIndex = '1000';
        document.body.appendChild(limitNotif);
        setTimeout(function() { if(limitNotif && limitNotif.remove) limitNotif.remove(); }, 2500);
    }
    
    // Reset flag when magnet expires
    if (!magnetActive && window._magnetActiveFlag) {
        window._magnetActiveFlag = false;
        window._magnetCollectCount = 0;
    }
    
    // Initialize counters if not exist
    if (window._magnetCollectCount === undefined) window._magnetCollectCount = 0;
    
    // Starfish collection with LIMITED magnet (only 3 pulls)
    for (var i = 0; i < starfish.length; i++) {
        var star = starfish[i];
        if (star.userData.collected) continue;
        
        star.position.y += Math.sin(time * 2 + star.userData.bobOffset) * 0.015;
        star.rotation.z += 0.025;
        
        // MAGNET EFFECT - only pulls up to 3 starfish
        if (magnetActive && diver && window._magnetCollectCount < 3) {
            var distance = star.position.distanceTo(diver.position);
            
            // Only pull starfish that are within range and not too close already
            if (distance > 2 && distance < magnetRange) {
                var toDiver = new THREE.Vector3().subVectors(diver.position, star.position).normalize();
                star.position.x += toDiver.x * magnetPullStrength;
                star.position.z += toDiver.z * magnetPullStrength;
                star.position.y += toDiver.y * magnetPullStrength;
            }
            
            // When starfish gets close enough, count it as magnet-collected
            if (distance < 2.5 && window._magnetCollectCount < 3) {
                window._magnetCollectCount++;
                star.userData.collected = true;
                star.visible = false;
                gameState.score += 50 + (gameState.combo * 5);
                gameState.starfishCollected++;
                gameState.combo++;
                gameState.lastCollectTime = Date.now() / 1000;
                updateUI();
                if (soundEnabled && sounds.collect) sounds.collect();
                
                // Show magnet collection progress
                var progressText = document.createElement('div');
                progressText.textContent = '🧲 MAGNET PULLED ' + window._magnetCollectCount + '/3 STARFISH 🧲';
                progressText.style.position = 'fixed';
                progressText.style.top = '30%';
                progressText.style.left = '50%';
                progressText.style.transform = 'translate(-50%, -50%)';
                progressText.style.backgroundColor = 'rgba(0,0,0,0.8)';
                progressText.style.color = '#ff9ff3';
                progressText.style.padding = '10px 20px';
                progressText.style.borderRadius = '25px';
                progressText.style.fontFamily = 'Orbitron, monospace';
                progressText.style.fontSize = '16px';
                progressText.style.fontWeight = 'bold';
                progressText.style.zIndex = '1000';
                document.body.appendChild(progressText);
                setTimeout(function() { if(progressText && progressText.remove) progressText.remove(); }, 1200);
                
                if (gameState.combo > 1) {
                    var comboText = document.createElement('div');
                    comboText.textContent = '🔥 x' + gameState.combo + ' COMBO! +' + (gameState.combo * 5) + ' 🔥';
                    comboText.style.position = 'fixed';
                    comboText.style.top = '35%';
                    comboText.style.left = '50%';
                    comboText.style.transform = 'translate(-50%, -50%)';
                    comboText.style.color = '#ffaa00';
                    comboText.style.fontFamily = 'Orbitron, monospace';
                    comboText.style.fontSize = '22px';
                    comboText.style.fontWeight = 'bold';
                    comboText.style.textShadow = '0 0 10px #ffaa00';
                    comboText.style.zIndex = '1000';
                    document.body.appendChild(comboText);
                    setTimeout(function() { if(comboText && comboText.remove) comboText.remove(); }, 600);
                }

                if (gameState.starfishCollected >= gameState.targetStarfish) {
                    setTimeout(function() { endGame(true); }, 500);
                }
                continue;
            }
        }
        
        // Normal collection
        var collectRange = 2.5;
        if (diver && star.position.distanceTo(diver.position) < collectRange) {
            star.userData.collected = true;
            star.visible = false;
            gameState.score += 50 + (gameState.combo * 5);
            gameState.starfishCollected++;
            gameState.combo++;
            gameState.lastCollectTime = Date.now() / 1000;
            updateUI();
            if (soundEnabled && sounds.collect) sounds.collect();
            
            if (gameState.combo > 1) {
                var comboText2 = document.createElement('div');
                comboText2.textContent = '🔥 x' + gameState.combo + ' COMBO! +' + (gameState.combo * 5) + ' 🔥';
                comboText2.style.position = 'fixed';
                comboText2.style.top = '35%';
                comboText2.style.left = '50%';
                comboText2.style.transform = 'translate(-50%, -50%)';
                comboText2.style.color = '#ffaa00';
                comboText2.style.fontFamily = 'Orbitron, monospace';
                comboText2.style.fontSize = '22px';
                comboText2.style.fontWeight = 'bold';
                comboText2.style.textShadow = '0 0 10px #ffaa00';
                comboText2.style.zIndex = '1000';
                document.body.appendChild(comboText2);
                setTimeout(function() { if(comboText2 && comboText2.remove) comboText2.remove(); }, 600);
            }

            if (gameState.starfishCollected >= gameState.targetStarfish) {
                setTimeout(function() { endGame(true); }, 500);
            }
        }
    }

    // Pearls - NO magnet attraction
    for (var j = 0; j < pearls.length; j++) {
        var pearl = pearls[j];
        if (pearl.userData.collected) continue;
        
        pearl.position.y += Math.sin(time * 3 + pearl.userData.bobOffset) * 0.02;
        
        if (diver && pearl.position.distanceTo(diver.position) < 2.5) {
            pearl.userData.collected = true;
            pearl.visible = false;
            gameState.score += 25;
            updateUI();
            if (soundEnabled && sounds.collect) sounds.collect();
        }
    }
    
    // Reset combo if no collection recently
    if ((Date.now() / 1000 - gameState.lastCollectTime) > 3) {
        gameState.combo = 0;
    }
}


function updateEnemies(time, delta) {
    if (!gameState.isPlaying) return;

    const safeDelta = Math.min(delta, 0.033);
    
    if (gameState.hitCooldown > 0) gameState.hitCooldown -= safeDelta;
    
    if (gameState.difficulty === 'hard') {
        chaseTimer += safeDelta;
        if (chaseTimer >= CHASE_DURATION + REST_DURATION) chaseTimer = 0;
        isChaseActive = chaseTimer < CHASE_DURATION;
        
        // Visual chase indicator
        if (isChaseActive) {
            document.body.style.border = '3px solid rgba(255, 0, 0, 0.5)';
            document.body.style.boxShadow = 'inset 0 0 50px rgba(255, 0, 0, 0.2)';
        } else {
            document.body.style.border = 'none';
            document.body.style.boxShadow = 'none';
        }
    }
    
    sharks.forEach(shark => {
        if (!shark || !shark.userData) return;
        
        const data = shark.userData;
        
        if (gameState.difficulty === 'hard' && isChaseActive && diver) {
            const toDiver = new THREE.Vector3().subVectors(diver.position, shark.position).normalize();
            shark.position.add(toDiver.multiplyScalar(data.chaseSpeed * safeDelta));
            data.direction = toDiver;
        } else {
            shark.position.add(data.direction.clone().multiplyScalar(data.speed * safeDelta));
            if (Math.abs(shark.position.x) > 48) data.direction.x *= -1;
            if (Math.abs(shark.position.z) > 48) data.direction.z *= -1;
        }
        
        shark.position.y = Math.sin(time + shark.position.x * 0.1) * 3.5;
        shark.rotation.y = Math.atan2(data.direction.x, data.direction.z);

        if (diver && gameState.hitCooldown <= 0) {
            const distance = shark.position.distanceTo(diver.position);
            if (distance < 3.2) {
                if (activePowerUps.shield.active) {
                    const notif = document.createElement('div');
                    notif.textContent = '🛡️ SHIELD BLOCKED! 🛡️';
                    notif.style.position = 'fixed';
                    notif.style.top = '40%';
                    notif.style.left = '50%';
                    notif.style.transform = 'translate(-50%, -50%)';
                    notif.style.backgroundColor = 'rgba(0,0,0,0.8)';
                    notif.style.color = '#4ecdc4';
                    notif.style.padding = '12px 24px';
                    notif.style.borderRadius = '25px';
                    notif.style.fontFamily = 'Orbitron, monospace';
                    notif.style.fontSize = '18px';
                    notif.style.zIndex = '1000';
                    document.body.appendChild(notif);
                    setTimeout(() => notif.remove(), 800);
                } else {
                    gameState.oxygen = Math.max(0, gameState.oxygen - 18);
                    gameState.hitCooldown = 0.6;
                    updateUI();
                    flashDamage();
                    if (soundEnabled) {
                        sounds.hit();
                        sounds.sharkBite();
                    }
                    const knockback = shark.position.clone().sub(diver.position).normalize();
                    diver.position.add(knockback.multiplyScalar(5));
                    if (gameState.oxygen <= 0) endGame(false);
                }
            }
        }
    });

    jellyfish.forEach(jelly => {
        if (!jelly || !jelly.userData) return;
        
        const data = jelly.userData;
        data.direction += data.speed * 0.015 * safeDelta;
        jelly.position.x += Math.cos(data.direction) * 0.07 * (safeDelta * 30);
        jelly.position.z += Math.sin(data.direction) * 0.07 * (safeDelta * 30);
        jelly.position.y += Math.sin(time * 2.5 + data.pulsePhase) * 0.025;

        const scale = 1 + Math.sin(time * 5) * 0.12;
        jelly.scale.set(scale, 1, scale);

        if (diver && gameState.hitCooldown <= 0 && !activePowerUps.shield.active) {
            const distance = jelly.position.distanceTo(diver.position);
            if (distance < 2.8) {
                gameState.oxygen = Math.max(0, gameState.oxygen - 10);
                gameState.hitCooldown = 0.4;
                updateUI();
                flashDamage();
                if (soundEnabled && sounds.hit) sounds.hit();
                if (gameState.oxygen <= 0) endGame(false);
            }
        }
    });
}

function flashDamage() {
    const flashDiv = document.createElement('div');
    flashDiv.style.position = 'fixed';
    flashDiv.style.top = '0';
    flashDiv.style.left = '0';
    flashDiv.style.width = '100%';
    flashDiv.style.height = '100%';
    flashDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    flashDiv.style.pointerEvents = 'none';
    flashDiv.style.zIndex = '1000';
    document.body.appendChild(flashDiv);
    setTimeout(() => flashDiv.remove(), 150);
}

function updateBubbles(time) {
    bubbles.forEach(bubble => {
        bubble.position.y += bubble.userData.speed * 0.025;
        bubble.position.x += Math.sin(time * 2.5 + bubble.userData.wobble) * 0.025;
        if (bubble.position.y > 35) {
            bubble.position.y = -22;
            bubble.position.x = Math.random() * 90 - 45;
            bubble.position.z = Math.random() * 90 - 45;
        }
    });
}

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
    
    renderer.render(scene, camera);
}

// Start the game
init();