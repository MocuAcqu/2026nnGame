import { AudioManager } from './audioManager.js';

const TRACKS = [
    { title: "時間之神的呼喚", artist: "莫丘", path: "assets/audio/Goddess of time.mp3", cover: "assets/images/cover.png" },
    { title: "挖掘世界的真相", artist: "莫丘", path: "assets/audio/bgm-chapter1.mp3", cover: "assets/images/cover.png" },
    { title: "樓梯迴廊", artist: "莫丘", path: "assets/audio/Stairwell Humming.mp3", cover: "assets/images/cover.png" },
    { title: "帽子世界的神秘守衛", artist: "莫丘", path: "assets/audio/Velvet Curtain Alchemy.mp3", cover: "assets/images/cover.png" },
    { title: "帽子戲法", artist: "莫丘", path: "assets/audio/HatTrick.mp3", cover: "assets/images/cover.png" },
    { title: "幻術之門", artist: "莫丘", path: "assets/audio/Hull-Slap Echoes.mp3", cover: "assets/images/cover.png" },
    { title: "抓住逃跑的你", artist: "莫丘", path: "assets/audio/Candle in the Corridor.mp3", cover: "assets/images/cover.png" },
    { title: "對決之時", artist: "莫丘", path: "assets/audio/Battle Circuit.mp3", cover: "assets/images/cover.png" },
    { title: "贈予前行", artist: "莫丘", path: "assets/audio/victory_theme.mp3", cover: "assets/images/cover.png" },
    { title: "勇者的祝福", artist: "莫丘", path: "assets/audio/甦醒吧勇者_最終祝福.mp3", cover: "assets/images/cover.png" },
];

let currentTrackIndex = 0;
let isPlaying = false;
let progressInterval = null;

export const Collection = {
    open: () => {
        const modal = document.getElementById('collection-modal');
        modal.classList.remove('hidden');

        // 停止主選單音樂
        AudioManager.stopBGM();

        renderTracklist();
        bindCollectionEvents();
        selectTrack(0); // 預設選第一首
    }
};

function renderTracklist() {
    const listEl = document.getElementById('track-list');
    listEl.innerHTML = "";

    TRACKS.forEach((track, index) => {
        const item = document.createElement('li');
        item.innerText = `${index + 1}. ${track.title}`;
        item.dataset.index = index;
        
        item.onclick = () => selectTrack(index, true); // true 代表自動播放

        listEl.appendChild(item);
    });
}

function selectTrack(index, autoplay = false) {
    currentTrackIndex = index;
    const track = TRACKS[index];

    // 更新 UI
    document.getElementById('album-cover').src = track.cover;
    document.getElementById('track-title').innerText = track.title;
    
    // 高亮顯示
    document.querySelectorAll('#track-list li').forEach(li => {
        li.classList.toggle('playing', parseInt(li.dataset.index) === index);
    });

    // 載入音樂
    AudioManager.bgm.src = track.path;
    if (autoplay) playMusic();
}

function playMusic() {
    AudioManager.bgm.play();
    isPlaying = true;
    document.getElementById('btn-play-pause').innerText = '⏸';
    startProgressUpdater();
}

function pauseMusic() {
    AudioManager.bgm.pause();
    isPlaying = false;
    document.getElementById('btn-play-pause').innerText = '▶';
    stopProgressUpdater();
}

function startProgressUpdater() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        const progress = (AudioManager.bgm.currentTime / AudioManager.bgm.duration) * 100;
        document.getElementById('music-progress-bar').style.width = `${progress}%`;
    }, 200);
}

function stopProgressUpdater() {
    clearInterval(progressInterval);
}

function bindCollectionEvents() {
    // 播放/暫停
    document.getElementById('btn-play-pause').onclick = () => {
        if (isPlaying) pauseMusic();
        else playMusic();
    };

    // 上一首/下一首
    document.getElementById('btn-next-track').onclick = () => {
        let nextIndex = (currentTrackIndex + 1) % TRACKS.length;
        selectTrack(nextIndex, true);
    };
    document.getElementById('btn-prev-track').onclick = () => {
        let prevIndex = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
        selectTrack(prevIndex, true);
    };

    // 關閉
    document.getElementById('btn-close-collection').onclick = () => {
        pauseMusic();
        document.getElementById('collection-modal').classList.add('hidden');
        // 恢復主選單音樂
        AudioManager.playBGM('assets/audio/Goddess of time.mp3');
    };
}