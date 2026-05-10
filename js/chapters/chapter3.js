import { SaveSystem } from '../saveSystem.js';
import { AudioManager } from '../audioManager.js';
import { getCachedUrl } from '../assetsConfig.js'; 

let currentDialogueQueue = [];
let dialogueCallback = null; 
let isDialogueActive = false;

const sfxPaths = {
    knock: 'assets/audio/knock.mp3',
    pickup: 'assets/audio/pickup.mp3',
    walk: 'assets/audio/walk.mp3',
    land: 'assets/audio/land.mp3',
    fail: 'assets/audio/fail_buzzer.mp3',  
    success: 'assets/audio/correct_chime.mp3', 
    tick: 'assets/audio/clock_tick.mp3', 
    typing: 'assets/audio/typing.mp3', 
    hit: 'assets/audio/hit.mp3',
    playerHit: 'assets/audio/player_hit.mp3',
    craft: 'assets/audio/craft_success.mp3',
    dialogue_click: 'assets/audio/dialogue_click.mp3',
};

const sfxInstances = {}; 

function playSFX(name) {
    const originalPath = sfxPaths[name];
    if (!originalPath) return;

    if (!sfxInstances[name]) {
        sfxInstances[name] = new Audio(getCachedUrl(originalPath));
        sfxInstances[name].volume = 0.5;
    }
    sfxInstances[name].currentTime = 0;
    sfxInstances[name].play().catch(() => {});
}


/**
 * 核心對話系統 (Chapter 3 專用版)
 */
function startDialogue(linesArray, callback = null) {
    currentDialogueQueue = [...linesArray];
    dialogueCallback = callback;
    isDialogueActive = true;
    
    const overlay = document.getElementById('dialogue-overlay');
    const nameEl = document.getElementById('dialogue-name');
    
    nameEl.innerText = "綿羊使者";
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex'; 

    // 重新綁定點擊事件，避免抓到舊章節的邏輯
    overlay.onclick = advanceDialogue;
    
    advanceDialogue();
}

function playKnockSound() {
    playSFX('knock');
}

function advanceDialogue(event) {
    playSFX('dialogue_click');
    if (event) event.stopPropagation();

    const textEl = document.getElementById('dialogue-text');
    const overlay = document.getElementById('dialogue-overlay');
    const nameEl = document.getElementById('dialogue-name');
    const boxEl = document.getElementById('dialogue-box');
    const portraitImg = document.getElementById('sheep-messenger-img');

    if (currentDialogueQueue.length > 0) {
        const nextLine = currentDialogueQueue.shift();
        
        // 1. 重置所有特殊模式
        overlay.classList.remove('warning-mode', 'hero-mode');
        boxEl.classList.remove('glitch-shake');
        if (portraitImg) portraitImg.src = "assets/images/sheep_messenger.png";

        // 2. 判斷角色標籤
        if (nextLine.startsWith("勇者:")) {
            overlay.classList.add('hero-mode'); 
            nameEl.innerText = "26歲的勇者";
            textEl.innerText = nextLine.replace("勇者:", "");
            if (portraitImg) portraitImg.src = "assets/images/hero_26.png"; 
        } else if (nextLine.startsWith("???:")){
            overlay.classList.add('hero-mode'); 
            nameEl.innerText = "???";
            textEl.innerText = nextLine.replace("???:", "");
            if (portraitImg) portraitImg.src = "assets/images/hero_26.png";
        } else if (nextLine.startsWith("系統:")) {
            nameEl.innerText = "系統";
            textEl.innerText = nextLine.replace("系統:", "");
        } else {
            nameEl.innerText = "綿羊使者";
            textEl.innerText = nextLine.startsWith("綿羊使者:") ? nextLine.replace("綿羊使者:", "") : nextLine;
        }
    } else {
        // 對話結束
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
        overlay.onclick = null;
        isDialogueActive = false;

        if (dialogueCallback) {
            const action = dialogueCallback;
            dialogueCallback = null;
            action();
        }
    }
}

let doorClicks = 0;

export const Chapter3 = {
    init: () => {
        console.log("🚀 Chapter 3 正式啟動");
        
        // 1. 存檔進度 3.0
        const gameState = SaveSystem.load();
        battleState.playerDeck = [...gameState.skills];
        gameState.chapter = 3.0;
        SaveSystem.save(gameState);

        // 2. 隱藏之前的 2.5 螢幕
        const illusionScreen = document.getElementById('illusion-gates-screen');
        if (illusionScreen) illusionScreen.classList.add('hidden');

        // 3. 顯示最終之門場景
        const finalScreen = document.getElementById('final-gate-screen');
        finalScreen.classList.remove('hidden');
        finalScreen.classList.add('final-gate-bg'); 

        // 4. 變換 BGM
        AudioManager.stopBGM();
        AudioManager.playBGM(getCachedUrl('assets/audio/Candle in the Corridor.mp3'));

        // 5. 確保對話框是乾淨的
        document.getElementById('dialogue-overlay').classList.add('hidden');

        // 6. 啟動開場對話
        startChapter3Dialogue();
    }
};

