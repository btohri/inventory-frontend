const SUPABASE_URL = "https://tgotcbnbjfmnapwiwgsf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1CC439uRVnJKsPIiZE6u7w_3VenN1Li";

const form = document.querySelector("#inventory-form");
const submitButton = document.querySelector("#submitButton");
const messageBox = document.querySelector("#form-message");
const locationCodeLabel = document.querySelector("#locationCode");
const connectionStatus = document.querySelector("#connection-status");

const tempZoneSelect = document.querySelector("#tempZone");
const aisleSelect = document.querySelector("#aisle");
const levelSelect = document.querySelector("#level");
const positionSelect = document.querySelector("#position");

const hasSupabaseConfig =
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

const supabase = hasSupabaseConfig
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

initializeSelect(aisleSelect, 20, { padStart: 2, placeholder: "請選擇道別" });
initializeSelect(levelSelect, 3, { placeholder: "請選擇樓層" });
initializeSelect(positionSelect, 3, { placeholder: "請選擇版位" });
updateLocationCode();
updateConnectionStatus();

tempZoneSelect.addEventListener("change", updateLocationCode);
aisleSelect.addEventListener("change", updateLocationCode);
levelSelect.addEventListener("change", updateLocationCode);
positionSelect.addEventListener("change", updateLocationCode);
form.addEventListener("submit", handleSubmit);

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

function updateConnectionStatus() {
  if (hasSupabaseConfig) {
    connectionStatus.textContent = "Supabase 已設定";
    return;
  }

  connectionStatus.textContent = "請先填入 Supabase 設定";
}

function setMessage(text, type = "") {
  messageBox.textContent = text;
  messageBox.className = "form-message";

  if (type) {
    messageBox.classList.add(type);
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
  const createdBy = formData.get("createdBy")?.toString().trim() || "anonymous";
  const inputMethod = formData.get("inputMethod")?.toString() || "manual";
  const rawQr = formData.get("rawQr")?.toString().trim() || null;

  if (!itemCode || !batchNo || !Number.isInteger(quantity) || quantity <= 0) {
    setMessage("請確認料號、批次與數量皆已正確填寫。", "error");
    return;
  }

  if (!tempZone || !aisle || !level || !position) {
    setMessage("請完整選擇溫層、道別、樓層與版位。", "error");
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
    input_method: inputMethod,
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

  setMessage(`建檔成功，儲位 ${locationCode} 已寫入資料庫。`, "success");
  form.reset();
  updateLocationCode();
}
