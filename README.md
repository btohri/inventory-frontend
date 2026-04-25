# Inventory Frontend

這個專案是盤點系統第一階段前端，已完成手機建檔主流程，並已串接 Supabase。

目前已完成功能：

- 手機手動建檔
- 手機掃描資料自動帶入
- 平板外接掃描槍模式可直接掃碼建檔
- 建檔前可選擇食品廠或面膜廠，送出時會寫入 `factory_type`
- 面膜廠改為先掃儲位條碼，再掃原物料 QR
- 面膜廠儲位會依位置規則自動限制溫層、樓層與版位
- 連續重複掃描防呆
- 建立人員可手動填寫，並保留前一次輸入
- 自動記住前一次儲位設定
- 自動判斷 `input_method`，不需手動選擇
- 前端匯出 Excel
- 下拉選擇溫層、走道位置、樓層、版位
- 自動產生 `location_code`
- 寫入 Supabase `inventory_records`
- 匯出頁查詢功能（日期範圍、建立人員、料號模糊搜尋、廠別篩選）
- 查詢結果預覽表格，確認後再匯出 Excel
- 匯出頁查詢後可直接修改單筆資料
- 查詢頁已調整為較適合電腦操作的寬版配置
- 相機掃描框擴大，視角更近
- 食品廠平板掃描槍模式保留 `T1 / T2` 格式防呆
- 面膜廠手機模式第一掃儲位條碼後相機可持續開啟
- 面膜廠原物料重複掃描改為詢問是否繼續建檔

## 線上網址

- 建檔頁：`https://btohri.github.io/inventory-frontend/`
- 匯出頁：`https://btohri.github.io/inventory-frontend/export.html`

## 目前檔案

- `index.html`：建檔主頁
- `export.html`：資料匯出頁
- `style.css`：共用樣式
- `app.js`：共用建檔、掃碼、Supabase 寫入流程
- `app.food.js`：食品廠邏輯
- `app.mask.js`：面膜廠邏輯
- `export.js`：Excel 匯出邏輯
- `admin.html` / `admin.js`：目前保留在專案內，主畫面已不顯示入口
- `personnel-store.js`：人員名單共用儲存邏輯

## 功能說明

### 1. 建立人員
目前主畫面的 `建立人員` 改為手動輸入欄位，並會自動保留前一次輸入內容，方便連續建檔。

### 2. 廠別選擇

建檔頁會先選擇廠別：

- 食品廠：使用原本的溫層、走道位置、樓層、版位規則
- 面膜廠：先掃儲位條碼，再掃原物料 QR

送出資料時會寫入 `factory_type`：

- `食品廠`
- `面膜廠`

### 3. 掃描功能

建檔頁預設會先載入 `手機相機掃描` 模式。

- 手機模式：按 `開始掃描` 後啟動相機掃碼
- 平板模式：按 `平板掃描槍` 後，可直接讓掃描槍輸入條碼
- 食品廠：掃描原物料 QR，系統會解析 `T2 / T3 / T4`
- 面膜廠：先掃儲位一維條碼，再掃原物料 QR
- 原物料 QR 會自動帶入 `料號 / 批次 / 每桶重量`

目前解析規則：

- `T2` → `item_code`
- `T3` → `batch_no`
- `T4` → `weight_per_bucket`

### 4. 掃描防呆

目前已加入短時間重複掃描防呆：

- 食品廠：若短時間內連續掃到同一張條碼，系統會直接擋下
- 面膜廠儲位條碼：不擋重複掃描
- 面膜廠原物料：若短時間內重複掃到同一張，系統會詢問是否繼續建檔

平板掃描槍另外加入格式防呆：

- 食品廠條碼內容必須包含 `T1` 與 `T2`
- 面膜廠平板掃描槍可先掃儲位條碼，再掃原物料 QR 內容

### 5. 儲位記憶

系統會記住前一次成功使用的儲位設定：

- 溫層
- 走道位置
- 樓層
- 版位

下一次開頁面或送出後，會自動帶回上一組儲位。

面膜廠不使用這個功能，因為每筆會先由儲位條碼決定儲位。

### 6. 輸入方式

`input_method` 已改為系統自動判斷：

- 有 `raw_qr` 時自動寫入 `scan`
- 無 `raw_qr` 時自動寫入 `manual`

### 7. Excel 匯出與查詢

Excel 匯出已改為獨立頁面 `export.html`，避免影響現場建檔頁。

匯出頁支援先查詢、修改，再匯出：

1. 設定篩選條件（開始日期、結束日期、建立人員、料號、廠別）
2. 按「查詢」預覽符合條件的筆數與資料
3. 若需要，可按每筆資料右側的「編輯」直接修改
4. 確認後按「匯出 Excel」下載，匯出內容與查詢結果一致

