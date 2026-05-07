import { SaveSystem } from './saveSystem.js';
import { AudioManager } from './audioManager.js';
import { Prologue } from './chapters/prologue.js';
import { Chapter1 } from './chapters/chapter1.js';
import { Chapter2 } from './chapters/chapter2.js';
import { Chapter3 } from './chapters/chapter3.js';
import { Collection } from './collection.js';
import { CORE_ASSETS, CHAPTER1_ASSETS, CHAPTER2_ASSETS, CHAPTER3_ASSETS } from './assetsConfig.js';

const startOverlay = document.getElementById('start-overlay');
const mainMenu = document.getElementById('main-menu');
const btnStart = document.getElementById('btn-start');
const btnLoad = document.getElementById('btn-load');
const btnDeleteSave = document.getElementById('btn-delete-save');
const btnCollection = document.getElementById('btn-collection');
const modal = document.getElementById('confirm-modal');
const btnYes = document.getElementById('btn-confirm-yes');
const btnNo = document.getElementById('btn-confirm-no');
const btnCredits = document.getElementById('btn-credits');
const btnCreditsClose = document.getElementById('btn-credits-close');
const creditsModal = document.getElementById('credits-modal');

async function preloadGlobalAssets() {
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-progress-bar');
    const progressText = document.getElementById('loading-text');
    const detailText = document.getElementById('loading-detail');

    // 我們決定在首頁先載入 CORE 和 Chapter 1 的資源
    // 把想預先載入的陣列合併
    const allImages = [...CORE_ASSETS.images, ...CHAPTER1_ASSETS.images, ...CHAPTER2_ASSETS.images, ...CHAPTER3_ASSETS.images];
    const allAudio = [...CORE_ASSETS.audio, ...CHAPTER1_ASSETS.audio, ...CHAPTER2_ASSETS.audio, ...CHAPTER3_ASSETS.audio];
    
    const totalAssets = allImages.length + allAudio.length;
    let loadedCount = 0;

    // 更新進度條的輔助函式
    const updateProgress = (src) => {
        loadedCount++;
        const percent = Math.floor((loadedCount / totalAssets) * 100);
        progressBar.style.width = `${percent}%`;
        progressText.innerText = `喚醒世界中... ${percent}%`;
        
        // 只顯示檔名，不顯示長長的路徑
        const fileName = src.split('/').pop();
        detailText.innerText = `正在讀取: ${fileName}`;
    };

    // 建立所有圖片的載入 Promise
    const imagePromises = allImages.map(src => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => { updateProgress(src); resolve(); };
            img.onerror = () => { console.warn(`圖片缺失: ${src}`); updateProgress(src); resolve(); };
        });
    });

    // 建立所有音訊的載入 Promise
    // 注意：這裡只載入(load)，不播放(play)
    const audioPromises = allAudio.map(src => {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.src = src;
            // canplaythrough 代表瀏覽器估計可以不卡頓地播完這首歌
            audio.oncanplaythrough = () => { updateProgress(src); resolve(); };
            audio.onerror = () => { console.warn(`音訊缺失: ${src}`); updateProgress(src); resolve(); };
            
            // 加入超時保護 (如果網路太慢，等 3 秒就不等了直接通過)
            setTimeout(resolve, 3000); 
            
            audio.load(); // 強制觸發下載
        });
    });

    // ★ 等待所有 Promise 完成
    await Promise.all([...imagePromises, ...audioPromises]);

    console.log("✅ 核心資源載入完畢！");
    
    // 延遲一下讓玩家看見 100%
    await new Promise(r => setTimeout(r, 800));

    // 隱藏載入畫面
    loadingScreen.style.opacity = 0;
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        // 顯示「點擊任意鍵開始遊戲」的遮罩
        document.getElementById('start-overlay').classList.remove('hidden');
    }, 1000);
}

let currentScene = 'menu';

