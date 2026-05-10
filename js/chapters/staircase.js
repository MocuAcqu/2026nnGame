import { SaveSystem } from '../saveSystem.js';
import { AudioManager } from '../audioManager.js';
import { Chapter2 } from './chapter2.js';
import { getCachedUrl } from '../assetsConfig.js'; 

const memories = [
    { text: "雖然總是會說著為什麼我是活動長?但成為活動長的期間，真的很令人開心。", skill: "慧眼識英雄", effect: "躲避敵人攻擊一回合" },
    { text: "沒想到你是上個世紀的人，是令人尊敬的老人家呢。", skill: "敬老尊賢", effect: "本回合敵人傷害減少 50 %" },
    { text: "會算塔羅牌的化學魔法師，引導凡事之路，解決人們心中所困。", skill: "讓我為你解惑吧", effect: "傷害敵人 15 滴血" },
    { text: "總是在重要時刻，第一時間出現，是個負責任的人呢。", skill: "優秀領袖", effect: "我方可連續出擊一次" },
    { text: "心思細膩，總是為夥伴們著想，這次，也請多為自己想一點。", skill: "多愛自己一點", effect: "補血 10 滴" },
    { text: "可以看見普通人看不見的世界與事物，更深刻的感受世間萬物的一切。", skill: "I see you", effect: "本回合敵人傷害歸零" },
    { text: "是個聊天會停不下來的人，也因為這樣的交流，我也更加體會，如何分享故事。", skill: "傳說故事", effect: "傷敵 5 滴 + 補血 5 滴" },
    { text: "擁有非常多厲害的裝備，結合多元的技能，總是能提供意想不到的幫助。", skill: "無敵百寶袋", effect: "隨機獲得兩張技能卡" },
    { text: "有非常專業的能力與知識，總能有效解決許多問題。", skill: "沒什麼解決不了的", effect: "傷害敵人 10 滴血" },
    { text: "擁有無比堅強的意志力與耐心，儘管身處困難，也不輕易放棄。", skill: "歡樂勇者的精神", effect: "躲避敵人攻擊一回合" },
    { text: "捕捉世間美景的攝影大師，總在幕後默默做事。", skill: "幕後 Photo 手", effect: "敵人傷害減少 50 %" }
];

let currentFloor = 0;
let heldSkills = [];
let inspectingIndex = null;

