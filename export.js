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
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let queryResults = [];

queryButton.addEventListener("click", runQuery);
exportButton.addEventListener("click", exportExcel);

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
    .select("created_at, created_by, item_code, batch_no, quantity, location_code, input_method")
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
    tr.innerHTML = `
      <td>${row.created_at ? formatDateTime(row.created_at) : ""}</td>
      <td>${esc(row.created_by)}</td>
      <td>${esc(row.item_code)}</td>
      <td>${esc(row.batch_no)}</td>
      <td>${row.quantity ?? ""}</td>
      <td>${esc(row.location_code)}</td>
      <td>${esc(row.input_method)}</td>
    `;
    fragment.appendChild(tr);
  }
  previewBody.appendChild(fragment);
  previewWrap.hidden = false;
}

function esc(val) {
  if (val == null) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