function startChapter3Dialogue() {
    startDialogue([
        "綿羊使者: 這扇門之後應該就是這整魔術帽空間的最深處。",
        "綿羊使者: 你說我怎麼知道的？",
        "綿羊使者: 原來你一直都感受不出來，一路上每當我們前進，就越有一種強大阻力推著我們嗎？",
        "綿羊使者: 而這扇門有著最濃厚的阻力？",
        "綿羊使者: .....",
        "綿羊使者: 好吧，看來這種魔力探查能力，凡人並沒有呢。",
        "綿羊使者: 原來阿斯拉漢心法真的失傳了嗎？",
        "綿羊使者: 這個世界上只剩下我流傳著路易德大人的偉大技能了。",
        "綿羊使者: 總之，繼續往前進吧！"
    ], () => {
        initUltimateDoor();
    });
}

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

function initUltimateDoor() {
    const door = document.getElementById('the-ultimate-door');
    const screen = document.getElementById('final-gate-screen');
    
    // 建立或抓取次數顯示器
    let counterDisplay = document.getElementById('click-counter-display');
    if (!counterDisplay) {
        counterDisplay = document.createElement('div');
        counterDisplay.id = "click-counter-display";
        screen.appendChild(counterDisplay);
    }
    counterDisplay.style.display = "block";
    counterDisplay.innerText = "0";

    door.onclick = () => {
        doorClicks++;
        counterDisplay.innerText = doorClicks;
        playKnockSound();

        // 加入動態放大縮小效果
        counterDisplay.classList.remove('count-bump');
        void counterDisplay.offsetWidth; // 強制重繪動畫
        counterDisplay.classList.add('count-bump');

        // 2. 門的震動效果 (保持，讓玩家知道有在點擊)
        door.classList.add('shake-effect');
        setTimeout(() => door.classList.remove('shake-effect'), 100);

        if (doorClicks === 1) {
            showToast("???: 「離我遠一點，不要再靠近了!」");
            playSFX('pickup');
        } else if (doorClicks === 10) {
            showToast("???: 「你這個老頑固，快點離開!!」");
            playSFX('pickup');
        } else if (doorClicks === 50) {
            showToast("???: 「不要再靠近了，我是不會妥協的!!!」");
            playSFX('pickup');
        } else if (doorClicks === 100) {
            door.onclick = null; 
            counterDisplay.style.display = "none";      
            setTimeout(revealTheBoss, 10);    
            playSFX('land');
            screen.classList.add('shake-effect');

            const flash = document.getElementById('transition-white');
            if (flash) {
                flash.classList.remove('hidden');
                flash.style.opacity = 0.5;
            }

            setTimeout(() => {
                if (flash) flash.style.opacity = 0;
                setTimeout(() => { if (flash) flash.classList.add('hidden'); }, 1000);
                
                screen.classList.remove('shake-effect');
                revealTheBoss();    
            }, 1000); 
        }
    };
}

function revealTheBoss() {
    const door = document.getElementById('the-ultimate-door');
    // const bossContainer = document.getElementById('boss-container');

    door.classList.add('hidden');
    
    // bossContainer.classList.remove('hidden');

    startDialogue([
        "???: 阿阿阿阿! 可惡。",
        "???: 你一臉疑惑做什麼？臉盲到連自己都不認得了？",
        "???: 對ㄟ，好像不意外。",
        "綿羊使者: (竊笑了一聲)"
    ], () => {
        
        startDialogue([
            "勇者: 嘎阿阿阿阿阿",
            "勇者: 我是不會順從命運的安排的，這就是我的概然性。",
            "勇者: 你不理解為什麼時間會暫停？",
            "勇者: 你在不知道為什麼要前進的情況下，居然還想阻止我？",
            "勇者: 既然如此，跟我一起待在這裡吧。",
            "勇者: 就讓一切停在最美好的現在，未知與恐懼也不會來臨。"
        ], () => {
            showFinalChoices();
        });
    });
}

