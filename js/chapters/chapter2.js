import { SaveSystem } from '../saveSystem.js';
import { AudioManager } from '../audioManager.js';
import { getCachedUrl } from '../assetsConfig.js'; 

// 核心變數
let currentRoomIndex = 0; // 0:主, 1:撲克, 2:鏡子, 3:旋轉, 4:水晶
const roomIds = ['scene-main', 'scene-poker', 'scene-mirror', 'scene-rotating', 'scene-oracle'];

const correctCodes = ["2", "0", "2", "6"]; 
const fullQuestion = "如果你問另一個人，哪一扇是正確的門，他會指向哪一扇門？";

// 水晶球文字
const oraclePhrases = [
    "有些事情你已經好好走過來了~ 辛苦你了。", "你不是一個人，需要幫忙都可以找我呢。", "還是要記得好好吃飯鴨~", "很開心可以遇見你。",
    "謝謝你，一直這麼努力。", "是你開了路，讓照亮了一切。", "是不是應該睡覺了，你有好好休息嗎?( ꒪꒫꒪)", "窩，事情變得有趣了。",
    "「？」= 6", 
    "猜猜看鴨，還有多少未知等著你。", "均衡飲食很重要!", "你做得很好，真的~", "希望你可以一直身體健康、平安順遂。",
    "你是屬於你的世界的主角呢~", "記得也要把你自己放進被捕捉的畫面裡。", "這是一個很重要的日子呢。", "謹遵舍長老大的指令。",
    "嗚嗚嗚，不小心又做得太晚了。", "偶爾瘋狂一下也不錯呢。", "前進吧，去尋找這個故事的結局吧。"
];

const sfxPaths = {
    pickup: 'assets/audio/pickup.mp3',
    walk: 'assets/audio/walk.mp3',
    land: 'assets/audio/land.mp3',
    fail: 'assets/audio/fail_buzzer.mp3',  
    success: 'assets/audio/correct_chime.mp3', 
    tick: 'assets/audio/clock_tick.mp3', 
    typing: 'assets/audio/typing.mp3', 
    door_open: 'assets/audio/door_open.mp3',
    dialogue_click: 'assets/audio/dialogue_click.mp3',
};
const sfxInstances = {}; 

function playSFX(name) {
    const originalPath = sfxPaths[name];
    if (!originalPath) return;

    if (!sfxInstances[name]) {
        sfxInstances[name] = new Audio(getCachedUrl(originalPath));
        sfxInstances[name].volume = 0.4;
    }
    sfxInstances[name].currentTime = 0;
    sfxInstances[name].play().catch(() => {});
}

let currentDialogueQueue = [];
let dialogueCallback = null; 
let isDialogueActive = false;
let isReturningFromHatTrick = false;
let dialogueLocked = false;

/**
 * 啟動對話系統
 * @param {Array} linesArray - 對話文字陣列
 * @param {Function} callback - 對話結束後要執行的函式
 */

function startDialogue(linesArray, callback = null) {

    currentDialogueQueue = [...linesArray];
    dialogueCallback = callback;

    const overlay = document.getElementById('dialogue-overlay');
    const nameEl = document.getElementById('dialogue-name');

    nameEl.innerText = "綿羊使者";

    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';

    overlay.removeEventListener('click', advanceDialogue);

    isDialogueActive = true;

    // 防止剛開啟瞬間點擊穿透
    dialogueLocked = true;

    overlay.addEventListener('click', advanceDialogue);

    advanceDialogue();

    setTimeout(() => {
        dialogueLocked = false;
    }, 200);
}

function advanceDialogue(event) {
    if (dialogueLocked) return;
    playSFX('dialogue_click');
    // 如果有事件物件，阻止它繼續傳遞
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    // 安全檢查：如果對話已經被關閉，就不執行
    if (!isDialogueActive) return;

    const textEl = document.getElementById('dialogue-text');
    const overlay = document.getElementById('dialogue-overlay');
    const nameEl = document.getElementById('dialogue-name');
    const boxEl = document.getElementById('dialogue-box');

    if (currentDialogueQueue.length > 0) {
        const nextLine = currentDialogueQueue.shift();
        
        // 解析標籤 (這部分維持你的邏輯)
        if (nextLine.startsWith("警告:")) {
            overlay.classList.remove('hero-mode');
            overlay.classList.add('warning-mode');
            boxEl.classList.add('glitch-shake');
            nameEl.innerText = "幻術之門的警告";
            textEl.innerText = nextLine.replace("警告:", "");
        } else if (nextLine.startsWith("勇者:")) {
            overlay.classList.remove('warning-mode');
            boxEl.classList.remove('glitch-shake');
            overlay.classList.add('hero-mode');
            boxEl.classList.remove('glitch-shake');
            nameEl.innerText = "26歲的勇者";
            textEl.innerText = nextLine.replace("勇者:", "");
            document.getElementById('sheep-messenger-img').src = "assets/images/hero_26.png"; 
        } else if (nextLine.startsWith("綿羊使者:")) {
            overlay.classList.remove('hero-mode');
            overlay.classList.remove('warning-mode');
            boxEl.classList.remove('glitch-shake');
            nameEl.innerText = "綿羊使者";
            textEl.innerText = nextLine.replace("綿羊使者:", "");
            document.getElementById('sheep-messenger-img').src = "assets/images/sheep_messenger.png";
        } else {
            overlay.classList.remove('warning-mode');
            overlay.classList.remove('hero-mode');
            boxEl.classList.remove('glitch-shake');
            nameEl.innerText = "綿羊使者";
            textEl.innerText = nextLine;
            document.getElementById('sheep-messenger-img').src = "assets/images/sheep_messenger.png";
        }
    } else {
        // 對話結束清理
        closeDialogue();
    }
}

