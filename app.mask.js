(function () {
  const TEMP_ZONE_BY_LABEL = {
    "冷藏": "F",
    "常溫": "G",
  };

  const MASK_FACTORY_RULES = [
    { category: "A", start: 1, end: 10, versions: 3, levels: 3, temp: "常溫" },
    { category: "A", start: 11, end: 26, versions: 3, levels: 3, temp: "常溫" },
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

  let scannedLocationCode = "";

  function formatMaskItem(value) {
    return String(value).padStart(2, "0");
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

  function getMaskSeriesOptions() {
    return [...new Set(MASK_FACTORY_RULES.map((rule) => rule.category))];
  }

  function getMaskLocationOptions(series = "") {
    return MASK_FACTORY_RULES.filter((rule) => !series || rule.category === series).flatMap((rule) => {
      const options = [];

      for (let item = rule.start; item <= rule.end; item += 1) {
        const code = `${rule.category}${formatMaskItem(item)}`;
        options.push({ value: code, label: code });
      }

      return options;
    });
  }

  function getLocationCode({ aisle, level, position }) {
    return aisle && level && position ? `${aisle}-${formatMaskItem(level)}-${position}` : "-";
  }

  function clearState() {
    scannedLocationCode = "";
  }

  function applySelectedMaskLocationRule(ctx) {
    const rule = getMaskLocationRule(ctx.aisleSelect.value);

    if (!rule) {
      ctx.resetTempZoneOptions();
      ctx.initializeSelect(ctx.levelSelect, 3, { padStart: 2, placeholder: "請選擇樓層" });
      ctx.initializeSelect(ctx.positionSelect, 3, { placeholder: "請選擇版位" });
      ctx.maskRuleNote.textContent = "請先掃面膜儲位條碼，再掃原物料 QR。";
      ctx.updateLocationCode();
      return;
    }

    const previousLevel = ctx.levelSelect.value;
    const previousPosition = ctx.positionSelect.value;
    const tempZone = TEMP_ZONE_BY_LABEL[rule.temp];
    ctx.maskSeriesSelect.value = rule.category;
    ctx.setSelectOptions(
      ctx.tempZoneSelect,
      tempZone ? [{ value: tempZone, label: rule.temp }] : [],
      "請選擇溫層"
    );
    ctx.tempZoneSelect.value = tempZone || "";
    ctx.initializeSelect(ctx.levelSelect, rule.levels, { padStart: 2, placeholder: "請選擇樓層" });
    ctx.initializeSelect(ctx.positionSelect, rule.versions, { placeholder: "請選擇版位" });
    ctx.levelSelect.value = Number(previousLevel) <= rule.levels ? previousLevel : "";
    ctx.positionSelect.value = Number(previousPosition) <= rule.versions ? previousPosition : "";
    ctx.maskRuleNote.textContent =
      `${ctx.aisleSelect.value}：${rule.temp}，最高 ${formatMaskItem(rule.levels)} 樓，${rule.versions} 版。`;
    ctx.handleLocationChange();
  }

  function setupMaskLocationSelects(ctx) {
    const currentAisle = ctx.aisleSelect.value;
    const currentSeries = parseMaskLocation(currentAisle)?.category || ctx.maskSeriesSelect.value;
    ctx.resetTempZoneOptions();
    ctx.maskSeriesSelect.value = getMaskSeriesOptions().includes(currentSeries) ? currentSeries : "";
    ctx.setSelectOptions(ctx.aisleSelect, getMaskLocationOptions(ctx.maskSeriesSelect.value), "請選擇走道位置");
    ctx.initializeSelect(ctx.levelSelect, 3, { padStart: 2, placeholder: "請選擇樓層" });
    ctx.initializeSelect(ctx.positionSelect, 3, { placeholder: "請選擇版位" });
    ctx.aisleSelect.value = getMaskLocationRule(currentAisle) ? currentAisle : "";
    ctx.levelSelect.value = "";
    ctx.positionSelect.value = "";
    applySelectedMaskLocationRule(ctx);
  }

  function parseScannedMaskLocation(rawText) {
    const normalized = String(rawText || "").trim();
    const segmentedMatch = normalized.match(
      /^([A-Ha-h])\s*(\d{1,2})(?:[\s-]+)(\d{1,2})(?:[\s-]+)(\d{1,2})$/
    );
    const compactFiveDigitMatch = normalized.match(/^([A-Ha-h])(\d{2})(\d{2})(\d)$/);
    const compactFourDigitMatch = normalized.match(/^([A-Ha-h])(\d{2})(\d)(\d)$/);
    const match = segmentedMatch || compactFiveDigitMatch || compactFourDigitMatch;

    if (!match) {
      return null;
    }

    const category = match[1].toUpperCase();
    const aisleNumber = Number(match[2]);
    const level = Number(match[3]);
    const position = Number(match[4]);
    const aisle = `${category}${formatMaskItem(aisleNumber)}`;
    const rule = getMaskLocationRule(aisle);

    if (
      !rule ||
      aisleNumber < 1 ||
      level < 1 ||
      position < 1 ||
      level > rule.levels ||
      position > rule.versions
    ) {
      return null;
    }

    return {
      tempZone: TEMP_ZONE_BY_LABEL[rule.temp] || "",
      aisle,
      level: formatMaskItem(level),
      position: String(position),
      locationCode: getLocationCode({ aisle, level, position }),
      tempLabel: rule.temp,
    };
  }

  function applyScannedMaskLocation(ctx, location) {
    ctx.maskSeriesSelect.value = parseMaskLocation(location.aisle)?.category || "";
    ctx.setSelectOptions(ctx.aisleSelect, getMaskLocationOptions(ctx.maskSeriesSelect.value), "請選擇走道位置");
    ctx.aisleSelect.value = location.aisle;
    applySelectedMaskLocationRule(ctx);
    ctx.tempZoneSelect.value = location.tempZone;
    ctx.levelSelect.value = location.level;
    ctx.positionSelect.value = location.position;
    ctx.updateLocationCode();
    scannedLocationCode = location.locationCode;
    ctx.maskRuleNote.textContent = `${location.locationCode}：${location.tempLabel}，請再掃原物料 QR。`;
  }

  window.InventoryMask = {
    activate(ctx) {
      setupMaskLocationSelects(ctx);
    },

    clearState,

    handleMaskSeriesChange(ctx) {
      ctx.setSelectOptions(ctx.aisleSelect, getMaskLocationOptions(ctx.maskSeriesSelect.value), "請選擇走道位置");
      ctx.aisleSelect.value = "";
      ctx.levelSelect.value = "";
      ctx.positionSelect.value = "";
      applySelectedMaskLocationRule(ctx);
    },

    handleAisleChange(ctx) {
      applySelectedMaskLocationRule(ctx);
    },

    shouldPersistLocation() {
      return false;
    },

    getLocationCode,

    handleScannedPayload(ctx, rawText) {
      const scannedLocation = parseScannedMaskLocation(rawText);

      if (scannedLocation) {
        ctx.inputMethodInput.value = "manual";
        ctx.rawQrInput.value = "";
        ctx.scanDuplicateWarning.hidden = true;
        applyScannedMaskLocation(ctx, scannedLocation);
        ctx.setScannerStatus("已掃到面膜儲位條碼，請再掃原物料 QR。", "success");
        ctx.setMessage(`已帶入儲位 ${scannedLocation.locationCode}，請再掃原物料 QR。`, "success");
        return { handled: true, kind: "location" };
      }

      if (!scannedLocationCode) {
        ctx.inputMethodInput.value = "manual";
        ctx.rawQrInput.value = "";
        ctx.setScannerStatus("請先掃面膜儲位條碼，再掃原物料 QR。", "error");
        ctx.setMessage("面膜廠請先掃儲位條碼，例如 A18012、A3301 或 D01033。", "error");
        return { handled: true, kind: "missing-location" };
      }

      return { handled: false };
    },

    hasScannedLocation() {
      return Boolean(scannedLocationCode);
    },

    isLocationScan(rawText) {
      return Boolean(parseScannedMaskLocation(rawText));
    },

    prepareSubmit({ tempZone, aisle, level, position, setMessage }) {
      const rule = getMaskLocationRule(aisle);

      if (!rule) {
        setMessage("請先選擇正確的面膜走道位置。", "error");
        return { ok: false };
      }

      if (Number(level) > rule.levels || Number(position) > rule.versions) {
        setMessage("樓層或版位超出此面膜位置可用範圍。", "error");
        return { ok: false };
      }

      return {
        ok: true,
        tempZone: TEMP_ZONE_BY_LABEL[rule.temp] || tempZone,
        parsedAisle: parseMaskLocation(aisle)?.item ?? Number(aisle),
        locationCode: getLocationCode({ aisle, level, position }),
      };
    },

    afterSubmit(ctx) {
      clearState();
      setupMaskLocationSelects(ctx);
      ctx.updateLastLocationNote(null);
      ctx.maskRuleNote.textContent = "請先掃面膜儲位條碼，再掃原物料 QR。";
    },

    getIdleScannerText() {
      return "按下開始掃描後，請先掃面膜儲位條碼，再掃原物料 QR。";
    },

    getHardwareScannerText() {
      return "已切換為平板掃描槍模式，請先掃面膜儲位條碼，再掃原物料 QR。";
    },

    getCameraStartingText() {
      return "相機啟動中，請先對準面膜儲位條碼，再掃原物料 QR。";
    },
  };
})();