function showFinalChoices() {
    const optionsEl = document.getElementById('dialogue-options');
    optionsEl.innerHTML = "";
    optionsEl.classList.remove('hidden');

    const choices = [
        { text: "我才不會成為像你這種膽小鬼！", type: "A" },
        { text: "如果待在這裡的話，你什麼打算？", type: "B" },
        { text: "只是這樣，很無聊ㄟ", type: "C" }
    ];

    choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = "menu-btn primary small";
        btn.innerText = c.text;
        btn.onclick = () => {
            optionsEl.classList.add('hidden');
            executeChoicePath(c.type);
        };
        optionsEl.appendChild(btn);
    });
}

function executeChoicePath(type) {
    let script = [];
    if (type === 'A') {
        script = [
            "勇者: 嘎阿阿阿阿！",
            "勇者: 看來跟你是沒辦法溝通的了。",
            "勇者: 不管如何，我是不會給你鑰匙的！",
            "系統: 那個鑰匙就是打開 27 歲之門的關鍵!",
            "勇者: 每當人們長大一歲時，都會進入時間維度。",
            "勇者: 前一歲的自己，會把記憶與願望寄託給下一歲的自己，並傳承歲月之門的鑰匙，讓自己可以回到現實宇宙的維度。",
            "勇者: 也許我這樣很膽小吧。",
            "勇者: 但我現在的願望，就是不要失去現在。",
            "勇者: 只要這樣，故事就不會結束，就會停在最好的現在。",
            "勇者: ......",
            "勇者: 我知道你在想什麼。",
            "勇者: 但我想要試試看，好奇這樣的行為，究竟會改變什麼。",
            "勇者: 不如我們玩個遊戲?",
            "勇者: 只要你成功擊敗我，我就給你鑰匙。",
        ];
    } else if (type === 'B') {
        script = [
            "勇者: 我不知道。其實我本來根本不知道你會甦醒。",
            "勇者: 每當人們長大一歲時，都會進入時間維度。",
            "勇者: 前一歲的自己，會把記憶與願望寄託給下一歲的自己，並傳承歲月之門的鑰匙，讓自己可以回到現實宇宙的維度。",
            "勇者: 我以為把你的鬧鐘關掉，你就不會起來了。",
            "勇者: 沒想到我卻觸發了時間維度的警告，告訴我這樣停留太久，會混亂現實宇宙維度的秩序。",
            "勇者: 嘿嘿。沒錯，所以你就被這個空間自動叫醒了。",
            "勇者: ......",
            "勇者: 我好像有點做過頭了，抱歉。",
            "勇者: 不過如果就這樣結束了，好像也有點無聊，要不要跟我玩一個遊戲?",
            "勇者: 只要你成功擊敗我，我就給你鑰匙。",
            "勇者: ......",
            "勇者: 就陪我玩一下嘛~",
        ];
    } else {
        script = [
            "勇者: 哈哈哈哈哈，不愧是我呢。",
            "勇者: 其實我想留下來，一部份原因也是因為有趣呢。",
            "勇者: 每當人們長大一歲時，都會進入時間維度。",
            "勇者: 前一歲的自己，會把記憶與願望寄託給下一歲的自己，並傳承歲月之門的鑰匙，讓自己可以回到現實宇宙的維度。",
            "勇者: 我以為把你的鬧鐘關掉，你就不會起來了。",
            "勇者: 沒想到我卻觸發了時間維度的警告，告訴我這樣停留太久，會混亂現實宇宙維度的秩序。",
            "勇者: 嘿嘿。沒錯，所以你就被這個空間自動叫醒了。",
            "勇者: ......",
            "勇者: 我好像有點做過頭了，抱歉。",
            "勇者: 不過如果就這樣結束了，好像也有點無聊，要不要跟我玩一個遊戲?",
            "勇者: 只要你成功擊敗我，我就給你鑰匙。",
            "勇者: ......",
            "勇者: 就陪我玩一下嘛~",
        ];
    }

    startDialogue(script, () => {
        startFinalBattle();
    });
}

let battleState = {
    playerHP: 100,
    bossHP: 100,
    isBossPhase2: false,
    playerDeck: [], 
    isPlayerTurn: true,
    damageReduction: null,
    extraTurn: false
};

export function startFinalBattle() {
    const screen = document.getElementById('battle-screen');
    const finalGateScreen = document.getElementById('final-gate-screen');
    
    finalGateScreen.classList.add('hidden');
    screen.classList.remove('hidden');

    AudioManager.stopBGM();
    AudioManager.playBGM('assets/audio/Battle Circuit.mp3');
    AudioManager.bgm.volume = 0.6;

    // 1. 初始化戰鬥數據 (從存檔中讀取獲得的技能)
    const gameState = SaveSystem.load();
    battleState.playerDeck = [...gameState.skills]; // 複製一份技能，因為使用後會消失
    battleState.playerHP = 100;
    battleState.bossHP = 100;
    battleState.isBossPhase2 = false;

    // 2. 顯示規則視窗
    const rulesModal = document.getElementById('battle-rules-modal');
    rulesModal.classList.remove('hidden');

    document.getElementById('btn-start-fight').onclick = () => {
        rulesModal.classList.add('hidden');
        updateBattleUI();
        writeBattleMessage("戰鬥開始！請選擇你的行動。");
        bindBattleEvents();
    };
}

