const SUPABASE_URL = "https://tgotcbnbjfmnapwiwgsf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1CC439uRVnJKsPIiZE6u7w_3VenN1Li";

const exportButton = document.querySelector("#exportButton");
const messageBox = document.querySelector("#export-message");

const hasSupabaseConfig =
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

const supabase = hasSupabaseConfig
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

exportButton.addEventListener("click", exportExcel);

function setMessage(text, type = "") {
  messageBox.textContent = text;
  messageBox.className = "form-message";

  if (type) {
    messageBox.classList.add(type);
  }
}

async function exportExcel() {
  if (!supabase) {
    setMessage("尚未設定 Supabase，無法匯出 Excel。", "error");
    return;
  }

  if (!window.XLSX) {
    setMessage("Excel 匯出元件尚未載入，請稍後再試。", "error");
    return;
  }

  exportButton.disabled = true;
  setMessage("資料匯出中，請稍候...");

  const { data, error } = await supabase
    .from("inventory_records")
    .select("created_at, created_by, item_code, batch_no, quantity, location_code, input_method")
    .order("created_at", { ascending: false });

  exportButton.disabled = false;

  if (error) {
    if (error.code === "42501" || error.message.toLowerCase().includes("permission")) {
      setMessage("匯出失敗：目前 RLS 可能尚未開放 SELECT 權限。", "error");
      return;
    }

    setMessage(`匯出失敗：${error.message}`, "error");
    return;
  }

  const rows = (data || []).map((row) => ({
    時間: row.created_at ? formatDateTime(row.created_at) : "",
    建立人員: row.created_by ?? "",
    料號: row.item_code ?? "",
    批次: row.batch_no ?? "",
    數量: row.quantity ?? "",
    儲位: row.location_code ?? "",
    輸入方式: row.input_method ?? "",
  }));

  if (rows.length === 0) {
    setMessage("目前沒有可匯出的資料。", "error");
    return;
  }

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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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
