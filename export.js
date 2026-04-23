const SUPABASE_URL = "https://tgotcbnbjfmnapwiwgsf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1CC439uRVnJKsPIiZE6u7w_3VenN1Li";

const queryButton = document.querySelector("#queryButton");
const exportButton = document.querySelector("#exportButton");
const messageBox = document.querySelector("#export-message");
const resultMeta = document.querySelector("#result-meta");
const previewWrap = document.querySelector("#preview-wrap");
const previewBody = document.querySelector("#preview-body");

const hasSupabaseConfig =
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

const supabase = hasSupabaseConfig
  ? window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_ANON_KEY) ?? null
  : null;

let queryResults = [];
let editingRecordId = null;

queryButton.addEventListener("click", runQuery);
exportButton.addEventListener("click", exportExcel);
previewBody.addEventListener("click", handlePreviewClick);
previewBody.addEventListener("submit", handleEditSubmit);
previewBody.addEventListener("input", handleEditInput);

function setMessage(text, type = "") {
  messageBox.textContent = text;
  messageBox.className = "form-message";
  if (type) messageBox.classList.add(type);
}

function getFilters() {
  const dateFrom = document.querySelector("#filterDateFrom").value;
  const dateTo = document.querySelector("#filterDateTo").value;
  const person = document.querySelector("#filterPerson").value.trim();
  const itemCode = document.querySelector("#filterItemCode").value.trim();
  return { dateFrom, dateTo, person, itemCode };
}

async function runQuery() {
  if (!supabase) {
    setMessage("尚未設定 Supabase，無法查詢。", "error");
    return;
  }

  queryButton.disabled = true;
  exportButton.disabled = true;
  setMessage("查詢中...");
  previewWrap.hidden = true;
  resultMeta.hidden = true;
  queryResults = [];

  const { dateFrom, dateTo, person, itemCode } = getFilters();

  let query = supabase
    .from("inventory_records")
    .select("id, created_at, created_by, item_code, batch_no, weight_per_bucket, bucket_count, quantity, temp_zone, aisle, level, position, location_code, input_method")
    .order("created_at", { ascending: false });

  if (dateFrom) {
    query = query.gte("created_at", `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59`);
  }
  if (person) {
    query = query.ilike("created_by", `%${person}%`);
  }
  if (itemCode) {
    query = query.ilike("item_code", `%${itemCode}%`);
  }

  const { data, error } = await query;

  queryButton.disabled = false;

  if (error) {
    if (error.code === "42501" || error.message.toLowerCase().includes("permission")) {
      setMessage("查詢失敗：RLS 尚未開放 SELECT 權限，請參考頁面說明設定。", "error");
      return;
    }
    setMessage(`查詢失敗：${error.message}`, "error");
    return;
  }

  queryResults = data || [];
  setMessage("");
  renderPreview(queryResults);

  if (queryResults.length > 0) {
    exportButton.disabled = false;
  }
}

function renderPreview(rows) {
  previewBody.innerHTML = "";

  resultMeta.textContent = `共 ${rows.length} 筆記錄`;
  resultMeta.hidden = false;

  if (rows.length === 0) {
    setMessage("查無符合條件的資料。", "error");
    previewWrap.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.dataset.recordId = row.id ?? "";
    tr.innerHTML = `
      <td>${row.created_at ? formatDateTime(row.created_at) : ""}</td>
      <td>${esc(row.created_by)}</td>
      <td>${esc(row.item_code)}</td>
      <td>${esc(row.batch_no)}</td>
      <td>${row.weight_per_bucket ?? ""}</td>
      <td>${row.bucket_count ?? ""}</td>
      <td>${row.quantity ?? ""}</td>
      <td>${esc(row.location_code)}</td>
      <td>${esc(row.input_method)}</td>
      <td class="actions-cell">
        <button class="inline-action" type="button" data-action="edit" data-id="${escAttr(row.id ?? "")}" ${row.id == null ? "disabled" : ""}>
          ${row.id == null ? "缺少 id" : "編輯"}
        </button>
      </td>
    `;
    fragment.appendChild(tr);

    if (editingRecordId != null && String(row.id) === String(editingRecordId)) {
      fragment.appendChild(buildEditRow(row));
    }
  }
  previewBody.appendChild(fragment);
  previewWrap.hidden = false;
}

