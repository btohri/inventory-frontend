const SUPABASE_URL = "https://tgotcbnbjfmnapwiwgsf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1CC439uRVnJKsPIiZE6u7w_3VenN1Li";
const LAST_CREATED_BY_KEY = "inventory-last-created-by";
const LAST_LOCATION_KEY = "inventory-last-location";
const LAST_SCAN_KEY = "inventory-last-scan";
const DUPLICATE_SCAN_WINDOW_MS = 8000;
const HARDWARE_SCAN_DEBOUNCE_MS = 180;
const FACTORIES = {
  food: "食品廠",
  mask: "面膜廠",
};
const TEMP_ZONE_BY_LABEL = {
  "冷藏": "F",
  "常溫": "G",
};
const MASK_FACTORY_RULES = [
  { category: "A", start: 1, end: 10, versions: 3, levels: 3, temp: "常溫" },
  { category: "A", start: 11, end: 26, versions: 1, levels: 3, temp: "常溫" },
  { category: "A", start: 27, end: 32, versions: 3, levels: 3, temp: "常溫" },
  { category: "A", start: 33, end: 33, versions: 1, levels: 2, temp: "常溫" },
  { category: "B", start: 1, end: 14, versions: 2, levels: 3, temp: "冷藏" },
  { category: "B", start: 15, end: 16, versions: 1, levels: 3, temp: "冷藏" },
  { category: "C", start: 1, end: 2, versions: 3, levels: 3, temp: "常溫" },
  { category: "C", start: 3, end: 8, versions: 1, levels: 2, temp: "常溫" },
  { category: "E", start: 1, end: 50, versions: 1, levels: 3, temp: "常溫" },
  { category: "D", start: 1, end: 18, versions: 3, levels: 3, temp: "常溫" },
  { category: "D", start: 19, end: 36, versions: 2, levels: 3, temp: "常溫" },
  { category: "D", start: 37, end: 58, versions: 3, levels: 3, temp: "常溫" },
  { category: "G", start: 1, end: 2, versions: 2, levels: 3, temp: "冷藏" },
  { category: "H", start: 1, end: 3, versions: 1, levels: 2, temp: "常溫" },
  { category: "F", start: 1, end: 2, versions: 3, levels: 3, temp: "常溫" },
];

const factorySelection = document.querySelector("#factory-selection");
const factoryChoiceButtons = document.querySelectorAll("[data-factory]");
const inventoryCard = document.querySelector("#inventory-card");
const activeFactoryLabel = document.querySelector("#activeFactoryLabel");
const changeFactoryButton = document.querySelector("#changeFactoryButton");
const form = document.querySelector("#inventory-form");
const submitButton = document.querySelector("#submitButton");
const messageBox = document.querySelector("#form-message");
const locationCodeLabel = document.querySelector("#locationCode");
const createdByInput = document.querySelector("#createdBy");
const itemCodeInput = document.querySelector("#itemCode");
const batchNoInput = document.querySelector("#batchNo");
const weightPerBucketInput = document.querySelector("#weightPerBucket");
const bucketCountInput = document.querySelector("#bucketCount");
const quantityInput = document.querySelector("#quantity");
const inputMethodInput = document.querySelector("#inputMethod");
const rawQrInput = document.querySelector("#rawQr");

const cameraModeButton = document.querySelector("#cameraModeButton");
const hardwareModeButton = document.querySelector("#hardwareModeButton");
const cameraScanPanel = document.querySelector("#camera-scan-panel");
const hardwareScanInput = document.querySelector("#hardwareScanInput");
const hardwareScanPanel = document.querySelector("#hardware-scan-panel");

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
const maskRulePanel = document.querySelector("#mask-rule-panel");
const maskRuleNote = document.querySelector("#maskRuleNote");

let html5QrCode = null;
let isScannerRunning = false;
let currentScanSource = "camera";
let hardwareScanTimer = null;
let currentFactory = "";

const hasSupabaseConfig =
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

const supabase = hasSupabaseConfig
  ? window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_ANON_KEY) ?? null
  : null;