const sfxPaths = {
    walk: 'assets/audio/stairs_climb.mp3',
    dialogue_click: 'assets/audio/dialogue_click.mp3'
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

function showIntroDialogue() {
    const overlay = document.getElementById('dialogue-overlay');
    const textEl = document.getElementById('dialogue-text');
    const nameEl = document.getElementById('dialogue-name');
    
    currentFloor = 0;
    heldSkills = [];

    nameEl.innerText = "綿羊使者";
    overlay.classList.remove('hidden');
    textEl.innerText = "本次技能選擇攸關未來結局，至多可選擇保留五項技能、至少需選擇保留一項技能，每一層僅能選擇「捨棄」現有的技能和「保留」本樓的技能，且無法回頭再次選擇保留之前樓梯的技能，敬祝 武運昌隆。";
    
    // 點擊對話框後正式開始
    const startAction = () => {
        overlay.classList.add('hidden');
        overlay.removeEventListener('click', startAction); // 移除監聽器
        loadFloor();
    };
    
    overlay.addEventListener('click', startAction);
}

function showSkillDetail(index) {
    inspectingIndex = index;
    const skillData = heldSkills[index];
    const modal = document.getElementById('skill-detail-modal');
    const container = document.getElementById('detail-card-container');
    
    modal.classList.remove('hidden');
    container.innerHTML = `
        <div class="skill-card">
            <h2 style="color:#00e5ff;">【${skillData.skill}】</h2>
            <p style="color:#ccc; margin-top:15px;">${skillData.text}</p>
            <div style="margin-top:20px; color:#feca57; font-size:0.9rem;">效果：${skillData.effect}</div>
        </div>
    `;

    // 綁定彈窗按鈕
    document.getElementById('btn-close-detail').onclick = () => modal.classList.add('hidden');
    document.getElementById('btn-delete-skill').onclick = () => {
        heldSkills.splice(inspectingIndex, 1);
        modal.classList.add('hidden');
        renderSkillInventory();
    };
}

export const Staircase = {
    start: () => {
        document.getElementById('chapter1-screen').classList.add('hidden');
        document.getElementById('staircase-screen').classList.remove('hidden');

        AudioManager.playBGM(getCachedUrl('assets/audio/Stairwell Humming.mp3'));
        AudioManager.bgm.volume = 0.3;
        showIntroDialogue();        
    },

    enterChapter2: () => {
        const gameState = SaveSystem.load();
        
        if (gameState.flags && gameState.flags.canResurrect) {
            // 檢查是否已經在背包裡，避免重複
            const hasSkill = heldSkills.some(s => s.skill === "死而復生");
            if (!hasSkill) {
                heldSkills.push({
                    skill: "死而復生",
                    text: "從失敗中站起的經驗，讓你獲得了重生的韌性。",
                    effect: "復活並恢復 50% HP"
                });
                console.log("已自動裝備隱藏技能：死而復生");
            }
        }

        // 2. 判斷是否一個技能都沒選
        if (heldSkills.length === 0) {
            // 處罰對話
            triggerSheepAngryDialogue();
            return; 
        }

        // 3. 正常結算對話
        triggerSuccessDialogue(gameState);
    }
};

function triggerSheepAngryDialogue() {
    const overlay = document.getElementById('dialogue-overlay');
    const textEl = document.getElementById('dialogue-text');
    const nameEl = document.getElementById('dialogue-name');

    nameEl.innerText = "綿羊使者";
    overlay.classList.remove('hidden');
    textEl.innerText = "你這個沒有認真聽規則的人類，回去重爬！";

    // 點擊後重置回第一層
    const resetAction = () => {
        overlay.classList.add('hidden');
        overlay.removeEventListener('click', resetAction);
        
        // 重置樓梯狀態
        currentFloor = 0;
        heldSkills = [];
        
        // 播放腳步聲並載入第一層
        nextFloorWithTransition(); 
        // 注意：這裡如果直接呼叫 nextFloorWithTransition 會跳到 FLOOR 02，
        // 所以我們先手動重置 currentFloor = -1 再呼叫它，或者直接 call loadFloor()。
        currentFloor = 0;
        loadFloor();
        
        // 讓原本隱藏的按鈕區重新出現
        document.querySelector('.action-buttons').style.display = 'flex';
    };

    overlay.addEventListener('click', resetAction);
}

function triggerSuccessDialogue(gameState) {
    const overlay = document.getElementById('dialogue-overlay');
    const textEl = document.getElementById('dialogue-text');
    const nameEl = document.getElementById('dialogue-name');

    nameEl.innerText = "綿羊使者";
    overlay.classList.remove('hidden');
    textEl.innerText = "記憶已化為力量，那些屬於你的，都是你所創造的，放心使用這份能力吧。";

    const proceedAction = async () => {
        overlay.classList.add('hidden');
        overlay.removeEventListener('click', proceedAction);

        // 1. 儲存數據
        gameState.chapter = 2;
        gameState.skills = heldSkills; // 存入卡牌物件陣列
        SaveSystem.save(gameState);

        // 2. 播放 Chapter 2 標題轉場
        await showChapter2Title();

        Chapter2.init();
    };

    overlay.addEventListener('click', proceedAction);
}

async function showChapter2Title() {
    document.getElementById('staircase-screen').classList.add('hidden');
    const titleScreen = document.getElementById('chapter-title-screen');
    titleScreen.classList.remove('hidden');
    titleScreen.style.opacity = 1;
    
    const numEl = document.getElementById('chapter-number');
    const nameEl = document.getElementById('chapter-name');

    // 更新轉場文字
    numEl.innerText = "Chapter 2";
    nameEl.innerText = "防身的幻術之門";

    // 停留 3 秒
    await new Promise(r => setTimeout(r, 3000));

    titleScreen.style.opacity = 0;
    await new Promise(r => setTimeout(r, 1000));

    titleScreen.classList.add('hidden');
}

async function nextFloorWithTransition() {
    const white = document.getElementById('transition-white'); // 使用現有的白光或改成全黑
    
    // 變黑 (這裡我們可以用 CSS 改背景色或用一個黑色的 overlay)
    white.style.backgroundColor = "black";
    white.classList.remove('hidden');
    setTimeout(() => white.style.opacity = 1, 10);

    playSFX('walk');

    await new Promise(r => setTimeout(r, 5000)); // 走 1.5 秒

    // 更新樓層數值
    currentFloor++;
    loadFloor();

    // 回復畫面
    white.style.opacity = 0;
    setTimeout(() => {
        white.classList.add('hidden');
        white.style.backgroundColor = "white"; // 還原成白色供其他轉場使用
    }, 1000);
}

function loadFloor() {
    if (currentFloor >= memories.length) {
        showFinalDoor();
        return;
    }

    const data = memories[currentFloor];
    const bg = document.querySelector('.staircase-photo-bg');
    
    // 注意：路徑是相對於 index.html 的
    bg.style.backgroundImage = `url(${getCachedUrl(`assets/images/stairs_${currentFloor + 1}.jpg`)})`;

    document.getElementById('floor-indicator').innerText = `FLOOR ${String(currentFloor + 1).padStart(2, '0')}`;
    document.getElementById('staircase-progress').style.width = `${((currentFloor + 1) / 11) * 100}%`;
    
    // 清除按鈕上的舊文字
    document.getElementById('btn-keep-skill').innerText = "保留特質";
    document.getElementById('btn-discard-skill').innerText = "捨棄，繼續前進";

    document.getElementById('current-card-offer').innerHTML = `
        <div class="skill-card">
            <h2 style="color:#feca57; margin-bottom:15px; text-align:center;">【${data.skill}】</h2>
            <p style="line-height:1.6; color:#ccc; min-height:80px;">${data.text}</p>
            <div style="margin-top:20px; color:#00e5ff; font-size:1rem; border-top:1px solid #333; padding-top:10px;">效果：${data.effect}</div>
        </div>
    `;
    renderSkillInventory();
}

document.getElementById('btn-keep-skill').onclick = () => {
    if (heldSkills.length < 5) {
        heldSkills.push(memories[currentFloor]);
        nextFloorWithTransition(); // ★ 改用過場
    } else {
        alert("技能槽已滿！請先點擊下方的卡牌來捨棄一項。");
    }
};

document.getElementById('btn-discard-skill').onclick = () => {
    nextFloorWithTransition(); // ★ 改用過場
};

function renderSkillInventory() {
    const container = document.getElementById('skill-slots-container');
    container.innerHTML = "";
    for (let i = 0; i < 5; i++) {
        const slot = document.createElement('div');
        if (heldSkills[i]) {
            slot.className = "mini-card";
            slot.innerText = heldSkills[i].skill; 
            slot.onclick = () => showSkillDetail(i);
        } else {
            slot.className = "empty-slot";
        }
        container.appendChild(slot);
    }
}


function showFinalDoor() {
    const bg = document.querySelector('.staircase-photo-bg');
    bg.style.backgroundImage = `url(${getCachedUrl('assets/images/stairs_final.png')})`;

    // 隱藏原本的選擇按鈕
    document.querySelector('.action-buttons').style.display = 'none';

    document.getElementById('current-card-offer').innerHTML = `
        <div class="final-hat-trigger" style="text-align:center; animation: fadeIn 2s;">
            <h2 style="margin-top:60%; color: white;">魔術帽...?</h2>
            <p style="color: #aaa; margin-bottom: 20px;">這頂魔術帽裡，藏著對你的抗拒...</p>
            <button id="final-gate-btn" class="skill-action-btn primary">進入帽子裡的世界</button>
        </div>
    `;
    
    document.getElementById('final-gate-btn').onclick = Staircase.enterChapter2;
}