function buildEditRow(row) {
  const tr = document.createElement("tr");
  tr.className = "edit-row";
  tr.innerHTML = `
    <td colspan="10">
      <form class="edit-form" data-id="${escAttr(row.id ?? "")}">
        <label>
          建立人員
          <input name="created_by" type="text" maxlength="50" value="${escAttr(row.created_by ?? "")}" required>
        </label>
        <label>
          料號
          <input name="item_code" type="text" maxlength="100" value="${escAttr(row.item_code ?? "")}" required>
        </label>
        <label>
          批次
          <input name="batch_no" type="text" maxlength="100" value="${escAttr(row.batch_no ?? "")}" required>
        </label>
        <label>
          每桶重量(KG)
          <input name="weight_per_bucket" type="number" min="0.01" step="0.01" value="${escAttr(row.weight_per_bucket ?? "")}" required>
        </label>
        <label>
          桶數
          <input name="bucket_count" type="number" min="1" step="1" value="${escAttr(row.bucket_count ?? "")}" required>
        </label>
        <label>
          總數量(KG)
          <input name="quantity" type="number" min="0.01" step="0.01" value="${escAttr(row.quantity ?? "")}" readonly required>
        </label>
        <label class="location-field">
          儲位
          <input name="location_code" type="text" maxlength="50" value="${escAttr(row.location_code ?? "")}" required>
        </label>
        <div class="edit-actions">
          <button class="ghost-button" type="button" data-action="cancel-edit">取消</button>
          <button class="submit-button" type="submit">儲存修改</button>
        </div>
      </form>
    </td>
  `;
  return tr;
}

function handlePreviewClick(event) {
  const target = event.target.closest("button");

  if (!target) {
    return;
  }

  const { action, id } = target.dataset;

  if (action === "edit") {
    editingRecordId = id || null;
    renderPreview(queryResults);
    return;
  }

  if (action === "cancel-edit") {
    editingRecordId = null;
    renderPreview(queryResults);
  }
}

function handleEditInput(event) {
  const form = event.target.closest(".edit-form");

  if (!form) {
    return;
  }

  if (event.target.name !== "weight_per_bucket" && event.target.name !== "bucket_count") {
    return;
  }

  updateEditFormQuantity(form);
}

function updateEditFormQuantity(form) {
  const weightInput = form.querySelector('[name="weight_per_bucket"]');
  const bucketInput = form.querySelector('[name="bucket_count"]');
  const quantityInput = form.querySelector('[name="quantity"]');

  if (!weightInput || !bucketInput || !quantityInput) {
    return;
  }

  const weightPerBucket = Number(weightInput.value);
  const bucketCount = Number(bucketInput.value);

  if (
    Number.isFinite(weightPerBucket) &&
    weightPerBucket > 0 &&
    Number.isInteger(bucketCount) &&
    bucketCount > 0
  ) {
    quantityInput.value = formatQuantity(weightPerBucket * bucketCount);
    return;
  }

  quantityInput.value = "";
}