// 綁定對戰事件
function bindBattleEvents() {
    // 開啟卡牌背包
    document.getElementById('btn-open-deck').onclick = () => {
        if (!battleState.isPlayerTurn) return;
        openBattleDeck();
    };

    // 關閉背包
    document.getElementById('btn-close-deck').onclick = () => {
        document.getElementById('battle-deck-overlay').classList.add('hidden');
    };

    // 抽卡按鈕 (汲取勇氣)
    document.getElementById('btn-draw-card').onclick = () => {
        if (!battleState.isPlayerTurn) return;
        performDrawCard();
    };
}

// 渲染戰鬥背包
function openBattleDeck() {
    const overlay = document.getElementById('battle-deck-overlay');
    const listLeft = document.getElementById('deck-list-left');
    const listRight = document.getElementById('deck-list-right');
    
    if (!listLeft || !listRight) return; // 安全檢查

    listLeft.innerHTML = "";
    listRight.innerHTML = "";
    overlay.classList.remove('hidden');

    battleState.playerDeck.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = "card-item-in-book";
        cardEl.innerHTML = `<h4>${card.skill}</h4><p>${card.effect || ""}</p>`;
        
        cardEl.onclick = () => {
            overlay.classList.add('hidden');
            useCard(index);
        };
        
        // 簡單分配左右頁
        if (index % 2 === 0) listLeft.appendChild(cardEl);
        else listRight.appendChild(cardEl);
    });

    if (battleState.playerDeck.length === 0) {
        listLeft.innerHTML = "<p style='color:#666;'>手牌已空。點擊「命運的勇氣」來獲得新的力量吧！</p>";
    }
}

// 更新畫面數值
function updateBattleUI() {
    const bossHPBar = document.getElementById('boss-hp-bar');
    const playerHPBar = document.getElementById('player-hp-bar');
    
    bossHPBar.style.width = `${battleState.bossHP}%`;
    playerHPBar.style.width = `${battleState.playerHP}%`;
    
    document.getElementById('boss-hp-text').innerText = `${Math.ceil(battleState.bossHP)} / 100`;
    document.getElementById('player-hp-text').innerText = `${Math.ceil(battleState.playerHP)} / 100`;
}

function writeBattleMessage(msg) {
    document.getElementById('battle-message-box').innerText = msg;
}

let isDodgeActive = false; // 紀錄玩家是否有「避開攻擊」的效果

const baseMemories = [
    { text: "雖然總是會說著為什麼我是活動長?但成為活動長的期間，真的很令人開心。", skill: "慧眼識英雄" },
    { text: "沒想到你是上個世紀的人，是令人尊敬的老人家呢。", skill: "敬老尊賢" },
    { text: "會算塔羅牌的化學魔法師，引導凡事之路，解決人們心中所困。", skill: "讓我為你解惑吧" },
    { text: "總是在重要時刻，第一時間出現，是個負責任的人呢。", skill: "優秀領袖" },
    { text: "心思細膩，總是為夥伴們著想，這次，也請多為自己想一點。", skill: "多愛自己一點" },
    { text: "可以看見普通人看不見的世界與事物，更深刻的感受世間萬物的一切。", skill: "I see you"},
    { text: "是個聊天會停不下來的人，也因為這樣的交流，我也更加體會，如何分享故事。", skill: "傳說故事" },
    { text: "擁有非常多厲害的裝備，結合多元的技能，總是能提供意想不到的幫助。", skill: "無敵百寶袋" },
    { text: "有非常專業的能力與知識，總能有效解決許多問題。", skill: "沒什麼解決不了的"},
    { text: "擁有無比堅強的意志力與耐心，儘管身處困難，也不輕易放棄。", skill: "歡樂勇者的精神" },
    { text: "捕捉世間美景的攝影大師，總在幕後默默做事。", skill: "幕後 Photo 手" }
];

