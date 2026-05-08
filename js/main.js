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

    // 1. 收集所有資源，並使用 Set() 來「自動去除重複的檔案」
    const allImages = [...new Set([
        ...(CORE_ASSETS.images || []), 
        ...(CHAPTER1_ASSETS.images || []), 
        ...(CHAPTER2_ASSETS.images || []), 
        ...(CHAPTER3_ASSETS.images || [])
    ])];
    
    const allAudio = [...new Set([
        ...(CORE_ASSETS.audio || []), 
        ...(CHAPTER1_ASSETS.audio || []), 
        ...(CHAPTER2_ASSETS.audio || []), 
        ...(CHAPTER3_ASSETS.audio || [])
    ])];
    
    const allVideos = [...new Set([
        ...(CORE_ASSETS.video || []), 
        ...(CHAPTER1_ASSETS.video || []), 
        ...(CHAPTER2_ASSETS.video || []), 
        ...(CHAPTER3_ASSETS.video || [])
    ])];
    
    const allAssets = [
        ...allImages.map(src => ({ src, type: 'image' })),
        ...allAudio.map(src => ({ src, type: 'audio' })),
        ...allVideos.map(src => ({ src, type: 'video' }))
    ];

    const totalAssets = allAssets.length;
    let loadedCount = 0;

    const updateProgress = (src) => {
        loadedCount++;
        const percent = Math.floor((loadedCount / totalAssets) * 100);
        progressBar.style.width = `${percent}%`;
        progressText.innerText = `喚醒世界中... ${percent}%`;
        detailText.innerText = `正在讀取: ${src.split('/').pop()}`;
    };

    // 2. 資源載入器 (極簡原生快取法)
    const loadAsset = (asset) => {
        return new Promise((resolve) => {
            if (asset.type === 'image') {
                const img = new Image();
                img.onload = () => { updateProgress(asset.src); resolve(); };
                img.onerror = () => { updateProgress(asset.src); resolve(); };
                img.src = asset.src;
            } 
            else if (asset.type === 'audio') {
                const audio = new Audio();
                audio.oncanplaythrough = () => { updateProgress(asset.src); resolve(); };
                audio.onerror = () => { updateProgress(asset.src); resolve(); };
                audio.src = asset.src;
                audio.load();
                setTimeout(resolve, 4000); // 4秒超時保護
            }
            else if (asset.type === 'video') {
                // 利用隱形的 video 標籤強迫瀏覽器下載影片到快取中
                const vid = document.createElement('video');
                vid.preload = 'auto'; // 要求瀏覽器預先下載
                vid.oncanplaythrough = () => { updateProgress(asset.src); resolve(); };
                vid.onerror = () => { updateProgress(asset.src); resolve(); };
                vid.src = asset.src;
                vid.load();
                setTimeout(resolve, 8000); // 影片較大，給 8 秒超時保護
            }
        });
    };

    // 3. 一次性平行發送所有請求 (移除分批機制)
    // 使用 allSettled 確保即便某個檔案壞了，遊戲依然能啟動
    await Promise.allSettled(allAssets.map(asset => loadAsset(asset)));

    console.log(`✅ 載入完畢！共載入 ${totalAssets} 個不重複檔案。`);
    
    await new Promise(r => setTimeout(r, 500));

    loadingScreen.style.opacity = 0;
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        document.getElementById('start-overlay').classList.remove('hidden');
    }, 800);
}

let currentScene = 'menu';

async function init() {
    console.log("🚀 遊戲系統啟動...");
    // document.getElementById('start-overlay').classList.add('hidden');
    document.getElementById('loading-screen').classList.add('hidden');

    // await preloadGlobalAssets();

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
            plank: 0, stick: 0, 
            wood_pickaxe: 0, stone_pickaxe: 0, 
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