function closeDialogue() {
    const overlay = document.getElementById('dialogue-overlay');
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
    overlay.classList.remove('warning-mode');
    
    // 移除監聽器
    overlay.removeEventListener('click', advanceDialogue);
    
    isDialogueActive = false;

    // 執行回調
    if (dialogueCallback) {
        const action = dialogueCallback;
        dialogueCallback = null;
        action();
    }
}

let shuffledOracle = [];
let oracleIndex = 0;
let roomRotation = 0;

let guardsAsked = false; // 是否已經問過問題
let selectedDoorSide = "";

let ballCanvas, ballCtx;
let ballPhysicsId;

// 物理球實體
const ball = {
    x: 100, y: 400,
    vx: 0, vy: 0,
    radius: 15,
    gravity: 0.25,
    friction: 0.98, 
    bounce: 0.7,    
};

// 目標箱子的位置 (相對於房間)
const targetBox = { x: 150, y: 120, width: 60, height: 60 };

export const Chapter2 = {
    init: () => {
        document.getElementById('staircase-screen').classList.add('hidden');
        document.getElementById('chapter2-screen').classList.remove('hidden');

        const btnShuffle = document.getElementById('btn-start-shuffle');
        if (btnShuffle) btnShuffle.onclick = shuffleHats;

        const btnHatGame = document.getElementById('btn-start-hat-game');
        if (btnHatGame) btnHatGame.onclick = shuffleHats;
        
        AudioManager.playBGM('assets/audio/Velvet Curtain Alchemy.mp3');

        const gameState = SaveSystem.load();
        
        // ★ 檢查是否已經問過問題 (讀取存檔狀態)
        if (gameState && gameState.flags && gameState.flags.guardsAsked) {
            guardsAsked = true;

            document.querySelector('#guardian-a .speech-bubble').innerText = "他會指右邊那扇。";
            document.querySelector('#guardian-b .speech-bubble').innerText = "他會指右邊那扇。";

            document.getElementById('btn-open-question-build').style.display = 'none';
            showToast("歡迎回來，守衛的指引依舊有效。");
        } else {
            startDialogue([
                "綿羊使者: 勇者，此處是幻術之門的入口，除此之外，我感受到裡面一層又一層的，像是在保護著什麼...",
                "綿羊使者: 看來我們必須到魔術帽的最深處一探究竟了。",
                "綿羊使者: 前方兩位守衛守護著真實與虛假之門，找出那個能讓你看到真相的問題吧。"
            ]);
        }
        
        setupPokerWall(); // 初始化撲克牌
        setupOracle();    // 初始化水晶球文字
        bindEvents();     // 綁定所有點擊事件
        bindOracleEvents(); 
        bindMirrorEvents();
        bindRotationEvents();
        initBallPhysics();
        bindChallengeEvents();
    },
    resumeAtGates: () => {
        console.log("💾 正在恢復 Chapter 2.5 進度...");
        
        // 1. 隱藏之前的章節
        document.getElementById('staircase-screen').classList.add('hidden');
        document.getElementById('chapter2-screen').classList.add('hidden'); // 隱藏謎題房間
        
        // 2. 顯示 12 門畫面
        const screen = document.getElementById('illusion-gates-screen');
        if (screen) screen.classList.remove('hidden');

        bindChallengeEvents();
        startIllusionGates();
    }
};

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

