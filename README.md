# Inventory Frontend

這個專案是盤點系統第一階段前端，已完成手機建檔主流程，並已串接 Supabase。

目前已完成功能：

- 手機手動建檔
- 手機掃描 QR Code 自動帶入資料
- 建立人員由管理頁面維護
- 下拉選擇溫層、走道位置、樓層、版位
- 自動產生 `location_code`
- 寫入 Supabase `inventory_records`

## 線上網址

- 建檔頁：`https://btohri.github.io/inventory-frontend/`
- 人員管理頁：`https://btohri.github.io/inventory-frontend/admin.html`

## 目前檔案

- `index.html`：建檔主頁
- `admin.html`：建立人員管理頁
- `style.css`：共用樣式
- `app.js`：建檔、掃碼、Supabase 寫入邏輯
- `admin.js`：人員名單新增與刪除
- `personnel-store.js`：人員名單共用儲存邏輯

## 功能說明

### 1. 建立人員管理

目前 `建立人員` 由管理頁面維護：

- 管理頁：`./admin.html`
- 建檔頁：`./index.html`
- 名單暫時存放在同一台裝置的 `localStorage`

使用流程：

1. 先打開管理頁新增人員
2. 再回建檔頁選擇建立人員
3. 建檔頁會自動讀取該裝置上的最新名單

### 2. QR 掃描功能

建檔頁目前已加入手機掃描功能：

1. 按 `開始掃描`
2. 允許相機權限
3. 掃描 QR Code
4. 系統自動解析 `T2 / T3 / T4`
5. 自動帶入 `料號 / 批次 / 數量`
6. 再選擇儲位後送出建檔

目前解析規則：

- `T2` → `item_code`
- `T3` → `batch_no`
- `T4` → `quantity`

如果 QR 格式不完全符合規則，系統仍會保留原始 QR 內容，方便手動修正。

### 3. 儲位邏輯

建檔頁使用下拉選單選擇：

- 溫層
- 走道位置
- 樓層
- 版位

系統會自動組成：

```text
location_code = 溫層-走道位置-樓層-版位
```

## Supabase 設定

前端目前使用：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` 或 `Publishable key`

注意：

- 前端可使用 `Publishable key`
- 不可使用 `Secret key` 或 `service_role`
- 資料安全需依靠 `RLS policy`

目前建議 policy：

- 移除 `allow all`
- 改為只允許 `INSERT`

## 本機開發

1. 用 VS Code 開啟此資料夾
2. 直接啟動靜態伺服器，例如 Live Server
3. 開啟 `index.html`
4. 測試送出後，到 Supabase `inventory_records` 確認資料

## 現場操作 SOP

### 手動建檔

1. 開啟建檔頁
2. 選擇建立人員
3. 輸入料號、批次、數量
4. 選擇溫層、走道位置、樓層、版位
5. 按 `送出建檔`

### 掃描建檔

1. 開啟建檔頁
2. 選擇建立人員
3. 按 `開始掃描`
4. 掃描 QR Code
5. 確認自動帶入的料號、批次、數量
6. 選擇儲位
7. 按 `送出建檔`

### 人員管理

1. 開啟 `admin.html`
2. 新增建立人員
3. 如需移除，按 `刪除`
4. 回建檔頁使用

## 目前限制

- 人員名單目前存在 `localStorage`
- 不同手機之間不會自動同步人員名單
- QR 解析目前依賴 `T2 / T3 / T4` 格式
- 尚未加入 Excel 匯出
- 尚未加入登入與權限管理

## 下一步建議

- 將人員管理升級為 Supabase 共用名單
- 加入 Excel 匯出
- 加入查詢頁
- 加入登入與更嚴格的 RLS policy
