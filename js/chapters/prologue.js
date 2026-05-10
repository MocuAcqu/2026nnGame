import { Chapter1 } from './chapter1.js';
import { SaveSystem } from '../saveSystem.js';
import { getCachedUrl } from '../assetsConfig.js';

const prologueLines = [
    "想迎來 27 歲的人生",
    "有三道關卡。",
    "雖然如今我有點忘了，",
    "但我能肯定一件事。",
    "", 
    "那就是此刻正在讀這些文字的你",
    "將會成功抵達。",
    "",
    "- 迎來 27 歲世界的三道關卡"
];

let typingAudio = null;

function playTypingSound() {
    // 第一次播放時，建立 Audio 物件並給予快取網址
    if (!typingAudio) {
        typingAudio = new Audio(getCachedUrl('assets/audio/typing.mp3'));
    }

    typingAudio.currentTime = 0;
    typingAudio.volume = 0.2 + Math.random() * 0.4;
    typingAudio.play().catch(() => {}); 
}

export const Prologue = {
    play: async () => {
        const screen = document.getElementById('prologue-screen');
        const textContainer = document.getElementById('typing-container');
        const video = document.getElementById('intro-video');
        const skipBtn = document.getElementById('btn-skip-video');
        
        screen.classList.remove('hidden');
        textContainer.innerHTML = ''; 
        textContainer.style.display = 'block';
        video.style.display = 'none';
        skipBtn.style.display = 'none';

        await typeLines(textContainer, prologueLines);
        await delay(3000);

        textContainer.style.display = 'none'; 
        
        await playVideoWithSkip(video, skipBtn);

        console.log("🎬 序章結束，進入第一章");
        screen.classList.add('hidden'); 

        const currentState = SaveSystem.load();
        if (currentState) {
            currentState.chapter = 1;
            SaveSystem.save(currentState);
            console.log("💾 進度已更新為 Chapter 1");
        }
        
         await showChapterTitleAndPreload();
    }
};

// 打字機效果
async function typeLines(container, lines) {
    for (let line of lines) {
        const lineDiv = document.createElement('div');
        lineDiv.style.minHeight = "1.5rem";
        lineDiv.classList.add('cursor');
        container.appendChild(lineDiv);

        for (let char of line) {
            lineDiv.textContent += char; 
            await delay(100); 

            if (char !== ' ') {
                playTypingSound();
            }

            const randomDelay = Math.floor(Math.random() * 100) + 50;
            await delay(randomDelay);
        }

        lineDiv.classList.remove('cursor');
        await delay(300); 
    }
}

// 播放影片
function playVideoWithSkip(video, skipBtn) {
    return new Promise((resolve) => {

        video.style.display = 'block';
        skipBtn.style.display = 'block';

        const finish = () => {
            video.pause();         
            video.currentTime = 0; 
            skipBtn.style.display = 'none'; 
            
            video.onended = null;
            skipBtn.onclick = null;
            
            resolve(); 
        };

        video.onended = () => {
            console.log("影片播放完畢");
            finish();
        };

        skipBtn.onclick = () => {
            console.log("使用者跳過影片");
            finish();
        };

        video.play().catch(e => {
            console.warn("影片自動播放失敗，可能需要互動:", e);
        });
    });
} 

// 延遲
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function showChapterTitleAndPreload() {
    const titleScreen = document.getElementById('chapter-title-screen');
    titleScreen.classList.remove('hidden');
    titleScreen.style.opacity = 1;

    console.log("正在背景預先初始化 Chapter 1...");
    Chapter1.init(); 

    // 讓玩家看標題看足 3 秒
    await new Promise(r => setTimeout(r, 3000));

    // 淡出標題
    titleScreen.style.opacity = 0;
    await new Promise(r => setTimeout(r, 1000));
    titleScreen.classList.add('hidden');
    
}