function bindEvents() {

    // 1. 開啟/關閉密碼彈窗
    document.getElementById('btn-open-question-build').onclick = () => {
        document.getElementById('question-modal').classList.remove('hidden');
    };
    document.getElementById('btn-close-modal').onclick = () => {
        document.getElementById('question-modal').classList.add('hidden');
    };

    // 2. 密碼輸入與自動關閉
    const inputs = document.querySelectorAll('.code-inputs input');
    inputs.forEach(input => {
        input.oninput = () => {
            const isCorrect = checkAssembledQuestion();
            if (isCorrect) {
                showToast("咒語已拼湊完成！");
            }
        };
    });

    // 3. 提問邏輯
    document.getElementById('btn-ask-guards').onclick = handleAskGuards;

    // 4. 點擊門的邏輯
    document.getElementById('gate-left').onclick = () => handleDoorClick(true);
    document.getElementById('gate-right').onclick = () => handleDoorClick(false);

    // 5. 確認進入門的彈窗按鈕
    document.getElementById('btn-door-yes').onclick = () => {
        document.getElementById('confirm-door-modal').classList.add('hidden');
        enterDoor(selectedDoorSide === "左邊"); // 根據選擇執行進入邏輯
    };
    document.getElementById('btn-door-no').onclick = () => {
        document.getElementById('confirm-door-modal').classList.add('hidden');
    };

    // 1. 導覽按鈕
    document.getElementById('btn-next-room').onclick = () => switchRoom(1);
    document.getElementById('btn-prev-room').onclick = () => switchRoom(-1);

    // 2. 鏡子房間 (滑桿)
    const mirrorSlider = document.getElementById('mirror-slider');
    if (mirrorSlider) {
        mirrorSlider.oninput = (e) => {
            const value = e.target.value;
            const clue = document.getElementById('mirror-clue');
            // 當滑過特定角度顯示密碼碎片 2
            if (value > 80 && value < 90) {
                clue.style.opacity = 1;
                clue.innerText = "「哪一扇是正確的門，」= 0";
            } else {
                clue.style.opacity = 0;
            }
        };
    }

    // 3. 旋轉房間
    const btnRotate = document.getElementById('btn-rotate-room');
    if (btnRotate) {
        btnRotate.onclick = () => {
            roomRotation += 90;
            const room = document.getElementById('rotating-content');
            room.style.transform = `rotate(${roomRotation}deg)`;
            // 當轉到 180 度時，顯示密碼碎片 3
            if (roomRotation % 360 === 180 || roomRotation % 360 === -180) {
                document.getElementById('rotating-clue').classList.remove('hidden');
            }
        };
    }

    // 4. 水晶球
    const crystalBall = document.getElementById('crystal-ball');
    if (crystalBall) {
        crystalBall.onclick = () => {
            const text = document.getElementById('oracle-text');
            text.innerText = shuffledOracle[oracleIndex];
            oracleIndex++;
            if (oracleIndex >= shuffledOracle.length) setupOracle();
        };
    }
}

function switchRoom(dir) {
    // 隱藏當前
    document.getElementById(roomIds[currentRoomIndex]).classList.add('hidden');
    
    // 計算下一個
    currentRoomIndex += dir;
    if (currentRoomIndex < 0) currentRoomIndex = roomIds.length - 1;
    if (currentRoomIndex >= roomIds.length) currentRoomIndex = 0;
    
    // 顯示下一個
    document.getElementById(roomIds[currentRoomIndex]).classList.remove('hidden');
    console.log(`切換至場景: ${roomIds[currentRoomIndex]}`);
}

let shuffleInterval = null;

function setupPokerWall() {
    const area = document.getElementById('floating-cards-area');
    area.innerHTML = "";
    
    const correctIdx = Math.floor(Math.random() * 12);
    const cards = [];

    for (let i = 0; i < 12; i++) {
        const card = document.createElement('div');
        card.className = "tarot-card";
        
        // 設定初始隨機位置
        const pos = getRandomPos();
        card.style.left = pos.x + "px";
        card.style.top = pos.y + "px";
        
        // 設定內容
        const content = (i === correctIdx) 
            ? "「如果你問另一個人，」= 2" 
            : "(´･ω･`)";

        card.innerHTML = `
            <div class="card-face card-back"></div>
            <div class="card-face card-front">${content}</div>
        `;

        card.onclick = () => {
            if (card.classList.contains('flipped')) return; // 已經翻開的不能重複點
            
            // 1. 翻面
            card.classList.add('flipped');
            if (i === correctIdx) {
                playSFX('pickup');
                showToast("發現碎片！");
            } else {
                playSFX('typing');
            }

            // 2. 3秒後翻回去
            setTimeout(() => {
                card.classList.remove('flipped');
            }, 3000);
        };

        area.appendChild(card);
        cards.push(card);
    }

    // ★ 定時打亂位置 (每 5 秒移動一次)
    if (shuffleInterval) clearInterval(shuffleInterval);
    shuffleInterval = setInterval(() => {
        cards.forEach(card => {
            if (!card.classList.contains('flipped')) { // 翻開中的卡牌先不要動
                const newPos = getRandomPos();
                card.style.left = newPos.x + "px";
                card.style.top = newPos.y + "px";
            }
        });
    }, 5000);
}

// 輔助函式：取得畫布範圍內的隨機座標
function getRandomPos() {
    // 假設遊戲區域是 800x500，扣除卡牌寬度
    return {
        x: Math.random() * (800 - 70),
        y: Math.random() * (500 - 110)
    };
}

function setupOracle() {
    shuffledOracle = [...oraclePhrases].sort(() => Math.random() - 0.5);
    oracleIndex = 0;
}

let oracleHideTimer = null;

function bindOracleEvents() {
    const hotspot = document.getElementById('crystal-ball-hotspot');
    const overlay = document.getElementById('oracle-overlay');
    const textDisplay = document.getElementById('oracle-text-display');

    if (!hotspot || !overlay || !textDisplay) return;

    hotspot.onclick = () => {
        playSFX('pickup');

        overlay.classList.remove('hidden');
        overlay.style.opacity = 1;

        const currentText = shuffledOracle[oracleIndex];
        textDisplay.innerText = currentText;
        
        textDisplay.style.color = (currentText === "「？」= 6") ? "#00e5ff" : "#feca57";

        oracleIndex++;
        if (oracleIndex >= shuffledOracle.length) setupOracle();

        // 如果之前已經有計時器在跑，先清除它，重新計算 5 秒
        if (oracleHideTimer) clearTimeout(oracleHideTimer);

        oracleHideTimer = setTimeout(() => {
            // 使用淡出效果
            overlay.style.opacity = 0;
            // 等淡出動畫完後再加上 hidden
            setTimeout(() => {
                if (overlay.style.opacity == "0") {
                    overlay.classList.add('hidden');
                }
            }, 500);
        }, 3000);
        
        // 水晶球點擊視覺反饋
        hotspot.style.backgroundColor = "rgba(255,255,255,0.2)";
        setTimeout(() => { hotspot.style.backgroundColor = "transparent"; }, 100);
    };
}

