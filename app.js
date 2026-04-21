import {
  getCreatedByOptions,
  LAST_CREATED_BY_KEY,
  PERSONNEL_STORAGE_KEY,
} from "./personnel-store.js";

const SUPABASE_URL = "https://tgotcbnbjfmnapwiwgsf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1CC439uRVnJKsPIiZE6u7w_3VenN1Li";
const LAST_LOCATION_KEY = "inventory-last-location";
const LAST_SCAN_KEY = "inventory-last-scan";
const DUPLICATE_SCAN_WINDOW_MS = 8000;

const form = document.querySelector("#inventory-form");
const submitButton = document.querySelector("#submitButton");
const messageBox = document.querySelector("#form-message");
const locationCodeLabel = document.querySelector("#locationCode");
const connectionStatus = document.querySelector("#connection-status");
const connectionStatusText = document.querySelector("#connection-status-text");
const createdBySelect = document.querySelector("#createdBy");
const itemCodeInput = document.querySelector("#itemCode");
const batchNoInput = document.querySelector("#batchNo");
const quantityInput = document.querySelector("#quantity");
const inputMethodInput = document.querySelector("#inputMethod");
const rawQrInput = document.querySelector("#rawQr");
const startScanButton = document.querySelector("#startScanButton");
const stopScanButton = document.querySelector("#stopScanButton");
const scannerStatus = document.querySelector("#scanner-status");
const qrReader = document.querySelector("#qr-reader");
const scanResult = document.querySelector("#scan-result");
const scanResultText = document.querySelector("#scan-result-text");
const scanDuplicateWarning = document.querySelector("#scan-duplicate-warning");
const lastLocationNote = document.querySelector("#last-location-note");

const tempZoneSelect = document.querySelector("#tempZone");
const aisleSelect = document.querySelector("#aisle");
const levelSelect = document.querySelector("#level");
const positionSelect = document.querySelector("#position");

let html5QrCode = null;
let isScannerRunning = false;

const hasSupabaseConfig =
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

const supabase = hasSupabaseConfig
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

initializeCreatedBySelect();
initializeSelect(aisleSelect, 20, { padStart: 2, placeholder: "請選擇走道位置" });
initializeSelect(levelSelect, 3, { placeholder: "請選擇樓層" });
initializeSelect(positionSelect, 3, { placeholder: "請選擇版位" });
restoreLastLocation();
updateLocationCode();
updateConnectionStatus();

tempZoneSelect.addEventListener("change", handleLocationChange);
aisleSelect.addEventListener("change", handleLocationChange);
levelSelect.addEventListener("change", handleLocationChange);
positionSelect.addEventListener("change", handleLocationChange);
form.addEventListener("submit", handleSubmit);
startScanButton.addEventListener("click", startScanner);
stopScanButton.addEventListener("click", stopScanner);
window.addEventListener("pageshow", refreshCreatedBySelect);
window.addEventListener("focus", refreshCreatedBySelect);
window.addEventListener("storage", handleStorageChange);

function initializeCreatedBySelect() {
  refreshCreatedBySelect();
}

function refreshCreatedBySelect() {
  const createdByOptions = getCreatedByOptions();
  const currentValue = createdBySelect.value;
  const lastCreatedBy = window.localStorage.getItem(LAST_CREATED_BY_KEY);
  createdBySelect.innerHTML = '<option value="">請選擇建立人員</option>';

  for (const name of createdByOptions) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    createdBySelect.append(option);
  }

  if (currentValue && createdByOptions.includes(currentValue)) {
    createdBySelect.value = currentValue;
    return;
  }

  if (lastCreatedBy && createdByOptions.includes(lastCreatedBy)) {
    createdBySelect.value = lastCreatedBy;
  }
}

function handleStorageChange(event) {
  if (event.key === PERSONNEL_STORAGE_KEY || event.key === LAST_CREATED_BY_KEY) {
    refreshCreatedBySelect();
  }
}

function initializeSelect(element, max, options = {}) {
  const { placeholder = "請選擇", padStart = 0 } = options;
  element.innerHTML = `<option value="">${placeholder}</option>`;

  for (let value = 1; value <= max; value += 1) {
    const raw = String(value);
    const normalized = padStart ? raw.padStart(padStart, "0") : raw;
    const option = document.createElement("option");
    option.value = normalized;
    option.textContent = normalized;
    element.append(option);
  }
}