// --- 技能效果字典 ---
const SKILL_EFFECTS = {
    "死而復生": () => { healPlayer(50); return "我才不會這麼容易倒下! 恢復 50 滴血量。"; },
    "慧眼識英雄": () => { isDodgeActive = true; return "準備好躲避本回合的攻擊！"; },
    "敬老尊賢": () => { battleState.damageReduction = 0.5; return "感受到歲月的重量，受到的傷害減半。"; },
    "讓我為你解惑吧": () => { dealDamageToBoss(15); return "釋放化學反應！造成 15 點傷害。"; },
    "優秀領袖": () => { battleState.extraTurn = true; return "領袖氣場爆發！本回合可連續行動。"; },
    "多愛自己一點": () => { healPlayer(10); return "稍作休息，恢復了 10 點 HP。"; },
    "I see you": () => { isDodgeActive = true; return "你看穿了對方的下一步，躲避本回合的攻擊。"; },
    "傳說故事": () => { dealDamageToBoss(5); healPlayer(5); return "故事既可以是力量，也可以成長，造成 5 傷並恢復 5 血。"; },
    "無敵百寶袋": () => { drawRandomCards(2); return "翻箱倒櫃，隨機獲得了兩項特質！"; },
    "沒什麼解決不了的": () => { dealDamageToBoss(10); return "專業的一擊！造成 10 點傷害。"; },
    "歡樂勇者的精神": () => { isDodgeActive = true; return "保持樂觀！成功閃避下一擊。"; },
    "幕後 Photo 手": () => { battleState.damageReduction = 0.5; return "隱身於幕後，傷害減半。"; },
    "12號出口": () => { dealDamageToBoss(15); return "爆發性的力量！造成 15 點傷害。"; },
    "True or False": () => { isDodgeActive = true; return "識破虛假！躲避本回合的攻擊。"; },
    "帽子戲法": () => { battleState.extraTurn = true; return "混亂視覺！獲得額外一次出牌機會。"; }
};

const BATTLE_EXTRA_SKILLS = [
    { skill: "這是最後的夢", effect: "造成 12 點傷害", power: 12, type: 'atk' },
    { skill: "恐龍才不會輕易滅絕!", effect: "恢復 20 點 HP", power: 20, type: 'heal' },
    { skill: "鋼鐵劍帝", effect: "下回合受傷減半", type: 'def' },
    { skill: "尋找有你的結局", effect: "獲得額外回合", type: 'extra' },
    { skill: "我才不是鵝!", effect: "造成 8 點傷害", power: 8, type: 'atk' },
    { skill: "今天是個適合散步的日子", effect: "恢復 15 點 HP", power: 15, type: 'heal' },
    { skill: "我要突破這道高牆", effect: "造成 25 點傷害", power: 25, type: 'atk' },
    { skill: "爆破!", effect: "造成 15 點傷害", power: 15, type: 'atk' },
    { skill: "請冷靜", effect: "恢復 10 點 HP", power: 10, type: 'heal' },
    { skill: "就說了禁止抱歉", effect: "造成 10 點傷害", power: 10, type: 'atk' },
    { skill: "逃跑一下", effect: "閃避攻擊", type: 'dodge' },
    { skill: "人生總要來點驚喜", effect: "隨機造成 1~40 點傷害", type: 'random_atk' },
    { skill: "魔王大豐收!!!", effect: "恢復 30 點 HP", power: 30, type: 'heal' },
    { skill: "該招募新伙伴了呢", effect: "隨機獲得 3 張新卡牌", type: 'draw_3' },
    { skill: "是時候應該說聲再見了", effect: "造成 30 點傷害", power: 30, type: 'atk' },
    { skill: "我們可真有默契", effect: "與對手交換 HP (若我方較低)", type: 'swap' },
    { skill: "和你一起分擔", effect: "受傷減半", type: 'def' },
    { skill: "就跟桃花一樣", effect: "隨機獲得 3 張新卡牌", type: 'draw_3' },
    { skill: "這是舍長的命令", effect: "強制對手跳過一回合", type: 'stun' },
    { skill: "27歲的勇氣", effect: "造成 27 點傷害", power: 27, type: 'atk' },
    { skill: "Doctor 的厲害之處", effect: "造成 20 點傷害", power: 20, type: 'atk' },
    { skill: "要不要算個塔羅?", effect: "恢復 10 點 HP", power: 10, type: 'heal' },
    { skill: "我好像迷路了", effect: "造成 10 點傷害", power: 10, type: 'atk' },
    { skill: "化學的盡頭是玄學", effect: "造成 25 點傷害", power: 25, type: 'atk' },
];