function checkAssembledQuestion() {
    const inputCodes = [
        document.getElementById('code-1').value,
        document.getElementById('code-2').value,
        document.getElementById('code-3').value,
        document.getElementById('code-4').value
    ];
    
    const display = document.getElementById('assembled-question');
    if (JSON.stringify(inputCodes) === JSON.stringify(correctCodes)) {
        display.innerText = "問句已組合：" + fullQuestion;
        display.style.color = "#feca57";
        return true;
    } else {
        display.innerText = "組合密碼中...";
        display.style.color = "white";
        return false;
    }
}

function handleAskGuards() {
    const display = document.getElementById('assembled-question');
    if (!display.innerText.includes(fullQuestion)) {
        showToast("密碼尚未配對成功");
        return;
    }

    guardsAsked = true; // ★ 標記已提問
    
    // 守衛回答
    document.querySelector('#guardian-a .speech-bubble').innerText = "他會指右邊那扇。";
    document.querySelector('#guardian-b .speech-bubble').innerText = "他會指右邊那扇。";
    
    document.getElementById('question-modal').classList.add('hidden');
    saveProgressAtGuards();
    showToast("守衛已給出指引...");
}

// 點擊門的處理
function handleDoorClick(isLeft) {
    if (!guardsAsked) {
        showToast("在選擇之前，應該先利用密碼詢問守衛...");
        return;
    }

    if (isReturningFromHatTrick) {
        document.getElementById('gate-right').style.opacity = "0.3";
        document.getElementById('gate-right').style.cursor = "not-allowed";
        document.getElementById('gate-right').style.filter = "grayscale(100%)";
        if (!isLeft) {
            showToast("你已經領教過這扇門的厲害了，別再上當。");
            return;
        }
    }

    selectedDoorSide = isLeft ? "左邊" : "右邊";
    
    // 顯示確認視窗
    const confirmModal = document.getElementById('confirm-door-modal');
    const confirmText = document.getElementById('confirm-door-text');
    confirmText.innerText = `確定要進入${selectedDoorSide}這扇門嗎？`;
    confirmModal.classList.remove('hidden');
}

let hatWithKey = 0; // 哪一頂帽子有鑰匙 (0, 1, 2)
let isShuffling = false;

function enterDoor(isCorrect) {
    if (isCorrect) {
        const trueSkill = ({
            skill: "True or False",
            text: "看穿真偽的能力，讓你身手更加矯健。",
            effect: "躲避敵人攻擊一回合"
        });
        addSkillToInventory(trueSkill);

        showRewardSkill(trueSkill, () => {
            startDialogue([
                "不愧是你，你找到了正解。",
                "不過現在，真正的試煉才要開始。"
            ], () => {
                const flash = document.getElementById('flash-overlay');
                flash.classList.add('flash-anim');
                setTimeout(() => {
                    startIllusionGates(); 
                }, 400);
                setTimeout(() => { flash.classList.remove('flash-anim'); }, 800);
            });
        });
    } else {

        startDialogue(["好笨，你被虛假所迷惑，墜入了帽子戲法！"], () => {
            if (AudioManager.currentTrack !== 'assets/audio/HatTrick.mp3') {
                AudioManager.stopBGM();
                AudioManager.playBGM('assets/audio/HatTrick.mp3');
            }
            startHatMinigame();
        });
    }
}

// 觸發帽子戲法
async function startHatMinigame() {
    const flash = document.getElementById('flash-overlay');
    const hatScreen = document.getElementById('hat-minigame-screen');
    const mainScene = document.getElementById('scene-main');

    // 播放閃黑動畫
    flash.classList.add('flash-anim');

    await new Promise(r => setTimeout(r, 500));
    
    hatScreen.classList.remove('hidden');
    mainScene.classList.add('hidden'); // 隱藏原本的守衛場景
    resetHats(); // 初始化帽子位置

    // 等動畫結束 (0.6s) 移除類別
    await new Promise(r => setTimeout(r, 1500));
    flash.classList.remove('flash-anim');
}