function handleLocationChange() {
  updateLocationCode();
  persistCurrentLocation();
}

function updateLocationCode() {
  const tempZone = tempZoneSelect.value;
  const aisle = aisleSelect.value;
  const level = levelSelect.value;
  const position = positionSelect.value;

  const locationCode =
    tempZone && aisle && level && position
      ? `${tempZone}-${aisle}-${level}-${position}`
      : "-";

  locationCodeLabel.textContent = locationCode;
}

function persistCurrentLocation() {
  const location = {
    tempZone: tempZoneSelect.value,
    aisle: aisleSelect.value,
    level: levelSelect.value,
    position: positionSelect.value,
  };

  if (!location.tempZone || !location.aisle || !location.level || !location.position) {
    return;
  }

  window.localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location));
  updateLastLocationNote(location);
}

function restoreLastLocation() {
  try {
    const raw = window.localStorage.getItem(LAST_LOCATION_KEY);

    if (!raw) {
      return;
    }

    const location = JSON.parse(raw);

    tempZoneSelect.value = location.tempZone || "";
    aisleSelect.value = location.aisle || "";
    levelSelect.value = location.level || "";
    positionSelect.value = location.position || "";
    updateLastLocationNote(location);
  } catch {
    // Ignore invalid saved location data.
  }
}

function updateLastLocationNote(location) {
  if (!location?.tempZone || !location?.aisle || !location?.level || !location?.position) {
    lastLocationNote.hidden = true;
    lastLocationNote.textContent = "";
    return;
  }

  lastLocationNote.hidden = false;
  lastLocationNote.textContent =
    `已自動帶入上次儲位：${location.tempZone}-${location.aisle}-${location.level}-${location.position}`;
}

function updateConnectionStatus() {
  connectionStatus.className = "status-chip";

  if (hasSupabaseConfig) {
    connectionStatus.classList.add("connected");
    connectionStatusText.textContent = "Supabase 已連線";
    return;
  }

  connectionStatus.classList.add("disconnected");
  connectionStatusText.textContent = "Supabase 未連線";
}

function setMessage(text, type = "") {
  messageBox.textContent = text;
  messageBox.className = "form-message";

  if (type) {
    messageBox.classList.add(type);
  }
}

function setScannerStatus(text, type = "") {
  scannerStatus.textContent = text;
  scannerStatus.className = "scanner-status";

  if (type) {
    scannerStatus.classList.add(type);
  }
}

function setScanningState(active) {
  isScannerRunning = active;
  qrReader.hidden = !active;
  startScanButton.disabled = active;
  stopScanButton.disabled = !active;
  document.body.classList.toggle("scan-mode", active);
}

async function startScanner() {
  if (isScannerRunning) {
    return;
  }

  scanDuplicateWarning.hidden = true;

  if (!window.Html5Qrcode) {
    setScannerStatus("掃描元件尚未載入完成，請稍後再試。", "error");
    return;
  }

  try {
    if (!html5QrCode) {
      html5QrCode = new window.Html5Qrcode("qr-reader");
    }

    setScanningState(true);
    setScannerStatus("相機啟動中，請將 QR Code 對準畫面。");

    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
      },
      onScanSuccess,
      () => {}
    );
  } catch (error) {
    setScanningState(false);
    setScannerStatus(`無法啟動相機：${error.message}`, "error");
  }
}

async function stopScanner() {
  if (!html5QrCode || !isScannerRunning) {
    setScanningState(false);
    return;
  }

  try {
    await html5QrCode.stop();
    await html5QrCode.clear();
  } catch {
    // Ignore cleanup errors and keep the UI responsive.
  }

  html5QrCode = null;
  setScanningState(false);
  setScannerStatus("掃描已停止。");
}

