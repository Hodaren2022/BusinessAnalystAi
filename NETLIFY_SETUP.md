# Netlify 部署指南

## 環境變數設定

在 Netlify 上部署此應用需要設定以下環境變數：

### 必要的環境變數
```
VITE_GEMINI_API_KEY=AIzaSyAUHP82uV93_Zok_4F5QVDSv-PsTWkahOU
```

### 設定步驟
1. 登入 Netlify 帳號
2. 選擇你的網站項目
3. 點擊 **Settings** → **Build & deploy** → **Environment**
4. 在 **Environment variables** 區域添加上述變數
5. 點擊 **Deploy site** 重新部署

### Firebase 設定（可選）
如果要使用完整的 Firebase 功能，還需要設定：
```
VITE_FIREBASE_API_KEY=AIzaSyBVljQ58OlrNbJ2sDkmgksvk9rdClrE3ho
VITE_FIREBASE_AUTH_DOMAIN=businessmodelanalyst-58edb.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=businessmodelanalyst-58edb
VITE_FIREBASE_STORAGE_BUCKET=businessmodelanalyst-58edb.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=376699790734
VITE_FIREBASE_APP_ID=1:376699790734:web:298dfd1bca9c61f33670df
```

## 部署指令
```bash
# Build command
npm run build

# Publish directory
/dist
```

## 故障排除
- 如果 API KEY 錯誤，檢查 Netlify 環境變數設定
- 查看 Netlify 林務台是否有相關錯誤訊息
- 確認 Firebase Console 中已啟用 Anonymous Authentication