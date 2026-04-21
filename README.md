# Inventory Frontend

這個資料夾是盤點系統第一版手機前端，先完成以下功能：

- 手動輸入料號、批次、數量
- 下拉選擇溫層、道別、樓層、版位
- 自動產生 `location_code`
- 寫入 Supabase `inventory_records`

## 目前檔案

- `index.html`：頁面結構
- `style.css`：手機優先樣式
- `app.js`：表單邏輯與 Supabase 寫入

## 啟用方式

1. 打開 `app.js`
2. 將以下兩個值換成你的 Supabase 設定：

```js
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

3. 用 VS Code Live Server 或任何靜態伺服器打開 `index.html`
4. 測試送出後，到 Supabase Table Editor 確認資料是否進入 `inventory_records`

## GitHub Pages

之後可直接把這三個前端檔案推到 GitHub Repo，啟用 GitHub Pages 後即可手機存取。

## 下一步建議

- 加入 QR 掃描
- 加入 Excel 匯出
- 加入登入與更嚴格的 RLS policy