function resetHats() {
    return new Promise((resolve) => {
        const wrappers = document.querySelectorAll('.hat-wrapper');
        const positions = ["15%", "45%", "75%"];
        const statusText = document.getElementById('hat-status-text');
        const shuffleBtn = document.getElementById('btn-start-shuffle');
        
        hatWithKey = Math.floor(Math.random() * 3);
        isShuffling = false;

        if (shuffleBtn) {
            shuffleBtn.style.display = "block";
            shuffleBtn.disabled = true; // ★ 先禁用，防止在展示時點擊
            shuffleBtn.style.opacity = "0.5";
        }

        statusText.innerText = "請記住鑰匙的位置！";

        wrappers.forEach((hat, i) => {
            hat.style.left = positions[i];
            hat.style.top = "50%";
            
            const key = hat.querySelector('.item-under-hat');
            if (i === hatWithKey) {
                key.classList.remove('hidden');
                hat.style.top = "30%"; // 浮起來展示
                
                // 3秒後蓋回去
                setTimeout(() => { 
                    hat.style.top = "50%"; 
                    setTimeout(() => {
                        key.classList.add('hidden');
                        // ★ 展示結束，啟用按鈕並回傳 resolve
                        if (shuffleBtn) {
                            shuffleBtn.disabled = false;
                            shuffleBtn.style.opacity = "1";
                            statusText.innerText = "準備好了嗎？點擊開始洗牌";
                        }
                        resolve(); 
                    }, 300);
                }, 3000);
            } else {
                key.classList.add('hidden');
            }
            hat.onclick = () => handleHatClick(i);
        });
    });
}

async function shuffleHats() {
    if (isShuffling) return;
    isShuffling = true;
    
    const btn = document.getElementById('btn-start-shuffle');
    if (btn) btn.style.display = "none";
    
    document.getElementById('hat-status-text').innerText = "看好了，表演開始...";

    const wrappers = Array.from(document.querySelectorAll('.hat-wrapper'));
    const positions = ["15%", "45%", "75%"];
    let currentMap = [0, 1, 2];

    for (let i = 0; i < 12; i++) {
        let a = Math.floor(Math.random() * 3);
        let b = (a + 1 + Math.floor(Math.random() * 2)) % 3;

        [currentMap[a], currentMap[b]] = [currentMap[b], currentMap[a]];
        
        // ★ 加上 try-catch 防止元素不存在報錯
        try {
            wrappers[currentMap[0]].style.left = positions[0];
            wrappers[currentMap[1]].style.left = positions[1];
            wrappers[currentMap[2]].style.left = positions[2];
        } catch(e) {}

        // 隨機抖動效果
        wrappers.forEach(w => w.style.top = (45 + Math.random() * 10) + "%");

        await new Promise(r => setTimeout(r, 400 - (i * 20))); // 速度遞增
    }

    // 歸位
    wrappers.forEach(w => w.style.top = "50%");
    isShuffling = false;
    document.getElementById('hat-status-text').innerText = "選一頂吧！鑰匙在哪？";
}

async function handleHatClick(idx) {
    if (isShuffling) return;
    const wrappers = document.querySelectorAll('.hat-wrapper');
    const statusText = document.getElementById('hat-status-text');
    const flash = document.getElementById('flash-overlay');
    const hatScreen = document.getElementById('hat-minigame-screen');
    const mainScene = document.getElementById('scene-main');

    wrappers[idx].style.top = "30%";

    if (idx === hatWithKey) {
        wrappers[idx].querySelector('.item-under-hat').classList.remove('hidden');
        statusText.innerText = "精彩的表演！";
        showToast('獲得技能: 帽子戲法');
        playSFX('pickup');
        
        const newSkill = ({
            skill: "帽子戲法",
            text: "混亂敵人的視覺，讓你有第二次機會。",
            effect: "本回合可增加一項出擊技能"
        });

        addSkillToInventory(newSkill);
        await new Promise(r => setTimeout(r, 2000));

        // ★ 轉場回到守衛主場景
        flash.classList.add('flash-anim');
        await new Promise(r => setTimeout(r, 400));

        hatScreen.classList.add('hidden');
        mainScene.classList.remove('hidden');
        isReturningFromHatTrick = true;
        
        // 切換音樂回主旋律
        AudioManager.stopBGM();
        AudioManager.playBGM('assets/audio/Velvet Curtain Alchemy.mp3');

        await new Promise(r => setTimeout(r, 400));
        flash.classList.remove('flash-anim');

        showRewardSkill(newSkill, () => {
            startDialogue([
                "綿羊使者: 不錯嘛，竟然能從帽子戲法中帶回這份力量。",
                "綿羊使者: 現在，幻術已經對你失效了。去打開那扇正確的門吧。"
            ], () => {
                // 讓右邊的門失效
                document.getElementById('gate-right').style.opacity = "0.3";
                document.getElementById('gate-right').style.pointerEvents = "none";
                document.getElementById('gate-right').style.filter = "grayscale(100%)";
            });
        });
    } else {
        statusText.innerText = "看漏了嗎？再試一次。";
        await new Promise(r => setTimeout(r, 1500));
        resetHats(); 
    }
}

// 5. 輔助函式：新增技能
function addSkillToInventory(skillObj) {
    const gameState = SaveSystem.load();
    if (!gameState.skills) gameState.skills = [];
    
    // 檢查是否已經有這個技能
    if (!gameState.skills.some(s => s.skill === skillObj.skill)) {
        gameState.skills.push(skillObj);
        SaveSystem.save(gameState);
        console.log(`獲得特質: ${skillObj.skill}`);
    }
}

