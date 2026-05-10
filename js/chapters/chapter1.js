import { SaveSystem } from '../saveSystem.js';
import { AudioManager } from '../audioManager.js';
import { Staircase } from './staircase.js';
import { getCachedUrl } from '../assetsConfig.js'; 

let canvas, ctx;
let gameLoopId;
let gameState;
let currentDialogueQueue = [];
let isDialogueActive = false;
let craftSlots = Array(9).fill(null); 
let statsTickTimer = 0;

const CHEST_MOVE_FRAMES = 20 * 60;   
const CHEST_RESPAWN_FRAMES = 15 * 60; 
let respawnTimers = [];

const sfxPaths = {
    walk: 'assets/audio/walk.mp3',
    jump: 'assets/audio/jump.mp3',
    land: 'assets/audio/land.mp3', 
    pickup: 'assets/audio/pickup.mp3',
    miningWood: 'assets/audio/mining_wood.mp3',
    miningStone: 'assets/audio/mining_stone.mp3',
    craft: 'assets/audio/craft_success.mp3',
    mimic_bite: 'assets/audio/mimic_bite.mp3',
    key_get: 'assets/audio/pickup.mp3', 
    dialogue_click: 'assets/audio/dialogue_click.mp3',
    hit: 'assets/audio/hit.mp3',
    playerHit: 'assets/audio/player_hit.mp3',
};

const sfxInstances = {}; 

let dialogueCallback = null; 

function startDialogue(linesArray, callback = null) {
    currentDialogueQueue = linesArray;
    isDialogueActive = true;
    dialogueCallback = callback; 
    
    document.getElementById('dialogue-overlay').classList.remove('hidden');
    advanceDialogue();
}

let currentSceneIndex = 0;
const scenes = [
    {   
        name: "起點",
        bgPath: 'assets/images/bg-scene1.png',
        objects: [
            { id: 101, type: 'crafting_table', x: 40, y: 360, width: 50, height: 50 },
            { id: 102, type: 'wood', x: 600, y: 340, width: 30, height: 70, hp: 100, maxHp: 100 }
        ]
    },
    {   
        name: "天空之原",
        bgPath: 'assets/images/bg-scene2.png',
        objects: [
            { id: 201, type: 'sky_door', x: 400, y: 250, width: 80, height: 160 },
            { id: 202, type: 'wood', x: 150, y: 340, width: 30, height: 70, hp: 100, maxHp: 100 },
            { id: 203, type: 'wood', x: 650, y: 340, width: 30, height: 70, hp: 100, maxHp: 100 }
        ]
    },
    {   
        name: "荒岩地帶",
        bgPath: 'assets/images/bg-scene3.png',
        objects: [
            { id: 301, type: 'stone', x: 300, y: 385, width: 40, height: 25, hp: 120, maxHp: 120 },
            { id: 302, type: 'stone', x: 500, y: 385, width: 40, height: 25, hp: 120, maxHp: 120 }
        ]
    },
    {  
        name: "水晶礦脈",
        bgPath: 'assets/images/bg-scene4.png',
        objects: [
            { id: 401, type: 'emerald', x: 400, y: 370, width: 30, height: 40, hp: 200, maxHp: 200 },
            { id: 402, type: 'stone', x: 100, y: 385, width: 40, height: 25, hp: 120, maxHp: 120 },
            { id: 403, type: 'stone', x: 250, y: 385, width: 40, height: 25, hp: 120, maxHp: 120 },
            { id: 404, type: 'stone', x: 600, y: 385, width: 40, height: 25, hp: 120, maxHp: 120 }
        ]
    },
    {   
        name: "深淵盡頭",
        bgPath: 'assets/images/bg-scene5.png',
        objects: [
            { id: 501, type: 'mimic', x: 400, y: 370, width: 40, height: 40 }
        ]
    }
];

let invincibleTimer = 0; // 勇者受傷後的無敵時間
const ATTACK_COOLDOWN = 30; // 攻擊冷卻 (幀)
let attackTimer = 0;

// 在場景三和場景四加入怪物
scenes[2].enemies = [
    { x: 300, y: 360, width: 30, height: 30, hp: 100, dir: 1, range: 150, startX: 300 },
    { x: 600, y: 360, width: 30, height: 30, hp: 100, dir: -1, range: 100, startX: 600 }
];
scenes[3].enemies = [
    { x: 200, y: 360, width: 30, height: 30, hp: 100, dir: 1, range: 120, startX: 200 },
    { x: 400, y: 360, width: 30, height: 30, hp: 100, dir: 1, range: 100, startX: 400 },
    { x: 700, y: 360, width: 30, height: 30, hp: 100, dir: -1, range: 150, startX: 700 }
];

const bgImages = {};

function playSFX(name) {
    const originalPath = sfxPaths[name];
    if (!originalPath) return;

    // 如果這個音效還沒被實體化過，就用快取網址建立它
    if (!sfxInstances[name]) {
        const cachedUrl = getCachedUrl(originalPath); // ★ 拿取記憶體裡的 blob 網址
        sfxInstances[name] = new Audio(cachedUrl);
        sfxInstances[name].volume = 0.4; // 在這裡統一設定音量
    }

    // 播放音效
    sfxInstances[name].currentTime = 0;
    sfxInstances[name].play().catch(() => {});
}

const RECIPES = [
    {
        name: "木板", id: "plank", count: 4,
        pattern: ["wood", null, null, null, null, null, null, null, null],
        isDecomposition: true // 只要九宮格內只有一個木頭，不限位置
    },
    {
        name: "木棒", id: "stick", count: 4,
        pattern: ["plank", "plank"], 
        isDecomposition: true
    },
    {
        name: "木鎬", id: "wood_pickaxe", count: 1,
        pattern: [
            "plank", "plank", "plank",
            null,    "stick", null,
            null,    "stick", null
        ]
    },
    {
        name: "石鎬", id: "stone_pickaxe", count: 1,
        pattern: [
            "stone", "stone", "stone",
            null,    "stick", null,
            null,    "stick", null
        ]
    },
    {
        name: "木劍", id: "wood_sword", count: 1,
        pattern: [
            null, "plank", null,
            null, "plank", null,
            null, "stick", null
        ]
    },
    {
        name: "石劍", id: "stone_sword", count: 1,
        pattern: [
            null, "stone", null,
            null, "stone", null,
            null, "stick", null
        ]
    },
    {
        name: "時鐘鑰匙", id: "key", count: 1,
        pattern: ["emerald", null, null, null, null, null, null, null, null],
        isDecomposition: true
    }
];