restoreLastCreatedBy();
initializeSelect(aisleSelect, 20, { padStart: 2, placeholder: "請選擇走道位置" });
initializeSelect(levelSelect, 3, { placeholder: "請選擇樓層" });
initializeSelect(positionSelect, 3, { placeholder: "請選擇版位" });
restoreLastLocation();
showFactorySelection();
ensureDefaultBucketCount();
updateLocationCode();
setScanSource("camera");
updateComputedQuantity();

factoryChoiceButtons.forEach((button) => {
  button.addEventListener("click", () => setFactory(button.dataset.factory));
});
changeFactoryButton.addEventListener("click", showFactorySelection);
tempZoneSelect.addEventListener("change", handleLocationChange);
aisleSelect.addEventListener("change", handleAisleChange);
levelSelect.addEventListener("change", handleLocationChange);
positionSelect.addEventListener("change", handleLocationChange);
form.addEventListener("submit", handleSubmit);
weightPerBucketInput.addEventListener("input", updateComputedQuantity);
bucketCountInput.addEventListener("input", updateComputedQuantity);
startScanButton.addEventListener("click", startScanner);
stopScanButton.addEventListener("click", stopScanner);
cameraModeButton.addEventListener("click", () => setScanSource("camera"));
hardwareModeButton.addEventListener("click", () => setScanSource("hardware"));
hardwareScanInput.addEventListener("keydown", handleHardwareScanKeydown);
hardwareScanInput.addEventListener("input", handleHardwareScanInput);

function setFactory(factory) {
  if (!FACTORIES[factory]) {
    return;
  }

  currentFactory = factory;
  activeFactoryLabel.textContent = FACTORIES[factory];
  factorySelection.hidden = true;
  inventoryCard.hidden = false;
  document.body.classList.toggle("factory-mask", factory === "mask");
  document.body.classList.toggle("factory-food", factory === "food");
  maskRulePanel.hidden = factory !== "mask";

  if (factory === "mask") {
    setupMaskLocationSelects();
  } else {
    resetTempZoneOptions();
    resetLocationSelectRanges();
  }

  updateLocationCode();
}

function showFactorySelection() {
  currentFactory = "";
  factorySelection.hidden = false;
  inventoryCard.hidden = true;
  document.body.classList.remove("factory-mask", "factory-food");
  stopScanner();
}

function restoreLastCreatedBy() {
  const lastCreatedBy = window.localStorage.getItem(LAST_CREATED_BY_KEY);

  if (lastCreatedBy) {
    createdByInput.value = lastCreatedBy;
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

function resetLocationSelectRanges() {
  initializeSelect(aisleSelect, 20, { padStart: 2, placeholder: "請選擇走道位置" });
  initializeSelect(levelSelect, 3, { placeholder: "請選擇樓層" });
  initializeSelect(positionSelect, 3, { placeholder: "請選擇版位" });
}

function resetTempZoneOptions() {
  setSelectOptions(
    tempZoneSelect,
    [
      { value: "F", label: "F 冷藏" },
      { value: "G", label: "G 常溫" },
    ],
    "請選擇溫層"
  );
}

function setupMaskLocationSelects() {
  const currentAisle = aisleSelect.value;
  resetTempZoneOptions();
  setSelectOptions(aisleSelect, getMaskLocationOptions(), "請選擇走道位置");
  initializeSelect(levelSelect, 3, { padStart: 2, placeholder: "請選擇樓層" });
  initializeSelect(positionSelect, 3, { placeholder: "請選擇版位" });
  aisleSelect.value = getMaskLocationRule(currentAisle) ? currentAisle : "";
  levelSelect.value = "";
  positionSelect.value = "";
  applySelectedMaskLocationRule();
}

function handleAisleChange() {
  if (currentFactory === "mask") {
    applySelectedMaskLocationRule();
    return;
  }

  handleLocationChange();
}

function applySelectedMaskLocationRule() {
  const rule = getMaskLocationRule(aisleSelect.value);

  if (!rule) {
    resetTempZoneOptions();
    initializeSelect(levelSelect, 3, { padStart: 2, placeholder: "請選擇樓層" });
    initializeSelect(positionSelect, 3, { placeholder: "請選擇版位" });
    maskRuleNote.textContent = "請先選擇面膜走道位置，系統會依規則限制樓層與版位。";
    updateLocationCode();
    return;
  }

  const previousLevel = levelSelect.value;
  const previousPosition = positionSelect.value;
  const tempZone = TEMP_ZONE_BY_LABEL[rule.temp];
  setSelectOptions(
    tempZoneSelect,
    tempZone ? [{ value: tempZone, label: `${tempZone} ${rule.temp}` }] : [],
    "請選擇溫層"
  );
  tempZoneSelect.value = tempZone || "";
  initializeSelect(levelSelect, rule.levels, { padStart: 2, placeholder: "請選擇樓層" });
  initializeSelect(positionSelect, rule.versions, { placeholder: "請選擇版位" });
  levelSelect.value = Number(previousLevel) <= rule.levels ? previousLevel : "";
  positionSelect.value = Number(previousPosition) <= rule.versions ? previousPosition : "";
  maskRuleNote.textContent = `${aisleSelect.value}：${rule.temp}，最高 ${formatMaskItem(rule.levels)} 樓，${rule.versions} 版。`;
  handleLocationChange();
}

function setSelectOptions(element, options, placeholder) {
  element.innerHTML = `<option value="">${placeholder}</option>`;

  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = typeof item === "string" ? item : item.value;
    option.textContent = typeof item === "string" ? item : item.label;
    element.append(option);
  });
}