async function onScanSuccess(decodedText) {
  await stopScanner();

  if (isDuplicateScan(decodedText)) {
    scanDuplicateWarning.hidden = false;
    setScannerStatus("已擋下連續重複掃描，請確認是否同一張條碼。", "error");
    setMessage("偵測到短時間內重複掃描同一張條碼。", "error");
    return;
  }

  rememberScan(decodedText);
  inputMethodInput.value = "scan";
  rawQrInput.value = decodedText;
  scanResult.hidden = false;
  scanResultText.textContent = decodedText;
  scanDuplicateWarning.hidden = true;

  const parsed = parseQrPayload(decodedText);

  if (!parsed.itemCode || !parsed.batchNo || !parsed.quantity) {
    setScannerStatus("已掃描成功，但無法完整解析 T2 / T3 / T4，請手動確認欄位。", "error");
    setMessage("已帶入原始 QR 內容，請手動補齊料號、批次與數量。", "error");
    return;
  }

  itemCodeInput.value = parsed.itemCode;
  batchNoInput.value = parsed.batchNo;
  quantityInput.value = parsed.quantity;
  setScannerStatus("掃描成功，已自動帶入料號、批次與數量。", "success");
  setMessage("QR 解析成功，請確認儲位後送出建檔。", "success");
}

function parseQrPayload(rawText) {
  return {
    itemCode: extractQrField(rawText, "T2"),
    batchNo: extractQrField(rawText, "T3"),
    quantity: extractQrField(rawText, "T4"),
  };
}

function extractQrField(rawText, tag) {
  const patterns = [
    new RegExp(`${tag}\\s*[:=]\\s*([^\\n\\r,;|]+)`, "i"),
    new RegExp(`${tag}\\s+([^\\n\\r,;|]+)`, "i"),
    new RegExp(`${tag},([^\\n\\r,;|]+)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = rawText.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function rememberScan(rawText) {
  const record = { rawText, timestamp: Date.now() };
  window.localStorage.setItem(LAST_SCAN_KEY, JSON.stringify(record));
}

function isDuplicateScan(rawText) {
  try {
    const raw = window.localStorage.getItem(LAST_SCAN_KEY);

    if (!raw) {
      return false;
    }

    const lastScan = JSON.parse(raw);

    return (
      lastScan.rawText === rawText &&
      Date.now() - Number(lastScan.timestamp) < DUPLICATE_SCAN_WINDOW_MS
    );
  } catch {
    return false;
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!supabase) {
    setMessage("請先在 app.js 填入 SUPABASE_URL 與 SUPABASE_ANON_KEY。", "error");
    return;
  }

  const formData = new FormData(form);
  const itemCode = formData.get("itemCode")?.toString().trim();
  const batchNo = formData.get("batchNo")?.toString().trim();
  const quantity = Number(formData.get("quantity"));
  const tempZone = formData.get("tempZone")?.toString();
  const aisle = formData.get("aisle")?.toString();
  const level = formData.get("level")?.toString();
  const position = formData.get("position")?.toString();
  const createdBy = formData.get("createdBy")?.toString().trim();
  const rawQr = formData.get("rawQr")?.toString().trim() || null;

  if (!itemCode || !batchNo || !Number.isInteger(quantity) || quantity <= 0) {
    setMessage("請確認料號、批次與數量皆已正確填寫。", "error");
    return;
  }

  if (!createdBy) {
    setMessage("請先選擇建立人員。", "error");
    return;
  }

  if (!tempZone || !aisle || !level || !position) {
    setMessage("請完整選擇溫層、走道位置、樓層與版位。", "error");
    return;
  }

  const locationCode = `${tempZone}-${aisle}-${level}-${position}`;
  const payload = {
    item_code: itemCode,
    batch_no: batchNo,
    quantity,
    temp_zone: tempZone,
    aisle: Number(aisle),
    level: Number(level),
    position: Number(position),
    location_code: locationCode,
    input_method: rawQr ? "scan" : "manual",
    created_by: createdBy,
    raw_qr: rawQr,
  };

  submitButton.disabled = true;
  setMessage("資料送出中，請稍候...");

  const { error } = await supabase.from("inventory_records").insert(payload);

  submitButton.disabled = false;

  if (error) {
    setMessage(`寫入失敗：${error.message}`, "error");
    return;
  }

  window.localStorage.setItem(LAST_CREATED_BY_KEY, createdBy);
  persistCurrentLocation();
  setMessage(`建檔成功，儲位 ${locationCode} 已寫入資料庫。`, "success");
  form.reset();
  createdBySelect.value = createdBy;
  restoreLastLocation();
  inputMethodInput.value = "manual";
  rawQrInput.value = "";
  scanResult.hidden = true;
  scanResultText.textContent = "-";
  scanDuplicateWarning.hidden = true;
  updateLocationCode();
}