async function handleEditSubmit(event) {
  const form = event.target.closest(".edit-form");

  if (!form) {
    return;
  }

  event.preventDefault();

  if (!supabase) {
    setMessage("尚未設定 Supabase，無法更新。", "error");
    return;
  }

  const id = form.dataset.id;
  const formData = new FormData(form);
  const createdBy = formData.get("created_by")?.toString().trim();
  const itemCode = formData.get("item_code")?.toString().trim();
  const batchNo = formData.get("batch_no")?.toString().trim();
  const weightPerBucket = Number(formData.get("weight_per_bucket"));
  const bucketCount = Number(formData.get("bucket_count"));
  const quantity = Number(formData.get("quantity"));
  const locationCode = formData.get("location_code")?.toString().trim();
  const locationParts = parseLocationCode(locationCode);

  if (!id) {
    setMessage("缺少資料 id，無法更新。", "error");
    return;
  }

  if (
    !createdBy ||
    !itemCode ||
    !batchNo ||
    !locationCode ||
    !Number.isFinite(weightPerBucket) ||
    weightPerBucket <= 0 ||
    !Number.isInteger(bucketCount) ||
    bucketCount <= 0 ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    setMessage("請確認建立人員、料號、批次、每桶重量、桶數、總數量與儲位皆已正確填寫。", "error");
    return;
  }

  if (!locationParts) {
    setMessage("儲位格式錯誤，請使用 溫層-走道-樓層-版位，例如 F-01-1-1。", "error");
    return;
  }

  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  setMessage("更新中...");

  const { data, error } = await supabase
    .from("inventory_records")
    .update({
      created_by: createdBy,
      item_code: itemCode,
      batch_no: batchNo,
      weight_per_bucket: weightPerBucket,
      bucket_count: bucketCount,
      quantity,
      temp_zone: locationParts.tempZone,
      aisle: locationParts.aisle,
      level: locationParts.level,
      position: locationParts.position,
      location_code: locationCode,
    })
    .eq("id", id)
    .select("id, created_at, created_by, item_code, batch_no, weight_per_bucket, bucket_count, quantity, temp_zone, aisle, level, position, location_code, input_method")
    .single();

  if (submit) submit.disabled = false;

  if (error) {
    if (error.code === "42501" || error.message.toLowerCase().includes("permission")) {
      setMessage("更新失敗：RLS 尚未開放 UPDATE 權限，請先到 Supabase 新增 policy。", "error");
      return;
    }
    setMessage(`更新失敗：${error.message}`, "error");
    return;
  }

  queryResults = queryResults.map((row) => (String(row.id) === String(id) ? data : row));
  editingRecordId = null;
  renderPreview(queryResults);
  setMessage("資料已更新。", "success");
}

function esc(val) {
  if (val == null) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escAttr(val) {
  if (val == null) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatQuantity(value) {
  return Number.parseFloat(value.toFixed(2)).toString();
}

async function exportExcel() {
  if (!window.XLSX) {
    setMessage("Excel 匯出元件尚未載入，請稍後再試。", "error");
    return;
  }
  if (queryResults.length === 0) {
    setMessage("請先查詢後再匯出。", "error");
    return;
  }

  const rows = queryResults.map((row) => ({
    時間: row.created_at ? formatDateTime(row.created_at) : "",
    建立人員: row.created_by ?? "",
    料號: row.item_code ?? "",
    批次: row.batch_no ?? "",
    每桶重量KG: row.weight_per_bucket ?? "",
    桶數: row.bucket_count ?? "",
    數量: row.quantity ?? "",
    儲位: row.location_code ?? "",
    輸入方式: row.input_method ?? "",
  }));

  const workbook = window.XLSX.utils.book_new();
  const worksheet = window.XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 12 },
  ];

  window.XLSX.utils.book_append_sheet(workbook, worksheet, "inventory_records");
  const fileName = `inventory_records_${formatFileTimestamp(new Date())}.xlsx`;
  window.XLSX.writeFile(workbook, fileName);
  setMessage(`匯出成功：${fileName}`, "success");
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatFileTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hour}${minute}${second}`;
}

function parseLocationCode(locationCode) {
  const match = locationCode.match(/^([A-Za-z]+)-(\d+)-(\d+)-(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    tempZone: match[1].toUpperCase(),
    aisle: Number(match[2]),
    level: Number(match[3]),
    position: Number(match[4]),
  };
}
