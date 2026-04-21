# Inventory Frontend

這個專案是盤點系統第一階段前端，已完成手機建檔主流程，並已串接 Supabase。

目前已完成功能：

- 手機手動建檔
- 手機掃描 QR Code 自動帶入資料
- 連續重複掃描同一張條碼防呆
- 建立人員可手動填寫，並保留前一次輸入
- 自動記住前一次儲位設定
- 自動判斷 `input_method`，不需手動選擇
- 下拉選擇溫層、走道位置、樓層、版位
- 自動產生 `location_code`
- 寫入 Supabase `inventory_records`

## 線上網址

- 建檔頁：`https://btohri.github.io/inventory-frontend/`

## 目前檔案

- `index.html`：建檔主頁
- `style.css`：共用樣式
- `app.js`：建檔、掃碼、Supabase 寫入邏輯
- `admin.html` / `admin.js`：目前保留在專案內，主畫面已不顯示入口
- `personnel-store.js`：人員名單共用儲存邏輯

## 功能說明

### 1. 建立人員
目前主畫面的 `建立人員` 改為手動輸入欄位，並會自動保留前一次輸入內容，方便連續建檔。

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

### 3. 掃描防呆

目前已加入短時間重複掃描防呆：

- 如果短時間內連續掃到同一張條碼
- 系統會顯示提示
- 不會再次自動帶入欄位

### 4. 儲位記憶

系統會記住前一次成功使用的儲位設定：

- 溫層
- 走道位置
- 樓層
- 版位

下一次開頁面或送出後，會自動帶回上一組儲位。

### 5. 輸入方式

`input_method` 已改為系統自動判斷：

- 有 `raw_qr` 時自動寫入 `scan`
- 無 `raw_qr` 時自動寫入 `manual`

### 6. Supabase 狀態

畫面右上角會顯示狀態燈：

- 綠點：Supabase 已連線
- 紅點：Supabase 未連線
- 灰點：連線檢查中
- 目前僅顯示燈號，不顯示文字

## 儲位邏輯

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
