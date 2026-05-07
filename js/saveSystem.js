const SAVE_KEY = 'birthday_game_save_v1'; 

export const SaveSystem = {
    // 儲存遊戲進度
    save: (data) => {
        try {
            const jsonString = JSON.stringify(data);
            localStorage.setItem(SAVE_KEY, jsonString);
            console.log('✅ 遊戲已存檔:', data);
            return true;
        } catch (e) {
            console.error('❌ 存檔失敗:', e);
            return false;
        }
    },

    // 讀取遊戲進度
    load: () => {
        try {
            const jsonString = localStorage.getItem(SAVE_KEY);
            if (!jsonString) return null; // 沒有存檔
            console.log('✅ 讀取存檔成功');
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('❌ 讀檔失敗:', e);
            return null;
        }
    },

    // 檢查是否有存檔
    hasSave: () => {
        return localStorage.getItem(SAVE_KEY) !== null;
    },

    // 清除存檔 (給「重新開始」用)
    clear: () => {
        localStorage.removeItem(SAVE_KEY);
        console.log('🗑️ 存檔已清除');
    }
};