BATTLE_EXTRA_SKILLS.forEach(s => {
    SKILL_EFFECTS[s.skill] = () => {
        if (s.type === 'atk') { dealDamageToBoss(s.power); return `造成 ${s.power} 點傷害。`; }
        if (s.type === 'heal') { healPlayer(s.power); return `恢復 ${s.power} 點 HP。`; }
        if (s.type === 'def') { battleState.damageReduction = 0.5; return `下回合受傷減半。`; }
        if (s.type === 'extra') { battleState.extraTurn = true; return `獲得額外回合。`; }
        if (s.type === 'dodge') { isDodgeActive = true; return `準備閃避攻擊。`; }
        if (s.type === 'stun') { battleState.extraTurn = true; return `對手陷入混亂，你多了一回合！`; } // 效果等同 extra
        if (s.type === 'draw_3') { drawRandomCards(3); return `抽了 3 張牌！`; }
        if (s.type === 'random_atk') { 
            let d = Math.floor(Math.random() * 40) + 1; 
            dealDamageToBoss(d); return `造成 ${d} 點傷害！`; 
        }
        if (s.type === 'swap') {
            if (battleState.playerHP < battleState.bossHP) {
                let temp = battleState.playerHP;
                battleState.playerHP = battleState.bossHP;
                battleState.bossHP = temp;
                return `觸發逆轉！雙方 HP 交換！`;
            } return `血量比對方高，換了不划算，就當什麼都沒發生吧。`;
        }
        return "釋放了特質。";
    };
});

const DRAW_POOL = [...baseMemories, ...BATTLE_EXTRA_SKILLS];

async function useCard(index) {
    if (!battleState.isPlayerTurn) return;
    battleState.isPlayerTurn = false;
    
    const card = battleState.playerDeck[index];
    const effectFunc = SKILL_EFFECTS[card.skill];

    playSFX('craft');
    
    // 1. 執行效果
    let msg = effectFunc ? effectFunc() : "發動了奇妙的力量！";
    writeBattleMessage(`你釋放了：【${card.skill}】\n${msg}`);
    await new Promise(r => setTimeout(r, 1000));
    
    // 2. 消耗卡牌
    battleState.playerDeck.splice(index, 1);
    updateBattleUI();
    
    // 3. 檢查 Boss 是否進入二階段或死亡
    if (await checkBossStatus()) return; 

    // 4. 切換回合 (除非有額外回合)
    if (battleState.extraTurn) {
        battleState.extraTurn = false;
        writeBattleMessage("【額外回合】請繼續行動！");
        await new Promise(r => setTimeout(r, 1000));
        battleState.isPlayerTurn = true; 
    } else {
        battleState.isPlayerTurn = false;
        setTimeout(bossTurn, 1500);
    }
}

// --- 敵人行動 AI ---
async function bossTurn() {
    // 敵人回合開始
    writeBattleMessage("26歲的勇者正在準備進行攻擊...");
    await new Promise(r => setTimeout(r, 1000));

    if (isDodgeActive) {
        writeBattleMessage("你優雅地閃避了對方的攻擊！");
        isDodgeActive = false;
        playSFX('walk'); // 閃避音效
        await new Promise(r => setTimeout(r, 1000));
    } else {
        // ★ 3. 敵人攻擊動畫與音效
        triggerBossAttackAnim();

        // 傷害計算
        let baseDmg = battleState.isBossPhase2 ? (Math.random() * 10 + 10) : (Math.random() * 10 + 3);
        
        if (battleState.damageReduction) {
            baseDmg *= battleState.damageReduction;
            battleState.damageReduction = null; 
            writeBattleMessage("裝備的特質減輕了傷害！");
        }

        const finalDmg = Math.ceil(baseDmg);
        // ★ 確保扣的是 battleState 的血
        battleState.playerHP = Math.max(0, battleState.playerHP - finalDmg);
        
        writeBattleMessage(`對方發動了攻擊！造成 ${finalDmg} 點傷害。`);
        
        // 等待動畫播放再閃紅
        setTimeout(() => {
            playSFX('playerHit');
            showDamageEffect(finalDmg); 
            updateBattleUI(); // ★ 確保 UI 更新
        }, 1000);
    }

    // 等待文字顯示
    await new Promise(r => setTimeout(r, 300));

    // ★ 檢查玩家是否死亡
    if (battleState.playerHP <= 0) {
        handlePlayerDefeat();
    } else {
        // 回到玩家回合
        battleState.isPlayerTurn = true;
        writeBattleMessage("輪到你的回合，請選擇行動。");
    }
}