function createChest() {
    return {
        id: Date.now() + Math.random(),
        type: 'chest',
        x: 100 + Math.random() * 600, 
        y: 375,
        width: 35,
        height: 35,
        content: Math.floor(Math.random() * 3) + 1,
        timer: CHEST_MOVE_FRAMES 
    };
}

// --- 核心檢測函式 ---
function checkRecipe() {
    const resultSlot = document.getElementById('result-slot');
    let foundRecipe = null;

    const activeItems = craftSlots.filter(s => s !== null);

    for (const recipe of RECIPES) {
        if (recipe.isDecomposition) {
            if (recipe.id === "plank" && activeItems.length === 1 && activeItems[0] === "wood") { foundRecipe = recipe; break; }
            if (recipe.id === "stick" && activeItems.length === 2 && activeItems.every(i => i === "plank")) { foundRecipe = recipe; break; }
            if (recipe.id === "key" && activeItems.length === 1 && activeItems[0] === "emerald") { foundRecipe = recipe; break; }
        } else {
            if (JSON.stringify(craftSlots) === JSON.stringify(recipe.pattern)) { foundRecipe = recipe; break; }
        }
    }

    if (foundRecipe) {
        resultSlot.innerHTML = `<img src="assets/images/icon_${foundRecipe.id}.png" title="${foundRecipe.name} x${foundRecipe.count}">`;
        resultSlot.dataset.recipeId = foundRecipe.id;
        return foundRecipe;
    } else {
        resultSlot.innerHTML = "";
        delete resultSlot.dataset.recipeId;
        return null;
    }
}

// --- 合成台功能 ---

// 1. 放入物品
function addToCrafting(itemName) {
    if (gameState.inventory[itemName] <= 0) return;

    // 尋找第一個空格
    const emptyIdx = craftSlots.findIndex(s => s === null);
    if (emptyIdx !== -1) {
        craftSlots[emptyIdx] = itemName;
        gameState.inventory[itemName]--;
        refreshCraftingUI();
    }
}

// 2. 拿回物品
function removeFromCrafting(idx) {
    const item = craftSlots[idx];
    if (item) {
        gameState.inventory[item]++;
        craftSlots[idx] = null;
        refreshCraftingUI();
    }
}

// 3. 執行合成 (點擊合成按鈕)
function performCraft() {
    playSFX('craft');
    const recipe = checkRecipe();
    if (!recipe) return;

    // 獲得產出物
    if (recipe.id.includes('pickaxe') || recipe.id.includes('sword')) {
        // 如果是工具類，開啟對應權限
        if (recipe.id === 'wood_pickaxe') gameState.inventory.tools.pickaxe = true;
        gameState.inventory[recipe.id]++;
        triggerFirstTimeEvent('firstCraft', ["我，也是由其他非我的事物所組成呢，恭喜你獲得第一個工具"]);
    } else {
        gameState.inventory[recipe.id] += recipe.count;
    }

    if (recipe.id === 'key') {
        gameState.inventory.key = (gameState.inventory.key || 0) + 1;
        playSFX('pickup');
    }


    // 清空合成格
    craftSlots = Array(9).fill(null);
    showToast(`合成成功：${recipe.name}!`);
    
    refreshCraftingUI();
    updateUI();
    SaveSystem.save(gameState);
}

// 4. 刷新介面
function refreshCraftingUI() {
    const invList = document.getElementById('crafting-inv-list');
    invList.innerHTML = "";
    
    // 準備背包物品數據
    const itemsInInv = [];
    const possibleItems = ['wood', 'stone', 'emerald', 'plank', 'stick', 'key', 'wood_pickaxe', 'stone_pickaxe', 'wood_sword', 'stone_sword'];
    
    possibleItems.forEach(type => {
        // 根據數量加入陣列
        for(let i=0; i < (gameState.inventory[type] || 0); i++) {
            itemsInInv.push(type);
        }
    });

    // 1. 渲染背包 (固定 20 格)
    for (let i = 0; i < 20; i++) {
        const slot = document.createElement('div');
        slot.className = "grid-slot";
        const item = itemsInInv[i];

        if (item) {
            slot.classList.add('filled');
            slot.draggable = true;
            // ★ 只顯示圖片，利用 title 屬性在滑鼠懸浮時顯示名稱
            slot.innerHTML = `<img src="assets/images/icon_${item}.png" title="${item}">`;
            
            slot.ondragstart = (e) => {
                e.dataTransfer.setData("text/plain", item);
                e.dataTransfer.setData("source", "inventory");
            };
            slot.onclick = () => addToCrafting(item);
        }
        invList.appendChild(slot);
    }

    // 2. 渲染九宮格
    const slots = document.querySelectorAll('.grid-slot[data-slot]');
    slots.forEach(slot => {
        const idx = parseInt(slot.getAttribute('data-slot'));
        const itemInSlot = craftSlots[idx];
        
        // ★ 清空內容後放入圖片 (而非文字)
        if (itemInSlot) {
            slot.innerHTML = `<img src="assets/images/icon_${itemInSlot}.png" title="${itemInSlot}">`;
            slot.draggable = true;
            slot.ondragstart = (e) => {
                e.dataTransfer.setData("text/plain", craftSlots[idx]);
                e.dataTransfer.setData("source", "grid");
                e.dataTransfer.setData("fromIdx", idx);
            };
        } else {
            slot.innerHTML = "";
        }
        
        // 拖曳邏輯保持不變
        slot.ondragover = (e) => {
            e.preventDefault();
            slot.style.backgroundColor = "rgba(254, 202, 87, 0.3)"; 
        };
        slot.ondragleave = () => { slot.style.backgroundColor = ""; };

        slot.ondrop = (e) => {
            e.preventDefault();
            slot.style.backgroundColor = ""; 
            const itemName = e.dataTransfer.getData("text/plain");
            const source = e.dataTransfer.getData("source");

            if (source === "inventory") {
                if (craftSlots[idx]) gameState.inventory[craftSlots[idx]]++;
                craftSlots[idx] = itemName;
                gameState.inventory[itemName]--;
            } else if (source === "grid") {
                const fromIdx = e.dataTransfer.getData("fromIdx");
                const temp = craftSlots[idx];
                craftSlots[idx] = craftSlots[fromIdx];
                craftSlots[fromIdx] = temp;
            }
            refreshCraftingUI();
            updateUI();
        };

        slot.onclick = () => removeFromCrafting(idx);
    });

    checkRecipe();
}