function getMaskLocationOptions() {
  return MASK_FACTORY_RULES.flatMap((rule) => {
    const options = [];

    for (let item = rule.start; item <= rule.end; item += 1) {
      const code = `${rule.category}${formatMaskItem(item)}`;
      options.push({ value: code, label: code });
    }

    return options;
  });
}

function getMaskLocationRule(location) {
  const parsed = parseMaskLocation(location);

  if (!parsed) {
    return null;
  }

  return MASK_FACTORY_RULES.find(
    (rule) =>
      rule.category === parsed.category &&
      parsed.item >= rule.start &&
      parsed.item <= rule.end
  ) || null;
}

function parseMaskLocation(location) {
  const match = String(location || "").match(/^([A-Z])(\d{2})$/);

  if (!match) {
    return null;
  }

  return {
    category: match[1],
    item: Number(match[2]),
  };
}

function formatMaskItem(value) {
  return String(value).padStart(2, "0");
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

  locationCodeLabel.textContent = getLocationCode({ tempZone, aisle, level, position });
}

function getLocationCode({ tempZone, aisle, level, position }) {
  if (currentFactory === "mask") {
    return aisle && level && position
      ? `${aisle}-${formatMaskItem(level)}-${position}`
      : "-";
  }

  return tempZone && aisle && level && position
    ? `${tempZone}-${aisle}-${level}-${position}`
    : "-";
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

function updateComputedQuantity() {
  const weightPerBucket = Number(weightPerBucketInput.value);
  const bucketCount = Number(bucketCountInput.value);

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

function formatQuantity(value) {
  return Number.parseFloat(value.toFixed(2)).toString();
}

function normalizeNumericInput(value) {
  if (value == null) {
    return "";
  }

  const match = String(value).match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : "";
}

function ensureDefaultBucketCount() {
  if (!bucketCountInput.value) {
    bucketCountInput.value = "1";
  }
}

function setScanSource(source) {
  currentScanSource = source;
  const isCamera = source === "camera";
  document.body.classList.toggle("scan-source-camera", isCamera);
  document.body.classList.toggle("scan-source-hardware", !isCamera);

  cameraModeButton.classList.toggle("active", isCamera);
  cameraModeButton.setAttribute("aria-pressed", String(isCamera));
  hardwareModeButton.classList.toggle("active", !isCamera);
  hardwareModeButton.setAttribute("aria-pressed", String(!isCamera));

  cameraScanPanel.hidden = false;
  hardwareScanPanel.hidden = isCamera;
  scannerStatus.hidden = !isCamera;
  startScanButton.hidden = !isCamera;
  stopScanButton.hidden = !isCamera;
  startScanButton.disabled = !isCamera || isScannerRunning;
  stopScanButton.disabled = !isCamera || !isScannerRunning;

  if (isCamera) {
    setScannerStatus("按下開始掃描後，允許相機權限即可使用。");
    clearHardwareScanBuffer();
  } else {
    stopScanner();
    setScannerStatus("已切換為平板掃描槍模式。");
    window.setTimeout(() => hardwareScanInput.focus(), 0);
  }
}

function setScanningState(active) {
  isScannerRunning = active;
  qrReader.hidden = !active;
  startScanButton.disabled = currentScanSource !== "camera" || active;
  stopScanButton.disabled = currentScanSource !== "camera" || !active;
  document.body.classList.toggle("camera-scan-active", active);
}

async function startScanner() {
  if (isScannerRunning || currentScanSource !== "camera") {
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

    await startQrReaderWithFallback();
    zoomPreviewVideo();
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

  if (currentScanSource === "camera") {
    setScannerStatus("掃描已停止。");
  }
}

async function onScanSuccess(decodedText) {
  await stopScanner();
  applyScannedPayload(decodedText, "camera");
}

function handleHardwareScanKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  processHardwareScanInput();
}

function handleHardwareScanInput() {
  window.clearTimeout(hardwareScanTimer);
  hardwareScanTimer = window.setTimeout(processHardwareScanInput, HARDWARE_SCAN_DEBOUNCE_MS);
}

function processHardwareScanInput() {
  window.clearTimeout(hardwareScanTimer);

  const rawText = hardwareScanInput.value.trim();

  if (!rawText) {
    return;
  }

  if (!hasRequiredHardwareQrTags(rawText)) {
    clearHardwareScanBuffer();
    scanDuplicateWarning.hidden = true;
    setScannerStatus("掃描槍格式錯誤，內容必須包含 T1 與 T2，請重新掃描。", "error");
    setMessage("掃描槍格式不正確，請確認條碼內容後重新掃描。", "error");
    hardwareScanInput.focus();
    return;
  }

  clearHardwareScanBuffer();
  applyScannedPayload(rawText, "hardware");
  hardwareScanInput.focus();
}

function clearHardwareScanBuffer() {
  hardwareScanInput.value = "";
}

function hasRequiredHardwareQrTags(rawText) {
  return hasQrTag(rawText, "T1") && hasQrTag(rawText, "T2");
}

function hasQrTag(rawText, tag) {
  return new RegExp(`${tag}(\\b|\\s*[:=,])`, "i").test(rawText);
}

function applyScannedPayload(rawText, source) {
  if (isDuplicateScan(rawText)) {
    scanDuplicateWarning.hidden = false;
    setScannerStatus("已擋下連續重複掃描，請確認是否同一張條碼。", "error");
    setMessage("偵測到短時間內重複掃描同一張條碼。", "error");
    return;
  }

  rememberScan(rawText);
  inputMethodInput.value = "scan";
  rawQrInput.value = rawText;
  scanResult.hidden = false;
  scanResultText.textContent = rawText;
  scanDuplicateWarning.hidden = true;

  const parsed = parseQrPayload(rawText);

  if (!parsed.itemCode || !parsed.batchNo || !parsed.quantity) {
    const sourceLabel = source === "hardware" ? "掃描槍" : "相機";
    setScannerStatus(`已收到${sourceLabel}掃描內容，但無法完整解析 T2 / T3 / T4。`, "error");
    setMessage("已帶入原始 QR 內容，請手動補齊料號、批次、每桶重量與桶數。", "error");
    return;
  }

  const normalizedWeight = normalizeNumericInput(parsed.quantity);

  if (!normalizedWeight) {
    setScannerStatus("掃描成功，但每桶重量格式無法辨識，請手動確認。", "error");
    setMessage("已帶入料號與批次，請手動補上每桶重量與桶數。", "error");
    itemCodeInput.value = parsed.itemCode;
    batchNoInput.value = parsed.batchNo;
    weightPerBucketInput.value = "";
    updateComputedQuantity();
    return;
  }

  itemCodeInput.value = parsed.itemCode;
  batchNoInput.value = parsed.batchNo;
  weightPerBucketInput.value = normalizedWeight;
  updateComputedQuantity();
  setScannerStatus("掃描成功，已自動帶入料號、批次與每桶重量。", "success");
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
  const weightPerBucket = Number(formData.get("weightPerBucket"));
  const bucketCount = Number(formData.get("bucketCount"));
  const quantity = Number(formData.get("quantity"));
  let tempZone = formData.get("tempZone")?.toString();
  const aisle = formData.get("aisle")?.toString();
  const level = formData.get("level")?.toString();
  const position = formData.get("position")?.toString();
  const createdBy = formData.get("createdBy")?.toString().trim();
  const rawQr = formData.get("rawQr")?.toString().trim() || null;

  if (
    !itemCode ||
    !batchNo ||
    !Number.isFinite(weightPerBucket) ||
    weightPerBucket <= 0 ||
    !Number.isInteger(bucketCount) ||
    bucketCount <= 0 ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    setMessage("請確認料號、批次、每桶重量、桶數與總數量皆已正確填寫。", "error");
    return;
  }

  if (!createdBy) {
    setMessage("請先輸入建立人員。", "error");
    return;
  }

  if (!tempZone || !aisle || !level || !position) {
    setMessage("請完整選擇溫層、走道位置、樓層與版位。", "error");
    return;
  }

  const maskLocationRule = currentFactory === "mask" ? getMaskLocationRule(aisle) : null;

  if (currentFactory === "mask") {
    if (!maskLocationRule) {
      setMessage("請先選擇正確的面膜走道位置。", "error");
      return;
    }

    if (Number(level) > maskLocationRule.levels || Number(position) > maskLocationRule.versions) {
      setMessage("樓層或版位超出此面膜位置可用範圍。", "error");
      return;
    }

    tempZone = TEMP_ZONE_BY_LABEL[maskLocationRule.temp] || tempZone;
  }

  const locationCode = getLocationCode({ tempZone, aisle, level, position });
  const parsedMaskLocation = currentFactory === "mask" ? parseMaskLocation(aisle) : null;
  const payload = {
    item_code: itemCode,
    batch_no: batchNo,
    weight_per_bucket: weightPerBucket,
    bucket_count: bucketCount,
    quantity,
    temp_zone: tempZone,
    aisle: parsedMaskLocation ? parsedMaskLocation.item : Number(aisle),
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
  createdByInput.value = createdBy;
  restoreLastLocation();
  ensureDefaultBucketCount();
  inputMethodInput.value = "manual";
  rawQrInput.value = "";
  scanResult.hidden = true;
  scanResultText.textContent = "-";
  scanDuplicateWarning.hidden = true;
  clearHardwareScanBuffer();
  updateComputedQuantity();
  if (currentFactory === "mask") {
    setupMaskLocationSelects();
  }
  updateLocationCode();

  if (currentScanSource === "hardware") {
    hardwareScanInput.focus();
  } else {
    setScannerStatus("按下開始掃描後，允許相機權限即可使用。");
  }
}

function getQrScannerConfig() {
  return {
    fps: 20,
    aspectRatio: 1,
    qrbox: (w, h) => {
      const size = Math.min(w, h) * 0.9;
      return { width: size, height: size };
    },
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true,
    },
  };
}

async function startQrReaderWithFallback() {
  const config = getQrScannerConfig();
  const cameraAttempts = [
    { facingMode: { exact: "environment" } },
    { facingMode: "environment" },
    { facingMode: "user" },
  ];

  let lastError = null;

  for (const cameraConfig of cameraAttempts) {
    try {
      await html5QrCode.start(cameraConfig, config, onScanSuccess, () => {});
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("找不到可用的相機。");
}

function zoomPreviewVideo() {
  const videoEl = document.querySelector("#qr-reader video");

  if (!videoEl) {
    return;
  }

  videoEl.style.transform = "scale(1.8)";
  videoEl.style.transformOrigin = "center center";
}
