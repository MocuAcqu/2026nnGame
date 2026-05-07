import { SaveSystem } from './saveSystem.js';
import { AudioManager } from './audioManager.js';
import { Prologue } from './chapters/prologue.js';
import { Chapter1 } from './chapters/chapter1.js';
import { Chapter2 } from './chapters/chapter2.js';
import { Chapter3 } from './chapters/chapter3.js';
import { Collection } from './collection.js';

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

let currentScene = 'menu';

function init() {
    console.log("🚀 遊戲系統啟動...");

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