const particles = [];

const player = {
    x: 100, y: 300, width: 30, height: 50,
    vx: 0, vy: 0, speed: 4, jumpPower: -10,
    facingRight: true,
    distanceMoved: 0,
    isMining: false,
    miningTarget: null
};

const keys = { ArrowLeft: false, ArrowRight: false, Space: false, KeyF: false, KeyE: false, KeyX: false };

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2500);
}

function spawnRandomChests() {
    scenes.forEach((scene, index) => {
        if (index !== 4 && Math.random() < 0.4) {
            scene.objects.push(createChest());
        }
    });
}

export const Chapter1 = {
    init: async () => {
        const screen = document.getElementById('chapter1-screen');

        AudioManager.playBGM(getCachedUrl('assets/audio/bgm-chapter1.mp3'));
        AudioManager.bgm.volume = 0.1;
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');

        scenes.forEach(scene => {
            const img = new Image();
            img.src = getCachedUrl(scene.bgPath);
            bgImages[scene.bgPath] = img;
        });

        console.log("所有場景資源載入完成！");

        initParticles();
        spawnRandomChests();

        const savedData = SaveSystem.load();
        if (savedData && savedData.worldState) {
            savedData.worldState.forEach((state, index) => {
                if (scenes[index] && state) {
                    scenes[index].objects = state.objects || [];
                    scenes[index].enemies = state.enemies || [];
                }
            });
        }
        gameState = savedData || {
            playerStats: { hp: 100, hunger: 100 },
            inventory: { 
                wood: 0, stone: 0, emerald: 0, food: 0,
                plank: 0, stick: 0,
                wood_pickaxe: 0, stone_pickaxe: 0, 
                wood_sword: 0, stone_sword: 0,
                tools: { axe: false, pickaxe: false }
            },
            flags: {}
        };
        
        if (!gameState.inventory.tools) {
            gameState.inventory.tools = { axe: false, pickaxe: false };
        }

        gameState.inventory.wood_sword = gameState.inventory.wood_sword || 0;
        gameState.inventory.stone_sword = gameState.inventory.stone_sword || 0;

        updateUI();
        bindInput();
        screen.classList.remove('hidden');
        gameLoop();

        await new Promise(r => setTimeout(r, 3000));
        if (!gameState.flags.receivedIntroGift) {
            startDialogue([
                "歡迎你勇者，時間的命運成功喚醒你。",
                "我是被派遣來協助你的使者，你可以稱呼我為綿羊使者就好。",
                "如命運所說，找尋真相必須完成三道關卡。",
                "看來此處便是你的起點。",
                "現在，你必須挖掘事件的真相，找到時間停止的原因。",
                "我相信以你的遊戲經驗，應該很快就能適應這個世界的規則。",
                "要是遇到困難，也可以點擊右上角的圖示呼叫我。",
                "去開啟天空之門，尋找躲在門後的答案吧！",
                "【系統提示】隱藏的綿羊使者 贊助了你五塊地瓜巧克力！"
            ]);
            gameState.flags.receivedIntroGift = true;
        } else {
            showToast("歡迎回來。繼續尋找真相吧。")
        }    
    }
};

function initParticles() {
    particles.length = 0; 
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * 800,
            y: Math.random() * 450,
            radius: Math.random() * 1.5 + 0.5, // 大小
            vx: (Math.random() - 0.5) * 0.5,   // 水平漂浮速度
            vy: (Math.random() - 0.5) * 0.5,   // 垂直漂浮速度
            alpha: Math.random() * 0.5 + 0.1,  // 透明度
            blinkSpeed: Math.random() * 0.02 + 0.01 // 閃爍速度
        });
    }
}

function gameLoop() {
    updatePhysics();
    draw();
    gameLoopId = requestAnimationFrame(gameLoop);
}

let walkStepTimer = 0;
let wasInAir = false;

