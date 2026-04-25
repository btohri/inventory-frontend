(function () {
  function resetLocationSelectRanges(ctx) {
    ctx.initializeSelect(ctx.aisleSelect, 20, { padStart: 2, placeholder: "請選擇走道位置" });
    ctx.initializeSelect(ctx.levelSelect, 3, { placeholder: "請選擇樓層" });
    ctx.initializeSelect(ctx.positionSelect, 3, { placeholder: "請選擇版位" });
  }

  function getLocationCode({ tempZone, aisle, level, position }) {
    return tempZone && aisle && level && position ? `${tempZone}-${aisle}-${level}-${position}` : "-";
  }

  window.InventoryFood = {
    activate(ctx) {
      ctx.maskSeriesSelect.value = "";
      ctx.resetTempZoneOptions();
      resetLocationSelectRanges(ctx);
    },

    clearState() {},

    handleMaskSeriesChange() {},

    handleAisleChange(ctx) {
      ctx.handleLocationChange();
    },

    shouldPersistLocation() {
      return true;
    },

    getLocationCode,

    handleScannedPayload() {
      return { handled: false };
    },

    hasScannedLocation() {
      return false;
    },

    isLocationScan() {
      return false;
    },

    prepareSubmit({ tempZone, aisle, level, position }) {
      return {
        ok: true,
        tempZone,
        parsedAisle: Number(aisle),
        locationCode: getLocationCode({ tempZone, aisle, level, position }),
      };
    },

    afterSubmit(ctx) {
      ctx.restoreLastLocation();
    },

    getIdleScannerText() {
      return "按下開始掃描後，允許相機權限即可使用。";
    },

    getHardwareScannerText() {
      return "已切換為平板掃描槍模式。";
    },

    getCameraStartingText() {
      return "相機啟動中，請將 QR Code 對準畫面。";
    },
  };
})();