目前查詢頁也已針對電腦操作做版面調整：

- 桌機畫面下會放寬頁面寬度
- 篩選條件改成較寬的多欄排列
- 查詢結果表格已改為較緊湊欄距，減少橫向拖拉
- 編輯欄位不再撐滿整個區塊，操作更集中

篩選條件說明：

- 開始 / 結束日期：限定 `created_at` 範圍
- 建立人員、料號：支援模糊搜尋（輸入部分字串即可）
- 廠別：可快速篩選 `食品廠` 或 `面膜廠`
- 所有條件留空時匯出全部資料

匯出欄位：

- 時間、廠別、建立人員、料號、批次、每桶重量、桶數、總數量、儲位、輸入方式

注意：

- 匯出功能需要 Supabase RLS 允許 `SELECT`
- 請在 Supabase Dashboard 建立 policy：`FOR SELECT TO public USING (true)`
- 若要使用查詢後修改功能，還需要 `UPDATE` 權限，以及資料表內已有可唯一識別每筆資料的 `id` 主鍵

## 儲位邏輯

食品廠使用下拉選單選擇：

- 溫層（`F = 冷藏`、`G = 冷凍`）
- 走道位置
- 樓層
- 版位

系統會自動組成：

```text
location_code = 溫層-走道位置-樓層-版位
```

面膜廠使用掃描方式決定儲位：

- 先掃儲位一維條碼
- 系統自動拆出分類位置、樓層、版位
- 系統依規則自動帶入溫層

面膜廠會依規則自動限制可選範圍：

- `B`、`G` 分類為冷藏
- 其他分類為常溫
- 例如 `A01 ~ A10` 可選最高 03 樓、3 版
- 例如 `B01 ~ B14` 可選最高 03 樓、2 版

面膜廠儲位碼格式：

```text
location_code = 分類位置-樓層-版位
```

例如：

```text
A01-03-3
A18-01-2
A33-01-1
```

目前支援的面膜儲位條碼格式包含：

```text
A18012
A3301
D01033
A27 01 1
A27-01-1
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

如果你要使用「每桶重量 × 桶數」這版，`inventory_records` 請另外新增：

- `weight_per_bucket`：每桶重量，建議用 `numeric(12,2)`
- `bucket_count`：桶數，建議用 `integer`
- `quantity`：總數量，建議也用 `numeric(12,2)`；如果你原本是 `integer`，且未來可能有小數重量，建議一併改型別

可參考 SQL：

```sql
alter table public.inventory_records
add column if not exists weight_per_bucket numeric(12,2),
add column if not exists bucket_count integer;

alter table public.inventory_records
alter column quantity type numeric(12,2) using quantity::numeric;
```

如果要記錄食品廠 / 面膜廠，`inventory_records` 請另外新增：

- `factory_type`：廠別，儲存 `食品廠` 或 `面膜廠`

可參考 SQL：

```sql
alter table public.inventory_records
add column if not exists factory_type text not null default '食品廠';

alter table public.inventory_records
drop constraint if exists inventory_records_factory_type_check;

alter table public.inventory_records
add constraint inventory_records_factory_type_check
check (factory_type in ('食品廠', '面膜廠'));
```

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
2. 選擇食品廠或面膜廠
3. 選擇建立人員
4. 輸入料號、批次、每桶重量、桶數
5. 選擇儲位
6. 按 `送出建檔`

### 掃描建檔

1. 開啟建檔頁
2. 選擇食品廠或面膜廠
3. 選擇建立人員
4. 按 `開始掃描`
5. 食品廠掃描原物料 QR；面膜廠先掃儲位條碼
6. 若是面膜廠，再掃原物料 QR
7. 系統自動帶入資料並送出

### 平板掃描槍建檔

1. 開啟建檔頁
2. 選擇食品廠或面膜廠
3. 選擇建立人員
4. 按 `平板掃描槍`
5. 食品廠直接掃原物料內容
6. 面膜廠先掃儲位條碼，再掃原物料內容
7. 系統自動帶入資料並送出

### 查詢與匯出

1. 開啟匯出頁
2. 依需要設定日期、建立人員、料號或廠別
3. 若只要看單一廠別，可在廠別選擇 `食品廠` 或 `面膜廠`
4. 按 `查詢`
5. 確認預覽資料
6. 如需修正資料，按該筆資料右側 `編輯`
7. 確認後按 `匯出 Excel`

## 目前限制

- 人員名單目前存在 `localStorage`
- 不同手機之間不會自動同步人員名單
- QR 解析目前依賴 `T2 / T3 / T4` 格式
- 面膜廠儲位規則仍維護在前端 `app.mask.js`
- 尚未加入登入與權限管理

## 下一步建議

- 將人員管理升級為 Supabase 共用名單
- 加入登入與更嚴格的 RLS policy