function updatePhysics() {
    if (isDialogueActive) return; 

    const isRunning = Math.abs(player.vx) > 0.5;
    const isOnGround = player.y + player.height >= 410;

    if (wasInAir && isOnGround) {
        playSFX('land');
    }
    wasInAir = !isOnGround;

    if (isRunning && isOnGround) {
        walkStepTimer++;
        if (walkStepTimer >= 15) { 
            playSFX('walk');
            walkStepTimer = 0;
        }
    }

    if (keys.ArrowLeft && !player.isMining) {
        player.vx = -player.speed;
        player.facingRight = false;
        player.distanceMoved += Math.abs(player.vx);
    } else if (keys.ArrowRight && !player.isMining) {
        player.vx = player.speed;
        player.facingRight = true;
        player.distanceMoved += Math.abs(player.vx);
    } else {
        player.vx *= 0.8; 
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    player.vy += 0.4; 
    player.x += player.vx;
    player.y += player.vy;

    const floorY = 410;
    if (player.y + player.height > floorY) {
        player.y = floorY - player.height;
        player.vy = 0;
        
        if (keys.Space && !player.isMining) {
            player.vy = player.jumpPower;
            playSFX('jump'); 
        }
    }

    // 邊界
    if (player.x < 0 && currentSceneIndex > 0) {
        currentSceneIndex--;
        player.x = canvas.width - player.width - 5;
        showToast(`進入：${scenes[currentSceneIndex].name}`);
    } else if (player.x + player.width > canvas.width && currentSceneIndex < 4) {
        currentSceneIndex++;
        player.x = 5;
        showToast(`進入：${scenes[currentSceneIndex].name}`);
    }

    // 邊界硬限制 (不能穿過 0 到 4 以外的地方)
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    handleMining();

    // 飢餓度
    if (player.distanceMoved > 500) { 
        player.distanceMoved = 0;
        if (gameState.playerStats.hunger > 0) {
            gameState.playerStats.hunger -= 1;
            updateUI();
        }
    }

    statsTickTimer++;
    if (statsTickTimer >= 120) {
        statsTickTimer = 0;

        // 情況 A：飽食回血 (現在會扣飢餓度)
        // 只有當飢餓度足夠(>=10)且血量未滿時觸發
        if (gameState.playerStats.hunger >= 10 && gameState.playerStats.hp < 100) {
            gameState.playerStats.hunger -= 10; // 消耗 10 飢餓
            gameState.playerStats.hp = Math.min(100, gameState.playerStats.hp + 5); // 恢復 5 HP
            updateUI();
            showToast("正在消耗體力恢復傷口...");
        }

        // 情況 B：飢餓扣血 (維持原樣)
        if (gameState.playerStats.hunger <= 0 && gameState.playerStats.hp > 0) {
            gameState.playerStats.hp = Math.max(0, gameState.playerStats.hp - 5);
            showDamageEffect(5);
            showToast("你太餓了，生命正在流失！");
            if (gameState.playerStats.hp <= 30) 
                gameState.playerStats.hp = Math.min(100, gameState.playerStats.hp - 5);
            updateUI();
        }

        if (gameState.playerStats.hp <= 0) handleDeath();
    }

    if (attackTimer > 0) attackTimer--;
    if (invincibleTimer > 0) invincibleTimer--;

    // 處理怪物 AI 與 碰撞
    const currentEnemies = scenes[currentSceneIndex].enemies || [];
    currentEnemies.forEach((enemy, index) => {
        // 巡邏移動
        enemy.x += 1.5 * enemy.dir;
        if (Math.abs(enemy.x - enemy.startX) > enemy.range) {
            enemy.dir *= -1; // 轉向
        }

        // 碰撞偵測 (怪物碰到勇者)
        if (invincibleTimer <= 0 && isColliding(player, enemy)) {
            gameState.playerStats.hp -= 5;
            invincibleTimer = 60; // 1秒無敵
            showDamageEffect(5); // 之前的畫面閃紅與跳字
            playSFX('playerHit');
            updateUI();
        }
    });

    // 處理攻擊動作 (按 X 鍵)
    if (keys.KeyX && attackTimer <= 0) {
        performAttack();
    }

    scenes.forEach(scene => {
    if (scene && Array.isArray(scene.objects)) {
        scene.objects.forEach(obj => {
            if (obj && obj.type === 'chest') {
                obj.timer--;
                if (obj.timer <= 0) {
                    obj.x = 100 + Math.random() * 600;
                    obj.timer = CHEST_MOVE_FRAMES;
                }
            }
        });
    }
});

    // ★ 處理「消失寶箱」的重新生成計時器
    for (let i = respawnTimers.length - 1; i >= 0; i--) {
        respawnTimers[i].framesLeft--;
        
        if (respawnTimers[i].framesLeft <= 0) {
            const targetSceneIndex = respawnTimers[i].sceneIndex;
            
            // 在目標場景加入新寶箱
            scenes[targetSceneIndex].objects.push(createChest());
            
            console.log(`場景 ${targetSceneIndex} 的寶箱已重新生成`);
            
            // 從等待清單中移除
            respawnTimers.splice(i, 1);
        }
    }

}

async function triggerSkyDoorTransition() {
    console.log("🚀 觸發轉場至 Chapter 1.5");
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    
    gameState.chapter = 1.5;
    SaveSystem.save(gameState);

    // 2. 顯示白光
    const white = document.getElementById('transition-white');
    white.classList.remove('hidden');
    setTimeout(() => { white.style.opacity = 1; }, 100);

    // 3. 延遲後進入樓梯場景
    setTimeout(async () => {
        AudioManager.stopBGM();
        Staircase.start();
        white.style.opacity = 0;
        setTimeout(() => white.classList.add('hidden'), 1500);
    }, 2000);
}

function saveWorldState() {
    // 將所有場景的物件與怪物清單存入 gameState
    gameState.worldState = scenes.map(s => ({
        objects: s.objects,
        enemies: s.enemies || []
    }));
    SaveSystem.save(gameState);
}

function isColliding(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function performAttack() {
    // 檢查是否有劍
    let damage = 0;
    if (gameState.inventory.stone_sword > 0) damage = 35;
    else if (gameState.inventory.wood_sword > 0) damage = 10;
    
    if (damage === 0) {
        showToast("你沒有武器可以攻擊！");
        attackTimer = 20;
        return;
    }

    attackTimer = ATTACK_COOLDOWN;
    playSFX('hit'); // 揮劍聲

    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    const attackRadius = 75;
    
    const currentEnemies = scenes[currentSceneIndex].enemies || [];
    
    // 這裡使用 filter 搭配 forEach，因為我們可能會在迴圈中刪除陣列元素
    for (let i = currentEnemies.length - 1; i >= 0; i--) {
        const enemy = currentEnemies[i];
        const enemyMidX = enemy.x + enemy.width / 2;
        const enemyMidY = enemy.y + enemy.height / 2;

        const dist = Math.sqrt(Math.pow(centerX - enemyMidX, 2) + Math.pow(centerY - enemyMidY, 2));

        let inRange = false;
        if (dist < attackRadius) {
            // 只要在勇者前方即可判定
            if (player.facingRight && enemyMidX > centerX - 10) inRange = true;
            if (!player.facingRight && enemyMidX < centerX + 10) inRange = true;
        }

        if (inRange) {
            enemy.hp -= damage;
            
            // ★ 實作擊退效果
            const knockbackDistance = 40; // 擊退距離
            if (player.facingRight) {
                enemy.x += knockbackDistance;
            } else {
                enemy.x -= knockbackDistance;
            }
            
            // 簡單的邊界檢查，防止怪物被砍出牆外
            if (enemy.x < 0) enemy.x = 0;
            if (enemy.x > canvas.width - enemy.width) enemy.x = canvas.width - enemy.width;

            // 怪物閃紅光效果 (可選)
            // 你可以在 enemy 物件上加一個 hitTimer，在 draw 時判斷畫紅色
            
            if (enemy.hp <= 0) {
                showToast("擊敗了深淵恐懼！");
                currentEnemies.splice(i, 1);
                saveWorldState();
            }
        }
    }
}

function handleDeath() {
    cancelAnimationFrame(gameLoopId);

    playSFX('land'); // 暫用著地聲或你有死亡聲
    showToast("你失去了意識...");
    
    gameState.playerStats.hp = 100;
    gameState.playerStats.hunger = 100;
    currentSceneIndex = 0; 
    player.x = 100;
    player.y = 300;

    const deadSkill = {
        skill: "死而復生",
        text: "此技能僅能獲得一次。",
        effect: "可恢復50%血量。"
    };
    saveWorldState(); 

    showRewardSkill(deadSkill, () => {
        startDialogue([
        "勇者，你倒下了...",
        "一切不會就這麼結束的，就像實驗一樣，失敗了才能更接近真相。"
        ], () => {});
    });

    if (!gameState.flags) gameState.flags = {};
    gameState.flags.canResurrect = true; 

    gameState.worldState = scenes.map(s => ({
        objects: s.objects || [],
        enemies: s.enemies || []
    }));

    SaveSystem.save(gameState);
    updateUI();
    
}

function handleMining() {
    if (!scenes[currentSceneIndex] || !scenes[currentSceneIndex].objects) {
        return;
    }
    const hint = document.getElementById('interaction-hint');
    const objects = scenes[currentSceneIndex].objects;
    let nearObject = null;

    const progressCont = document.getElementById('mining-progress-container');
    const progressBar = document.getElementById('mining-progress-bar');

    if (player.isMining && Date.now() % 500 < 20) { // 挖掘中每 500ms 播一次
        const type = player.miningTarget.type === 'wood' ? 'miningWood' : 'miningStone';
        playSFX(type);
    }
    
    if (isDialogueActive) {
        hint.classList.add('hidden');
        progressCont.classList.add('hidden');
        player.isMining = false;
        player.miningTarget = null;
        return;
    }

    const mineRange = 30; 
    objects.forEach(obj => {
        const dist = Math.abs((player.x + player.width/2) - (obj.x + obj.width/2));
        if (dist < mineRange) nearObject = obj;
    });

    if (nearObject && !player.isMining) {
        hint.classList.remove('hidden');
        let canMine = false;
        
        if (nearObject.type === 'wood') {
            canMine = true; 
            hint.innerText = "按下 F 砍伐木頭";
        } else if (nearObject.type === 'stone') {
            if (gameState.inventory.wood_pickaxe > 0 || gameState.inventory.stone_pickaxe > 0) {
                canMine = true;
                hint.innerText = "按下 F 開採石頭";
            } else {
                canMine = false;
                hint.innerText = "⚠️ 需要【木鎬】才能開採石頭";
            }
        } else if (nearObject.type === 'emerald') {
            if (gameState.inventory.stone_pickaxe > 0) {
                canMine = true;
                hint.innerText = "按下 F 開採綠寶石";
            } else {
                canMine = false;
                hint.innerText = "⚠️ 需要【石鎬】才能開採綠寶石";
            }
        } else if (nearObject.type === 'crafting_table') {
             hint.innerText = "按下 F 開啟合成台";
             if (keys.KeyF) openCrafting();
             return; 
        } else if (nearObject.type === 'mimic') {
             hint.innerText = "發現神祕寶箱！按下 F 開啟";
             if (keys.KeyF) triggerMimic(nearObject);
             return;
        } else if (nearObject.type === 'chest') {
            hint.innerText = "發現寶箱！按下 F 開啟";
            if (keys.KeyF) openChest(nearObject);
        } else if (nearObject.type === 'sky_door') {
            if (gameState.inventory.key > 0) {
                hint.innerText = "按下 F 打開天空之門";
                if (keys.KeyF) {
                    startDialogue([
                        "你開啟天空之門，果然非常瘋狂呢，私毫不畏懼前往未知之地呢。",
                        "這一次，換你慢慢爬樓吧。",
                    ], () => {
                        triggerSkyDoorTransition();
                    });
                    return; 
                }
            } else {
                hint.innerText = "這扇門緊鎖著，需要一把特殊的鑰匙";
            }
        } 

        function openChest(obj) {
            const foodCount = obj.content;
            gameState.inventory.food += foodCount;
            
            playSFX('pickup');
            showToast(`開啟寶箱：獲得食物 x${foodCount}`);
            triggerFirstTimeEvent('firstChest', ["我們或許可以相信，這些食物沒有過期。"]);

            // 紀錄這個場景索引，以便 15 秒後在這裡重新生成
            respawnTimers.push({
                sceneIndex: currentSceneIndex,
                framesLeft: CHEST_RESPAWN_FRAMES
            });

            // 從場景移除
            scenes[currentSceneIndex].objects = scenes[currentSceneIndex].objects.filter(o => o.id !== obj.id);
            
            updateUI();
            SaveSystem.save(gameState);
        }

        if (keys.KeyF && canMine) {
            player.isMining = true;
            player.miningTarget = nearObject;
        }
    } else if (!player.isMining) {
        hint.classList.add('hidden');
    }

    if (player.isMining) {
        hint.classList.add('hidden'); // 挖掘時隱藏按 F 提示
        progressCont.classList.remove('hidden');
        
        let minePower = 1.5;
        if (player.miningTarget.type === 'wood' && gameState.inventory.tools.axe) minePower = 4;
        if (player.miningTarget.type === 'stone' && gameState.inventory.tools.pickaxe) minePower = 3;
        
        player.miningTarget.hp -= minePower;
        player.distanceMoved += 3; // 挖掘時扣飢餓度較快

        const percent = ((player.miningTarget.maxHp - player.miningTarget.hp) / player.miningTarget.maxHp) * 100;
        progressBar.style.width = percent + '%';

        if (player.miningTarget.hp <= 0) finishMining();
        if (!keys.KeyF) cancelMining();
    } else {
        progressCont.classList.add('hidden');
    }

    if (!nearObject) {
        hint.classList.add('hidden'); 
        return; 
    }
}

function openCrafting() {
    isDialogueActive = true;
    document.getElementById('crafting-overlay').classList.remove('hidden');
    refreshCraftingUI();
    keys.KeyF = false; 
}

function closeCrafting() {
    craftSlots.forEach((item, idx) => {
        if (item) {
            gameState.inventory[item]++;
            craftSlots[idx] = null;
        }
    });

    document.getElementById('crafting-overlay').classList.add('hidden');
    isDialogueActive = false; 
    updateUI();
    SaveSystem.save(gameState);
}

function triggerMimic(obj) {
    playSFX('mimic_bite'); 
    showDamageEffect(50);
    startDialogue(["寶箱怪發動了奇襲！真可惜這裡沒有魔導書。"]);
    gameState.playerStats.hp -= 50;
    scenes[currentSceneIndex].objects = scenes[currentSceneIndex].objects.filter(o => o.id !== obj.id);
    updateUI();
}

function triggerFirstTimeEvent(flagName, dialogue) {
    if (!gameState.flags[flagName]) {
        startDialogue(dialogue);
        gameState.flags[flagName] = true;
        SaveSystem.save(gameState);
    }
}

function finishMining() {
    playSFX('pickup');
    const obj = player.miningTarget;
    if (!obj) return;
    let gainedItem = "";

    if (obj.type === 'wood') {
        gameState.inventory.wood++;
        gainedItem = '木頭';
        triggerFirstTimeEvent('firstWood', ["獲得木頭：很多時候，就像徒手挖木頭一樣，起步會辛苦一點，但這些收穫，都會成為你前進的根源"]);
    } else if (obj.type === 'stone') {
        gameState.inventory.stone++;
        gainedItem = '石頭';
        triggerFirstTimeEvent('firstStone', ["獲得石頭：如同你的堅定，堅硬無比"]);
    } else if (obj.type === 'emerald') {
        gameState.inventory.emerald++;
        gainedItem = '綠寶石';
        triggerFirstTimeEvent('firstEmerald', ["獲得綠寶石：人們總有信仰，總之，不要讓自己後悔吧"]);
    }
    
    showToast(`獲得 ${gainedItem}`);
    
    scenes[currentSceneIndex].objects = scenes[currentSceneIndex].objects.filter(o => o.id !== obj.id);

    saveWorldState(); 
    
    cancelMining();
    updateUI();
}

function cancelMining() {
    player.isMining = false;
    player.miningTarget = null;
    document.getElementById('mining-progress-bar').style.width = '0%';
}

function eatFood() {
    if (gameState.inventory.food > 0) {
        if (gameState.playerStats.hunger >= 100) return;

        gameState.inventory.food--;
        
        const recovery = Math.floor(Math.random() * 16) + 5; 
        gameState.playerStats.hunger = Math.min(100, gameState.playerStats.hunger + recovery);
        
        playSFX('pickup'); 
        showToast(`進食：飢餓度 +${recovery}`);
        showHealEffect(); 
        
        triggerFirstTimeEvent('firstEat', ["填飽肚子確實很重要，請記得按時吃飯。"]);
        updateUI();
        SaveSystem.save(gameState);
    }
}

function showHealEffect() {
    const screen = document.getElementById('chapter1-screen');
    screen.classList.add('heal-flash');
    setTimeout(() => screen.classList.remove('heal-flash'), 300);
}

function showDamageEffect(amount) {
    const screen = document.getElementById('chapter1-screen');
    
    const damageText = document.createElement('div');
    damageText.className = 'damage-text';
    damageText.innerText = `-${amount} HP`;
    
    const wrapper = document.querySelector('.canvas-wrapper');
    damageText.style.left = `${player.x + 20}px`; 
    damageText.style.top = `${player.y + 50}px`;
    
    wrapper.appendChild(damageText);
    
    setTimeout(() => damageText.remove(), 1000);

    screen.classList.add('hit-flash');
    setTimeout(() => screen.classList.remove('hit-flash'), 200);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentBgPath = scenes[currentSceneIndex].bgPath;
    const currentBgImg = bgImages[currentBgPath];

    if (currentBgImg) {
        const time = Date.now() / 2000;
        const offsetX = Math.sin(time) * 3; 
        const offsetY = Math.cos(time * 0.8) * 3;
        
        ctx.drawImage(currentBgImg, -10 + offsetX, -10 + offsetY, canvas.width + 20, canvas.height + 20);
    } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }


    drawParticles();
    drawGround();

    // ★ 畫資源物件
    const objects = scenes[currentSceneIndex].objects;
    objects.forEach(obj => {
        ctx.save();
        if (obj.type === 'wood') {
            // 畫樹
            ctx.fillStyle = '#5D4037'; ctx.fillRect(obj.x + 10, obj.y + 30, 10, 40);
            ctx.fillStyle = '#2E7D32'; ctx.beginPath();
            ctx.moveTo(obj.x, obj.y + 35); ctx.lineTo(obj.x + 15, obj.y); ctx.lineTo(obj.x + 30, obj.y + 35);
            ctx.fill();
        } else if (obj.type === 'stone') {
            // 畫石頭
            ctx.fillStyle = '#757575'; ctx.beginPath();
            ctx.moveTo(obj.x, obj.y + obj.height); ctx.lineTo(obj.x + 5, obj.y + 5);
            ctx.lineTo(obj.x + 30, obj.y); ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
            ctx.fill();
        } else if (obj.type === 'crafting_table') {
            // 畫合成台 (棕色方塊+格紋)
            ctx.fillStyle = '#795548'; ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.strokeStyle = '#3e2723'; ctx.strokeRect(obj.x + 5, obj.y + 5, obj.width - 10, obj.height - 10);
        } else if (obj.type === 'emerald') {
            // 畫綠寶石 (青色發光)
            ctx.fillStyle = '#2ecc71'; ctx.shadowBlur = 10; ctx.shadowColor = '#2ecc71';
            ctx.beginPath(); ctx.moveTo(obj.x + 15, obj.y); ctx.lineTo(obj.x + 30, obj.y + 20);
            ctx.lineTo(obj.x + 15, obj.y + 40); ctx.lineTo(obj.x, obj.y + 20); ctx.closePath(); ctx.fill();
        } else if (obj.type === 'sky_door') {
            // 畫天空之門
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
            ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        } else if (obj.type === 'mimic') {
            // 畫寶箱怪 (紫色寶箱)
            ctx.fillStyle = '#7b1fa2'; ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.fillStyle = '#ffd600'; ctx.fillRect(obj.x + 15, obj.y + 15, 10, 5); // 鎖頭
        }else if (obj.type === 'chest') {
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.fillStyle = '#FFD700'; // 金色鎖頭
            ctx.fillRect(obj.x + 12, obj.y + 15, 10, 8);
        }
        ctx.restore();
    });

    const currentEnemies = scenes[currentSceneIndex].enemies || [];
    currentEnemies.forEach(enemy => {
        ctx.save();
        ctx.fillStyle = '#2d004d'; // 深紫色
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff00ff';
        
        ctx.beginPath();
        // 底部左角
        ctx.moveTo(enemy.x, enemy.y + enemy.height);
        // 頂部中點 (固定高度，不隨邏輯變動)
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y);
        // 底部右角
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // 畫怪物血條 (維持原樣)
        ctx.fillStyle = '#555';
        ctx.fillRect(enemy.x, enemy.y - 15, enemy.width, 4);
        ctx.fillStyle = '#ff4757';
        ctx.fillRect(enemy.x, enemy.y - 15, (enemy.hp / 100) * enemy.width, 4);
    });

    const slashDuration = 10; // 動畫持續 10 幀
    const attackElapsed = ATTACK_COOLDOWN - attackTimer;

    if (attackElapsed >= 0 && attackElapsed < slashDuration) {
        ctx.save();
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        const radius = 70;
        
        // 計算動畫進度 (0 到 1)
        const progress = attackElapsed / slashDuration;
        
        // 設定起始角度 (上方 -90度)
        const startAngle = -Math.PI / 2;
        // 根據面向決定旋轉方向 (順時針或逆時針)
        const sweepAngle = player.facingRight ? Math.PI * progress : -Math.PI * progress;
        const currentAngle = startAngle + sweepAngle;

        // A. 畫出劍氣路徑 (半透明扇形)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, currentAngle, !player.facingRight);
        ctx.fill();

        // B. 畫出「刀鋒」 (那一條旋轉的半徑線)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(currentAngle) * radius,
            centerY + Math.sin(currentAngle) * radius
        );
        ctx.stroke();

        // C. 加上一點刀尖的光點
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(centerX + Math.cos(currentAngle) * radius, centerY + Math.sin(currentAngle) * radius, 3, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }

    // 繪製勇者 (如果是在無敵時間，讓勇者半透明閃爍)
    if (invincibleTimer % 10 < 5) {
        drawPlayer();
    }

    drawPlayer();
}