// --- 檢查 Boss 狀態 (二階段變身) ---
async function checkBossStatus() {
    if (battleState.bossHP <= 10 && !battleState.isBossPhase2) {
        battleState.isBossPhase2 = true;
        battleState.isPlayerTurn = false; // 強制中斷玩家回合
        
        startDialogue([
            "勇者: 嘎阿阿阿阿",
            "勇者: 你以為我會這麼容易就認輸嗎!",
            "勇者: 拚盡你的全力跟我戰鬥吧!",
            "綿羊使者: 不要害怕，我跟你在這裡!",
            "綿羊使者: 我們一路上收集的這些特質，不就是為了這一刻嗎？",
            "綿羊使者: 我們一起前進吧!",
            "系統: (敵人進入了覺醒狀態，攻擊力大幅提升，HP 已完全回復！)"
        ], () => {
            battleState.bossHP = 100; 
            updateBattleUI();
            battleState.isPlayerTurn = true;
            bossTurn(); 
        });
        return true;
    }
    
    if (battleState.bossHP <= 0) {
        handleVictory();
        return true;
    }
    return false;
}

// --- 隱藏規則：壽星的祝福 (抽卡) ---
function performDrawCard() {
    if (!battleState.isPlayerTurn) return; 
    battleState.isPlayerTurn = false;

    if (battleState.playerDeck.length === 0) {
        startDialogue(["綿羊使者: 哎呀... 你的勇氣用光了嗎？", "綿羊使者: 別忘了，今天可是你的大日子，所有人都在看著你呢！", "系統: 觸發【壽星的祝福】，隨機獲得了 10 項特質！"], () => {
            drawRandomCards(10);
            playSFX('pickup');
            battleState.isPlayerTurn = true;
        });
    } else {
        writeBattleMessage("鼯鼠最多的就是技能，來呼喚你的星痕吧!");
        drawRandomCards(1);
        playSFX('pickup');
        setTimeout(bossTurn, 1500);
    }
}

function handlePlayerDefeat() {
    battleState.isPlayerTurn = false; // 鎖定操作
    
    // 播放史詩般的逆轉對話
    startDialogue([
        "綿羊使者: 勇者，別忘了這是誰的故事！",
        "綿羊使者: 你所經歷的每一秒，都在為現在提供動力！",
        "系統: 偵測到強大的能量... 觸發隱藏規則：【主角光環】！",
        "系統: 勇者 滿血回歸！"
    ], () => {
        // 視覺特效：全螢幕白閃
        const flash = document.getElementById('transition-white');
        flash.classList.remove('hidden');
        flash.style.opacity = 1;
        
        setTimeout(() => {
            battleState.playerHP = 100; // ★ 滿血回歸
            updateBattleUI();
            flash.style.opacity = 0;
            setTimeout(() => flash.classList.add('hidden'), 1000);
            
            writeBattleMessage("你感受到了前所未有的力量！輪到你了。");
            battleState.isPlayerTurn = true;
        }, 1000);
    });
}

function drawRandomCards(count) {
    for (let i = 0; i < count; i++) {
        // ★ 關鍵：只從 BATTLE_EXTRA_SKILLS 隨機抽取
        const randomSkill = BATTLE_EXTRA_SKILLS[Math.floor(Math.random() * BATTLE_EXTRA_SKILLS.length)];
        
        // 放入玩家手牌
        battleState.playerDeck.push({
            skill: randomSkill.skill,
            text: randomSkill.effect || "這是你在冒險中覺醒的戰鬥直覺。",
            effect: randomSkill.effect
        });
    }
    updateBattleUI();
    showToast(`獲得了 ${count} 項特質！`);
}

function dealDamageToBoss(amount) {
    battleState.bossHP = Math.max(0, battleState.bossHP - amount);
    // 這裡可以加怪物受傷動畫
    const bossImg = document.getElementById('battle-boss-img');
    bossImg.classList.add('shake-effect');
    setTimeout(() => bossImg.classList.remove('shake-effect'), 400);
}

function healPlayer(amount) {
    battleState.playerHP = Math.min(100, battleState.playerHP + amount);
    showHealEffect(); // 綠光閃爍
}

function triggerBossAttackAnim() {
    const bossImg = document.getElementById('battle-boss-img');
    if (!bossImg) return;
    
    // 播放揮擊音效
    playSFX('hit');

    // 往前衝 (因為 Boss 在右上，玩家在左下，所以往左下衝)
    bossImg.style.transition = "transform 0.1s ease-in";
    bossImg.style.transform = "translate(-50px, 50px) scale(1.1)";
    
    // 退回原位
    setTimeout(() => {
        bossImg.style.transition = "transform 0.3s ease-out";
        bossImg.style.transform = "translate(0, 0) scale(1)";
    }, 150);
}

/**
 * 戰鬥專用的受傷特效 (畫面閃紅 + 跳字)
 * @param {number} amount 傷害值
 */
