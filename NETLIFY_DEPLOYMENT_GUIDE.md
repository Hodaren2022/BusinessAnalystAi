# 🚀 Netlify 部署環境變數設定指南

## 📋 快速設定步驟

### 1. 複製環境變數
從 `netlify.env` 文件中複製所有環境變數

### 2. 在 Netlify 控制台設定
1. 登入 [Netlify](https://app.netlify.com/)
2. 選擇你的網站項目
3. 進入 **Settings** → **Build & deploy** → **Environment**
4. 點擊 **Add variable** 逐一添加以下變數：

## 🔑 必要環境變數

### Gemini AI (必須)
```
VITE_GEMINI_API_KEY = AIzaSyAUHP82uV93_Zok_4F5QVDSv-PsTWkahOU
```

### Firebase 配置 (必須)
```
VITE_FIREBASE_API_KEY = AIzaSyBVljQ58OlrNbJ2sDkmgksvk9rdClrE3ho
VITE_FIREBASE_AUTH_DOMAIN = businessmodelanalyst-58edb.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = businessmodelanalyst-58edb
VITE_FIREBASE_STORAGE_BUCKET = businessmodelanalyst-58edb.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 376699790734
VITE_FIREBASE_APP_ID = 1:376699790734:web:298dfd1bca9c61f33670df
VITE_FIREBASE_MEASUREMENT_ID = G-Z1TLVJK8BS
```

### 向後兼容 (可選)
```
GEMINI_API_KEY = AIzaSyAUHP82uV93_Zok_4F5QVDSv-PsTWkahOU
```

## 🔧 部署設定

### Build Settings
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18 或更高

### 3. 重新部署
設定完環境變數後，點擊 **Deploy site** 重新部署

## ✅ 驗證部署
部署完成後，檢查：
1. 網站是否正常載入
2. 控制台是否有 API KEY 相關錯誤
3. AI 聊天功能是否正常工作

## 🚨 注意事項
- 所有環境變數都必須以 `VITE_` 開頭才能在前端使用
- 設定後需要重新部署才會生效
- 確保 Firebase Console 中已啟用 Anonymous Authentication