function bindMirrorEvents() {
    const slider = document.getElementById('mirror-slider');
    const reflection = document.getElementById('mirror-reflection');
    const clue = document.getElementById('mirror-clue');

    if (!slider || !reflection || !clue) return;

    slider.oninput = (e) => {
        const val = parseInt(e.target.value);
        
        // 1. 同步移動鏡子內的背景位置 (產生視角偏移感)
        // val 是 0-100，我們將其映射到 -20% 到 20%
        const offset = (val - 50) / 2;
        reflection.style.transform = `translateX(${offset}px)`;

        // 2. 角度判定 (假設正確角度在 82% ~ 88% 之間)
        if (val >= 82 && val <= 88) {
            clue.style.opacity = 1;
            clue.style.transform = "scale(1.1)";
            
            // 第一次發現時跳提示
            if (clue.dataset.found !== "true") {
                showToast("你看見了鏡子深處隱藏的文字！");
                playSFX('pickup');
                clue.dataset.found = "true";
            }
        } else {
            clue.style.opacity = 0;
            clue.style.transform = "scale(1)";
        }
    };
}

let clueFound = false;

function initBallPhysics() {
    ballCanvas = document.getElementById('physics-ball-canvas');
    ballCtx = ballCanvas.getContext('2d');
    
    // 啟動物理循環
    if (ballPhysicsId) cancelAnimationFrame(ballPhysicsId);
    ballPhysicsLoop();
}

function ballPhysicsLoop() {
    updateBall();
    drawBall();
    ballPhysicsId = requestAnimationFrame(ballPhysicsLoop);
}

function updateBall() {
    // 使用累積角度的餘數來判定重力方向
    const gravityAngle = totalRotation % 360;

    let gx = 0, gy = 0;
    
    // 0度 或 360度: 重力向下
    if (gravityAngle === 0) gy = ball.gravity;
    // 90度 或 450度: 重力向左
    else if (gravityAngle === 90) gx = ball.gravity;
    // 180度 或 540度: 重力向上 (箱子在上方，這是目標角度)
    else if (gravityAngle === 180) gy = -ball.gravity;
    // 270度 或 630度: 重力向右
    else if (gravityAngle === 270) gx = -ball.gravity;

    // 套用物理運動 (其餘保持不變)
    ball.vx += gx;
    ball.vy += gy;
    ball.vx *= ball.friction;
    ball.vy *= ball.friction;
    ball.x += ball.vx;
    ball.y += ball.vy;

    // 3. 牆壁碰撞偵測 (Canvas 邊界 500x500)
    const size = 500;
    if (ball.x + ball.radius > size) { ball.x = size - ball.radius; ball.vx *= -ball.bounce;  }
    if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.vx *= -ball.bounce;  }
    if (ball.y + ball.radius > size) { ball.y = size - ball.radius; ball.vy *= -ball.bounce; }
    if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.vy *= -ball.bounce; }

    // 4. 箱子判定 (進入條件)
    if (!clueFound && 
        ball.x > targetBox.x && ball.x < targetBox.x + targetBox.width &&
        ball.y > targetBox.y && ball.y < targetBox.y + targetBox.height) {
        triggerSuccess();
    }
}

function drawBall() {
    ballCtx.clearRect(0, 0, 500, 500);

    // 繪製目標箱子 (半透明金框)
    ballCtx.strokeStyle = clueFound ? "#00e5ff" : "#977834";
    ballCtx.lineWidth = 3;
    ballCtx.strokeRect(targetBox.x, targetBox.y, targetBox.width, targetBox.height);
    ballCtx.fillStyle = "rgba(254, 202, 87, 0.2)";
    ballCtx.fillRect(targetBox.x, targetBox.y, targetBox.width, targetBox.height);

    // 繪製物理球
    ballCtx.beginPath();
    ballCtx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ballCtx.fillStyle = "#fff";
    ballCtx.shadowBlur = 15;
    ballCtx.shadowColor = "gold";
    ballCtx.fill();
    ballCtx.closePath();
}

let totalRotation = 0; // 紀錄累積角度：0, 90, 180, 270, 360, 450...

function bindRotationEvents() {
    const btn = document.getElementById('btn-rotate-room');
    const wrapper = document.getElementById('rotating-wrapper');

    if (!btn || !wrapper) return;

    btn.onclick = () => {
        if (clueFound) return;

        totalRotation += 90;
        wrapper.style.transform = `rotate(${totalRotation}deg)`;

        const effectiveAngle = totalRotation % 360;

        ball.vx += (Math.random() - 0.5) * 10;
        ball.vy += (Math.random() - 0.5) * 10;

        console.log(`目前總旋轉：${totalRotation}度，有效重力角度：${effectiveAngle}度`);
    };
}

function triggerSuccess() {
    clueFound = true;
    playSFX('pickup');
    
    const paper = document.getElementById('floating-paper');
    paper.classList.remove('hidden');
    paper.classList.add('paper-drop');
    
    showToast("小球進入了機關箱！紙條飄落了...");
}

function saveProgressAtGuards() {
    const gameState = SaveSystem.load();
    
    // 更新必要資訊
    gameState.chapter = 2;
    gameState.checkpoint = "guards_answered"; // 標記具體位置
    
    // 確保 flags 物件存在
    if (!gameState.flags) gameState.flags = {};
    gameState.flags.guardsAsked = true; 
    
    // 儲存回 localStorage
    SaveSystem.save(gameState);
    console.log("💾 第一道門完成，已自動存檔");
}

