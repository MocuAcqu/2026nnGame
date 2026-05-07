export const AudioManager = {
    bgm: new Audio(), // 建立一個音訊物件
    currentTrack: null,

    // 播放背景音樂
    playBGM: (path) => {
        // 如果現在正在播同一首，就不用重播
        if (AudioManager.currentTrack === path) return;

        AudioManager.bgm.src = path;
        AudioManager.bgm.loop = true; 
        AudioManager.bgm.volume = 0.5; 
        
        // 瀏覽器政策要求：必須使用者互動後才能播放聲音
        // 我們加一個 catch 來避免報錯
        AudioManager.bgm.play().catch(error => {
            console.log('等待使用者互動後播放音樂...');
            document.addEventListener('click', () => {
                AudioManager.bgm.play();
            }, { once: true });
        });

        AudioManager.currentTrack = path;
        console.log('🎵 播放音樂:', path);
    },

    // 停止音樂
    stopBGM: () => {
        AudioManager.bgm.pause();
        AudioManager.bgm.currentTime = 0;
        AudioManager.currentTrack = null;
    }
};