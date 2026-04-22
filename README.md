# Inventory Frontend

這個專案是盤點系統第一階段前端，已完成手機建檔主流程，並已串接 Supabase。

目前已完成功能：

- 手機手動建檔
- 手機掃描 QR Code 自動帶入資料
- 平板外接掃描槍模式，可直接掃入同一套 QR 資料
- 連續重複掃描同一張條碼防呆
- 建立人員可手動填寫，並保留前一次輸入
- 自動記住前一次儲位設定
- 自動判斷 `input_method`，不需手動選擇
- 前端匯出 Excel
- 下拉選擇溫層、走道位置、樓層、版位
- 自動產生 `location_code`
- 寫入 Supabase `inventory_records`
- 匯出頁查詢功能（日期範圍、建立人員、料號模糊搜尋）
- 查詢結果預覽表格，確認後再匯出 Excel
- 匯出頁查詢後可直接修改單筆資料
- 查詢頁已調整為較適合電腦操作的寬版配置
- 相機掃描框擴大，視角更近
- 平板掃描槍模式已加入 `T1 / T2` 格式防呆
- 掃描模式切換後，手機相機的 `開始掃描` 按鈕可正常恢復使用

## 線上網址

- 建檔頁：`https://btohri.github.io/inventory-frontend/`
- 匯出頁：`https://btohri.github.io/inventory-frontend/export.html`

## 目前檔案

- `index.html`：建檔主頁
- `export.html`：資料匯出頁
- `style.css`：共用樣式
- `app.js`：建檔、掃碼、Supabase 寫入邏輯
- `export.js`：Excel 匯出邏輯
- `admin.html` / `admin.js`：目前保留在專案內，主畫面已不顯示入口
- `personnel-store.js`：人員名單共用儲存邏輯

## 功能說明

### 1. 建立人員
目前主畫面的 `建立人員` 改為手動輸入欄位，並會自動保留前一次輸入內容，方便連續建檔。

### 2. QR 掃描功能

建檔頁預設會先載入 `手機相機掃描` 模式。

- 手機模式：按 `開始掃描` 後啟動相機，掃描 QR Code
- 平板模式：按 `平板掃描槍` 後，原本顯示相機提示的區域會切換成可輸入欄位，可直接讓掃描槍輸入條碼
- 兩種模式都會共用同一套 QR 解析邏輯
- 系統會自動解析 `T2 / T3 / T4`
- 自動帶入 `料號 / 批次 / 數量`

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

平板掃描槍另外加入格式防呆：

- 條碼內容必須包含 `T1` 與 `T2`
- 若格式不符，系統會提示重新掃描
- 格式不正確時不會自動帶入欄位

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

### 6. Excel 匯出與查詢

Excel 匯出已改為獨立頁面 `export.html`，避免影響現場建檔頁。

匯出頁支援先查詢、修改，再匯出：

1. 設定篩選條件（開始日期、結束日期、建立人員、料號）
2. 按「查詢」預覽符合條件的筆數與資料
3. 若需要，可按每筆資料右側的「編輯」直接修改
4. 確認後按「匯出 Excel」下載，匯出內容與查詢結果一致

目前查詢頁也已針對電腦操作做版面調整：

- 桌機畫面下會放寬頁面寬度
- 篩選條件改成較寬的多欄排列
- 編輯欄位不再撐滿整個區塊，操作更集中

篩選條件說明：

- 開始 / 結束日期：限定 `created_at` 範圍
- 建立人員、料號：支援模糊搜尋（輸入部分字串即可）
- 所有條件留空時匯出全部資料

匯出欄位：

- 時間、建立人員、料號、批次、數量、儲位、輸入方式

注意：

- 匯出功能需要 Supabase RLS 允許 `SELECT`
- 請在 Supabase Dashboard 建立 policy：`FOR SELECT TO public USING (true)`
- 若要使用查詢後修改功能，還需要 `UPDATE` 權限，以及資料表內已有可唯一識別每筆資料的 `id` 主鍵

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

如果要讓 `export.html` 可修改資料，請先確認 `inventory_records` 已經有 `id` 主鍵。

- 如果你的資料表和目前專案一樣，已經有 `uuid` 型別的 `id` 主鍵，就不需要新增欄位
- 如果沒有 `id` 主鍵，才需要先補一個可唯一識別每筆資料的主鍵欄位

接著新增或確認查詢與修改權限：

```sql
create policy "inventory_records_select_public"
on public.inventory_records
for select
to public
using (true);

create policy "inventory_records_update_public"
on public.inventory_records
for update
to public
using (true)
with check (true);
```

如果已經存在舊的 `SELECT` policy，只需要補 `UPDATE` policy 即可。

注意：

- 目前這種做法代表能開啟頁面的人都可以修改資料
- 若之後要正式上線，建議再補登入與更嚴格的 RLS 限制

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

### 平板掃描槍建檔

1. 開啟建檔頁
2. 選擇建立人員
3. 按 `平板掃描槍`
4. 在掃描區直接用掃描槍掃入條碼
5. 確認自動帶入的料號、批次、數量
6. 選擇儲位
7. 按 `送出建檔`

## 目前限制

- 人員名單目前存在 `localStorage`
- 不同手機之間不會自動同步人員名單
- QR 解析目前依賴 `T2 / T3 / T4` 格式
- 尚未加入登入與權限管理

## 下一步建議

- 將人員管理升級為 Supabase 共用名單
- 加入登入與更嚴格的 RLS policy