let currentGateLevel = 1;
let currentCode = "";
let currentInput = "";
let currentDoorIdx = 1; // 預設中間那扇門 (0, 1, 2)
let gateTimer = null;
let timeLeft = 100;
let isChallengeActive = false;

// --- 啟動 12 門挑戰 ---
function startIllusionGates() {
    const gameState = SaveSystem.load();
    gameState.chapter = 2.5;
    SaveSystem.save(gameState);

    document.getElementById('hat-minigame-screen').classList.add('hidden');
    document.getElementById('scene-main').classList.add('hidden');
    document.getElementById('illusion-gates-screen').classList.remove('hidden');

    AudioManager.stopBGM();
    AudioManager.playBGM('assets/audio/Hull-Slap Echoes.mp3');

    setTimeout(() => {
        startDialogue([
            "綿羊使者: 勇者，歡迎進入幻術之門。",
            "綿羊使者: 在這 12 層空間，只有紅色的門才是唯一的出口。",
            "綿羊使者: 每層開始時會閃現密碼，你必須在限時內輸入並通過。",
            "警告:勇者，我承認你的智慧與勇氣，但你不能再前進了。",
            "警告:在這每一層的幻術之門中，除非有敏銳的觀察、判斷與速度，否則將陷入「無限的輪迴」。",
            "警告:若你執意前進，那就記住密碼、找到紅色出口吧。當然，我非常樂意你就在這裡永遠的陪伴著我。",
            "綿羊使者: 時間是不等人的，好好抓住屬於你的時間吧！",
            "綿羊使者: 你一定可以的，前進吧!",
            "綿羊使者: 準備好了嗎？試煉開始。"
        ], () => {
            currentGateLevel = 1;
            initLevel();
        });
    }, 500);
}

function initLevel() {
    isChallengeActive = false;
    currentInput = "";
    updateKeypadDisplay();
    document.getElementById('illusion-keypad').classList.add('hidden');
    
    // 門歸位到中間 (第 1 扇)
    currentDoorIdx = 1;
    document.getElementById('doors-slider').style.transform = `translateX(-600px)`;

    const levelText = document.getElementById('gate-level-indicator');
    levelText.innerText = `LEVEL ${String(currentGateLevel).padStart(2, '0')} / 12`;

    // 1. 生成密碼
    currentCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    // 2. ★ 分配門的顏色與背景圖
    const redDoorIdx = Math.floor(Math.random() * 3);
    const doors = document.querySelectorAll('.illusion-door');
    
    doors.forEach((door, i) => {
        door.classList.remove('door-red', 'door-white', 'red');
        if (i === redDoorIdx) {
            door.classList.add('door-red', 'red');
        } else {
            door.classList.add('door-white');
        }
        door.onclick = () => handleDoorClickInChallenge(i === redDoorIdx);
    });

    // 3. 閃現密碼 (維持原樣)
    const codeDisplay = document.getElementById('code-flash-display');
    codeDisplay.innerText = currentCode.split('').join(' ');
    codeDisplay.classList.remove('hidden');

    setTimeout(() => {
        codeDisplay.classList.add('hidden');
        startCountdown(); 
    }, 2500);
}

let lastPlayedSecond = -1;

function startCountdown() {
    isChallengeActive = true;
    timeLeft = 100;
    lastPlayedSecond = -1;

    // ★ 關鍵修正：定義開始時間
    const startTime = Date.now(); 
    
    // 計算總限時 (毫秒)
    const timeLimit = Math.max(3000, 13000 - (currentGateLevel * 800)); // 稍微調整難度
    
    if (gateTimer) clearInterval(gateTimer);
    
    gateTimer = setInterval(() => {
        // 現在 startTime 有定義了，這行就能正常運作
        const elapsed = Date.now() - startTime;
        
        // 計算剩餘百分比
        timeLeft = Math.max(0, 100 - (elapsed / timeLimit * 100));
        
        const timerBar = document.getElementById('illusion-timer-bar');
        if (timerBar) timerBar.style.width = timeLeft + "%";

        // 倒數音效邏輯
        const secondsRemaining = Math.ceil((timeLimit - elapsed) / 1000);
        
        if (secondsRemaining <= 5 && secondsRemaining > 0 && secondsRemaining !== lastPlayedSecond) {
            playSFX('tick');
            lastPlayedSecond = secondsRemaining;
            
            // 閃爍效果
            if (timerBar) {
                timerBar.style.backgroundColor = "#fff";
                setTimeout(() => { timerBar.style.backgroundColor = "#ff4757"; }, 100);
            }
        }

        // 時間到處理
        if (timeLeft <= 0) {
            clearInterval(gateTimer);
            failChallenge("時間到！幻術將你吞噬...");
        }
    }, 50); 
}

function handleDoorClickInChallenge(isRed) {
    if (!isChallengeActive) return;

    if (!isRed) {
        failChallenge("選錯了門，陷入無限輪迴...");
        return;
    }

    // 點擊紅門，彈出鍵盤
    document.getElementById('illusion-keypad').classList.remove('hidden');
}

/**
 * 顯示受傷/錯誤特效
 * @param {number} amount - 傷害數值，若為 0 則代表單純的錯誤回饋
 */