function drawGround() {
    ctx.save();
    
    const grd = ctx.createLinearGradient(0, 410, 0, 450);
    grd.addColorStop(0, '#120c24'); // 頂部較亮一點
    grd.addColorStop(1, '#05030a'); // 底部深黑
    
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, 410);
    // 畫出稍微不平整的地面感
    for (let x = 0; x <= canvas.width; x += 40) {
        ctx.lineTo(x, 410 + Math.sin(x * 0.05) * 2);
    }
    ctx.lineTo(800, 450);
    ctx.lineTo(0, 450);
    ctx.closePath();
    ctx.fill();

    // 土地邊緣的高光 (營造層次感)
    ctx.strokeStyle = 'rgba(150, 100, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
}

function drawParticles() {
    ctx.save();
    particles.forEach(p => {
        // 更新粒子位置
        p.x += p.vx;
        p.y += p.vy;
        
        // 粒子發光閃爍效果
        p.alpha += Math.sin(Date.now() * p.blinkSpeed) * 0.01;
        if(p.alpha < 0.1) p.alpha = 0.1;
        if(p.alpha > 0.8) p.alpha = 0.8;

        // 邊界循環
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // 畫出粒子
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 加上微微的光暈
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
    });
    ctx.restore();
}

function drawPlayer() {
    ctx.save();
    
    // 將畫布原點移到玩家中心，方便左右翻轉
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    
    // 根據面向翻轉畫面
    if (!player.facingRight) {
        ctx.scale(-1, 1);
    }

    // 狀態判斷
    const isJumping = player.vy < -1;
    const isFalling = player.vy > 1;
    const isRunning = Math.abs(player.vx) > 0.5;

    // 飄動的披風 (金色)
    ctx.fillStyle = '#feca57';
    ctx.beginPath();
    ctx.moveTo(-5, 0); // 脖子位置
    
    // 披風尾端根據移動速度和跳躍狀態改變
    let capeTailX = -25;
    let capeTailY = 15;
    
    if (isRunning) capeTailX = -35 + Math.sin(Date.now() / 100) * 5;
    if (isJumping) { capeTailY = 25; capeTailX = -20; } 
    if (isFalling) { capeTailY = -5; capeTailX = -30; }
 
    ctx.lineTo(capeTailX, capeTailY);
    ctx.lineTo(capeTailX + 10, capeTailY + 5);
    ctx.closePath();
    ctx.fill();

    // B. 身體 (白色膠囊狀)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-10, -10, 20, 38, 10);
    ctx.fill();
    
    // 眼睛 (向右看)
    ctx.fillStyle = '#000000'; 
    ctx.beginPath();
    ctx.arc(4, -2, 3, 0, Math.PI * 2);
    ctx.fill();

    // D. 腳的動態
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    if (isJumping || isFalling) {
        // 跳躍時腳縮起來
        ctx.beginPath(); ctx.moveTo(-4, 20); ctx.lineTo(-8, 28); ctx.stroke(); // 左腳
        ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(8, 25); ctx.stroke();  // 右腳
    } else if (isRunning) {
        // 跑步時腳步交替 (用時間產生 sin 波)
        const legSwing = Math.sin(Date.now() / 80) * 10;
        ctx.beginPath(); ctx.moveTo(-4, 20); ctx.lineTo(-4 - legSwing, 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(4 + legSwing, 30); ctx.stroke();
    } else {
        // 待機時直立
        ctx.beginPath(); ctx.moveTo(-4, 20); ctx.lineTo(-4, 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(4, 30); ctx.stroke();
    }

    ctx.restore();
}

function bindInput() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
        if (e.code === 'ArrowRight') keys.ArrowRight = true;
        if (e.code === 'Space') keys.Space = true;
        if (e.code === 'KeyF') keys.KeyF = true; 
        if (e.code === 'KeyE') {keys.KeyE = true; eatFood();}
        if (e.code === 'KeyX') keys.KeyX = true;
        if (isDialogueActive && e.code === 'Space') advanceDialogue();
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
        if (e.code === 'ArrowRight') keys.ArrowRight = false;
        if (e.code === 'Space') keys.Space = false;
        if (e.code === 'KeyF') keys.KeyF = false;
        if (e.code === 'KeyE') keys.KeyE = false;
        if (e.code === 'KeyX') keys.KeyX = false;
    });

    document.getElementById('dialogue-overlay').addEventListener('click', advanceDialogue);

    document.getElementById('btn-sheep-help').addEventListener('click', () => {
        if (!isDialogueActive) {
            startDialogue(["沒錯，需要幫忙就應該說出口呢~", 
                "使用左右方向鍵移動，空白鍵跳躍。",
                "按 F鍵 進行互動，按 E鍵 吃東西，按 X鍵 揮劍攻擊。", 
                "只要你擁有對應道具，按 F鍵 即可互動，無須選取道具。",
                "前進的道路充滿未知，注意你的飢餓度與可怕的怪物！",
                "人生總是有出乎意料的挑戰，用你的經驗合成出你的正確答案吧。",
                "綠寶石做成的鑰匙，一定很美吧~"]);
        }
    });
    const btnClose = document.getElementById('btn-close-crafting');
    if (btnClose) btnClose.onclick = closeCrafting;

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('crafting-overlay');
            if (!overlay.classList.contains('hidden')) {
                closeCrafting();
            }
        }
    });

    document.getElementById('btn-craft-action').onclick = performCraft;
}