async function init() {
    console.log("🚀 遊戲系統啟動...");
    document.getElementById('start-overlay').classList.add('hidden');

    await preloadGlobalAssets();

    updateButtonVisibility();

    startOverlay.addEventListener('click', () => {
        startOverlay.classList.add('fade-out');
        checkAndPlayMusic();
    }, { once: true });

    btnStart.addEventListener('click', handleNewGameClick);
    btnLoad.addEventListener('click', loadGame);

    btnDeleteSave.addEventListener('click', () => {
        if(confirm("確定要刪除所有進度嗎？這操作無法復原！")) {
            SaveSystem.clear(); 
            alert("存檔已刪除。");
            updateButtonVisibility(); 
            location.reload(); 
        }
    });

    btnYes.addEventListener('click', startPrologue);
    btnNo.addEventListener('click', closeModal);

    btnCredits.addEventListener('click', () => {
        creditsModal.classList.remove('hidden');
    });
    btnCreditsClose.addEventListener('click', () => {
        creditsModal.classList.add('hidden');
    });

    if (btnCollection) {
        btnCollection.onclick = Collection.open;
    }

}

function checkAndPlayMusic() {
    if (currentScene === 'menu') {
        console.log("🎵 檢查音樂狀態: Menu");
        AudioManager.playBGM('assets/audio/Goddess of time.mp3');
    }
}

function updateButtonVisibility() {
    const hasSave = SaveSystem.hasSave();
    
    if (hasSave) {
        btnLoad.style.display = 'block';
        btnDeleteSave.style.display = 'block'; 
        
        const saveData = SaveSystem.load();
        if (saveData && saveData.flags && saveData.flags.gameCompleted) {
            btnCollection.style.display = 'block';
        }

        if (hasSave.flags && hasSave.flags.gameCompleted) {
            const btnCollection = document.getElementById('btn-collection');
            if (btnCollection) btnCollection.style.display = 'block';
        }
    } else {
        btnLoad.style.display = 'none';
        btnDeleteSave.style.display = 'none';
        const btnCollection = document.getElementById('btn-collection');
        if (btnCollection) btnCollection.style.display = 'none';
    }
}

function handleNewGameClick() {
    if (SaveSystem.hasSave()) {
        modal.classList.remove('hidden');
    } else {
        startPrologue();
    }
}

function closeModal() {
    modal.classList.add('hidden');
}

async function startPrologue() {
    modal.classList.add('hidden');

    console.log("🎬 初始化新存檔，進入序章...");
    
    const newGameState = {
        playerName: "勇者",
        chapter: 0,
        playerStats: { hp: 100, hunger: 100, maxHunger: 100 },
        inventory: { 
            wood: 0, stone: 0, emerald: 0, food: 0,
            plank: 0, stick: 0, // 新增素材
            wood_pickaxe: 0, stone_pickaxe: 0, // 新增工具
            wood_sword: 0, stone_sword: 0,
            tools: { axe: false, pickaxe: false }
        },
        skills: [],
        flags: { gameCompleted: false }
    };

    // 儲存初始狀態 (覆蓋舊檔)
    SaveSystem.save(newGameState);
    AudioManager.stopBGM();

    mainMenu.style.display = 'none';

    await Prologue.play();
}

function loadGame() {
    const data = SaveSystem.load();
    
    if (data) {
        console.log(`📂 讀取成功！準備進入章節: ${data.chapter}`);
        
        // 隱藏主選單
        const mainMenu = document.getElementById('main-menu');
        mainMenu.style.display = 'none';

        // 停止主選單音樂
        AudioManager.stopBGM();

        // 根據章節跳轉
        switch (data.chapter) {
            case 0:
                startPrologue(); 
                break;
            case 1:
                // 進入第一章
                Chapter1.init();
                break;
            case 1.5:
                // ★ 讀取 Chapter 1.5 直接開啟樓梯間
                import('./chapters/staircase.js').then(m => m.Staircase.start());
                break;   
            case 2:
                Chapter2.init(); 
                break;
            case 2.5:
                import('./chapters/chapter2.js').then(m => m.Chapter2.resumeAtGates());
                break;
            case 3:
                Chapter3.init();
                break;
            default:
                console.error("未知的章節編號:", data.chapter);
                alert("存檔毀損或章節不存在，請重新開始。");
                break;
        }
    } else {
        alert("找不到存檔！");
    }
}

window.onload = init;