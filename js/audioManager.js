import { getCachedUrl } from './assetsConfig.js';

export const AudioManager = {
    bgm: new Audio(),
    currentTrack: null,

    playBGM: (path) => {
        const cachedPath = getCachedUrl(path); 
        
        if (AudioManager.currentTrack === cachedPath) return;

        AudioManager.bgm.src = cachedPath;
        AudioManager.bgm.loop = true; 
        AudioManager.bgm.volume = 0.6; 
        AudioManager.currentTrack = cachedPath;
        
        const playPromise = AudioManager.bgm.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // ★ 用 capture phase 攔截，並且阻止冒泡
                const resumeAudio = (e) => {
                    e.stopPropagation();
                    AudioManager.bgm.play().catch(() => {});
                };
                document.addEventListener('click', resumeAudio, { once: true, capture: true });
            });
        }

        console.log(`🎵 播放音樂: ${path.split('/').pop()}`);
    },

    stopBGM: () => {
        AudioManager.bgm.pause();
        AudioManager.bgm.currentTime = 0;
        AudioManager.currentTrack = null;
    }
};