function updateUI() {
    document.getElementById('val-hp').innerText = gameState.playerStats.hp;
    document.getElementById('val-hunger').innerText = gameState.playerStats.hunger;
    document.getElementById('val-wood').innerText = gameState.inventory.wood;
    document.getElementById('val-stone').innerText = gameState.inventory.stone;
    document.getElementById('val-emerald').innerText = gameState.inventory.emerald;
    document.getElementById('val-food').innerText = gameState.inventory.food;

    refreshMainInventory();
}

function advanceDialogue() {
    playSFX('dialogue_click');
    if (currentDialogueQueue.length > 0) {
        const nextLine = currentDialogueQueue.shift();
        document.getElementById('dialogue-text').innerText = nextLine;
        
        if (nextLine.includes("地瓜巧克力")) {
            gameState.inventory.food += 5;
            updateUI();
            SaveSystem.save(gameState);
        }
    } else {
        isDialogueActive = false;
        document.getElementById('dialogue-overlay').classList.add('hidden');

        if (dialogueCallback) {
            const action = dialogueCallback;
            dialogueCallback = null; 
            action(); 
        }
    }
}

function refreshMainInventory() {
    const slots = document.querySelectorAll('#main-inventory-bar .inv-slot');
    
    slots.forEach(slot => {
        const itemName = slot.getAttribute('data-item');
        const count = gameState.inventory[itemName] || 0;
        
        const span = slot.querySelector('span');
        if (span) span.innerText = count;

        if (count === 0) {
            slot.classList.add('empty');
        } else {
            slot.classList.remove('empty');
        }
    });
}

/**
 * 顯示獲得技能的彈窗
 * @param {Object} skillObj - 技能物件 {skill, text, effect}
 * @param {Function} callback - 點擊關閉後執行的動作
 */
function showRewardSkill(skillObj, callback) {
    const modal = document.getElementById('reward-skill-modal');
    const container = document.getElementById('reward-card-container');
    const btn = document.getElementById('btn-collect-reward');

    // 播放獲得物品音效
    playSFX('pickup');

    container.innerHTML = `
        <div class="skill-card" style="margin: 0 auto;">
            <h2 style="color:#feca57; margin-bottom:15px;">【${skillObj.skill}】</h2>
            <p style="line-height:1.6; color:#ccc;">${skillObj.text}</p>
            <div style="margin-top:20px; color:#00e5ff; font-size:0.9rem; border-top:1px solid #333; padding-top:10px;">效果：${skillObj.effect}</div>
        </div>
    `;

    modal.classList.remove('hidden');

    btn.onclick = (e) => {
        e.stopPropagation(); // 阻止冒泡
        modal.classList.add('hidden');
        if (callback) {
            setTimeout(callback, 100); 
        }
    };
}