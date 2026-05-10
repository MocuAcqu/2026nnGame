import { getCachedUrl } from './assetsConfig.js';

export const AudioManager = {
    bgm: new Audio(), // 建立一個音訊物件
    currentTrack: null,

    // 播放背景音樂
    playBGM: (path) => {
        const cachedPath = getCachedUrl(path); 
        
        if (AudioManager.currentTrack === cachedPath) return;

        AudioManager.bgm.src = cachedPath;
        AudioManager.bgm.loop = true; 
        AudioManager.bgm.volume = 0.6; 
        
         AudioManager.bgm.play().catch(e => {
            document.addEventListener('click', () => AudioManager.bgm.play(), { once: true });
        });
        AudioManager.currentTrack = cachedPath;
        console.log(`🎵 播放音樂: ${path.split('/').pop()}`); 
    },

    // 停止音樂
    stopBGM: () => {
        AudioManager.bgm.pause();
        AudioManager.bgm.currentTime = 0;
        AudioManager.currentTrack = null;
    }
};