function showDamageEffect(amount) {
    const screen = document.getElementById('battle-screen');
    
    // 1. 畫面閃紅 (利用 CSS 已經寫好的 hit-flash 類別)
    screen.classList.add('hit-flash');
    setTimeout(() => screen.classList.remove('hit-flash'), 200);

    // 2. 傷害跳字特效
    if (amount > 0) {
        const damageTxt = document.createElement('div');
        damageTxt.className = 'damage-text'; // 複用 style.css 裡定義的樣式
        damageTxt.innerText = `-${amount} HP`;
        
        // 放在玩家狀態列的附近 (左下方)
        damageTxt.style.position = 'fixed';
        damageTxt.style.left = '20%';
        damageTxt.style.bottom = '40%';
        damageTxt.style.zIndex = '10000';
        
        document.body.appendChild(damageTxt);
        
        // 1 秒後移除文字元素
        setTimeout(() => damageTxt.remove(), 1000);
    }
}

// 順便補上回復 HP 的綠光特效，因為你可能也會用到
function showHealEffect() {
    const screen = document.getElementById('battle-screen');
    screen.classList.add('heal-flash');
    setTimeout(() => screen.classList.remove('heal-flash'), 300);
}

function handleVictory() {
    // 1. 停止戰鬥與音樂
    battleState.isPlayerTurn = false;
    AudioManager.stopBGM();
    
    // 讓 Boss 圖片產生消散效果
    const bossImg = document.getElementById('battle-boss-img');
    if (bossImg) {
        bossImg.style.transition = "opacity 2s, filter 2s";
        bossImg.style.opacity = 0;
        bossImg.style.filter = "blur(10px) brightness(2)";
    }

    // 2. 延遲一下後開始勝利對話
    setTimeout(() => {
        startDialogue([
            "勇者: 嘎阿阿阿阿阿!",
            "勇者: 果然能擊敗自己的，只有自己。",
            "勇者: 是你贏了，遵守承諾，鑰匙給你。"
        ], () => {
            
            // 播放獲得鑰匙音效與提示
            playSFX('pickup');
            showToast("獲得【時鐘雕刻的鑰匙】");

            // 繼續對話
            setTimeout(() => {
                startDialogue([
                    "勇者: 27歲的劉祐豪。",
                    "勇者: 請你一定要過得開心。"
                ], () => {
                    // ★ 對話結束，白光轉場
                    triggerEndingTransition();
                });
            }, 1000);

        });
    }, 2000);
}

async function triggerEndingTransition() {
    const flash = document.getElementById('transition-white');
    flash.classList.remove('hidden');
    flash.style.opacity = 1;

    await new Promise(r => setTimeout(r, 1500));

    document.getElementById('battle-screen').classList.add('hidden');
    const victoryScreen = document.getElementById('victory-screen');
    victoryScreen.classList.remove('hidden');
    
    const victoryBg = document.getElementById('victory-final-bg');
    victoryBg.style.opacity = 1;

    AudioManager.playBGM(getCachedUrl('assets/audio/victory_theme.mp3'));

    // 白光淡出
    flash.style.opacity = 0;
    setTimeout(() => flash.classList.add('hidden'), 1000);

    // 3. 系統的最後對話
    setTimeout(() => {
        startDialogue([
            "系統: 勇者，這一路辛苦你了。",
            "系統: 時間會繼續運轉，你的故事也會繼續譜寫。",
            "系統: 現在，你該繼續前進了。",
            "系統: 打開門吧!"
        ], () => {
            // 允許玩家點擊畫面或門
            const hint = document.getElementById('victory-hint');
            hint.classList.remove('hidden');
            
            // 點擊整個螢幕或門都可以觸發結局
            document.getElementById('victory-screen').onclick = playEndingCredits;
        });
    }, 1500);
}

async function playEndingCredits() {
    AudioManager.stopBGM();
    // 移除點擊事件防止連點
    document.getElementById('victory-screen').onclick = null;

    const creditsOverlay = document.getElementById('ending-credits-overlay');
    creditsOverlay.classList.remove('hidden');

    // 2. 播放生日語音
    const audio = document.getElementById('birthday-audio');
    audio.play().catch(e => console.log("語音播放需要互動:", e));

    // 文字淡入
    const text = document.getElementById('ending-text');
    setTimeout(() => { text.style.opacity = 1; }, 1000);

    // 3. 監聽語音播放結束
    audio.onended = () => {
        text.style.opacity = 0;
        
        setTimeout(() => {
            // ★ 修改存檔：標記遊戲已全破 (解鎖彩蛋區)
            const gameState = SaveSystem.load();
            if (!gameState.flags) gameState.flags = {};
            gameState.flags.gameCompleted = true; 
            SaveSystem.save(gameState);
            location.reload(); 
        }, 2000);
    };
}