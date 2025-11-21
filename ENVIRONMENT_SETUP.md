# 環境變數設定指南

## 📋 必要的環境變數

本專案需要以下環境變數才能正常運行：

### Gemini API
```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Firebase 配置
```
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## 🚀 設定步驟

1. **複製範例檔案**
   ```bash
   cp .env.example .env.local
   ```

2. **編輯 `.env.local` 檔案**
   - 將所有 `your_*_here` 替換為實際的 API 金鑰和配置值

3. **取得 API 金鑰**
   - **Gemini API**: 前往 [Google AI Studio](https://aistudio.google.com/) 取得
   - **Firebase**: 前往 [Firebase Console](https://console.firebase.google.com/) 取得

## ⚠️ 重要注意事項

- `.env.local` 檔案已被加入 `.gitignore`，不會被提交到版本控制
- 絕對不要將真實的 API 金鑰提交到 GitHub
- 如果需要在生產環境部署，請在部署平台設定環境變數

## 🔧 故障排除

如果遇到 API 金鑰相關錯誤：
1. 確認 `.env.local` 檔案存在且格式正確
2. 確認所有必要的環境變數都已設定
3. 重新啟動開發服務器 (`npm run dev`)

## 📁 檔案結構
```
.env.example     # 環境變數範例檔案（可提交）
.env.local       # 本地環境變數檔案（不可提交）
.gitignore       # 已包含 .env.local
```