function showDamageEffect(amount) {
    // 1. 全螢幕閃紅
    const flash = document.createElement('div');
    flash.className = 'error-flash-overlay';
    document.body.appendChild(flash);
    
    setTimeout(() => flash.remove(), 400);

    // 2. 讓門的視窗震動 (增加挫敗感)
    const viewport = document.querySelector('.doors-viewport');
    if (viewport) {
        viewport.classList.add('shake-effect');
        setTimeout(() => viewport.classList.remove('shake-effect'), 400);
    }

    // 3. 如果傷害大於 0，顯示扣血跳字 (像 Chapter 1 那樣)
    if (amount > 0) {
        const damageTxt = document.createElement('div');
        damageTxt.className = 'damage-text'; // 複用 Chapter 1 的 CSS
        damageTxt.innerText = `-${amount} HP`;
        
        // 放在螢幕中間偏上
        damageTxt.style.position = 'fixed';
        damageTxt.style.left = '50%';
        damageTxt.style.top = '40%';
        damageTxt.style.zIndex = '10000';
        
        document.body.appendChild(damageTxt);
        setTimeout(() => damageTxt.remove(), 1000);
    }

    // 4. 播放失敗音效 (建議加入)
    // playSFX('fail_buzzer'); 
}

function failChallenge(msg) {
    clearInterval(gateTimer);
    isChallengeActive = false;
    document.getElementById('illusion-keypad').classList.add('hidden');
    
    playSFX('fail');
    showDamageEffect(0); // 借用 Chapter 1 的特效

    alert(msg);
    currentGateLevel = 1;
    initLevel();
}

// 綁定鍵盤
document.querySelectorAll('.num-key').forEach(btn => {
    btn.onclick = () => {
        if (currentInput.length < 4) {
            currentInput += btn.innerText;
            updateKeypadDisplay();
            if (currentInput.length === 4) checkCode();
        }
    };
});

document.getElementById('btn-clear-keypad').onclick = () => {
    currentInput = "";
    updateKeypadDisplay();
};

function updateKeypadDisplay() {
    document.getElementById('keypad-display').innerText = currentInput.padEnd(4, '_');
}

function checkCode() {
    if (currentInput === currentCode) {
        // 成功過一關
        clearInterval(gateTimer);
        currentGateLevel++;
        playSFX('success');
        document.getElementById('illusion-keypad').classList.add('hidden');
        
        if (currentGateLevel > 12) {
            finishIllusionGates();
        } else {
            showToast("正確！深入下一層...");
            setTimeout(initLevel, 800);
        }
    } else {
        failChallenge("密碼錯誤，被傳送回入口...");
    }
}

// 門的左右切換
function switchChallengeDoor(dir) {
    currentDoorIdx += dir;
    if (currentDoorIdx < 0) currentDoorIdx = 0;
    if (currentDoorIdx > 2) currentDoorIdx = 2;
    
    const slider = document.getElementById('doors-slider');
    slider.style.transform = `translateX(${-currentDoorIdx * 600}px)`;
}

function bindChallengeEvents() {
    // 左右門切換
    document.getElementById('btn-door-left').onclick = () => switchChallengeDoor(-1);
    document.getElementById('btn-door-right').onclick = () => switchChallengeDoor(1);
    
    // 數字鍵盤
    document.querySelectorAll('.num-key').forEach(btn => {
        btn.onclick = () => {
            playSFX('typing');

            if (currentInput.length < 4) {
                currentInput += btn.innerText;
                updateKeypadDisplay();
                if (currentInput.length === 4) checkCode();
            }
        };
    });
    
    const clearBtn = document.getElementById('btn-clear-keypad');
    if (clearBtn) clearBtn.onclick = () => {
        currentInput = "";
        updateKeypadDisplay();
    };
}

function finishIllusionGates() {
    clearInterval(gateTimer);
    AudioManager.stopBGM();

    playSFX('door_open');
    
    startDialogue([
        "綿羊使者: 呼... 太驚險了，你竟然真的走完了這 12 層維度。",
        "警告:「...嘖，你真是太過分了，竟然能突破幻術之門的阻擋。」",
        "警告:「但我還是勸你不要再前進了，他並不想見你。」",
        "綿羊使者: 看來我們越來越接近真相了，你已經拿到了 12 號出口的力量。前進吧！"
    ], async () => {
        const screen25 = document.getElementById('illusion-gates-screen');
        screen25.classList.add('hidden'); 

        await showChapter3Title();

        import('./chapter3.js').then(m => m.Chapter3.init());
    });
}

async function showChapter3Title() {
    const titleScreen = document.getElementById('chapter-title-screen');
    const numEl = document.getElementById('chapter-number');
    const nameEl = document.getElementById('chapter-name');

    numEl.innerText = "Chapter 3";
    nameEl.innerText = "接住逃跑的你";

    titleScreen.classList.remove('hidden');
    titleScreen.style.opacity = 1;
    titleScreen.style.display = 'flex'; // 確保它是 flex 居中

    await new Promise(r => setTimeout(r, 3000));

    titleScreen.style.opacity = 0;
    await new Promise(r => setTimeout(r, 1000));
    titleScreen.classList.add('hidden');
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
            setTimeout(callback, 300); 
        }
    };
}

