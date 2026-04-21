export const PERSONNEL_STORAGE_KEY = "inventory-created-by-options";
export const LAST_CREATED_BY_KEY = "inventory-last-created-by";
export const DEFAULT_CREATED_BY_OPTIONS = ["王小明", "李小華", "陳小美"];

export function getCreatedByOptions() {
  try {
    const raw = window.localStorage.getItem(PERSONNEL_STORAGE_KEY);

    if (!raw) {
      return [...DEFAULT_CREATED_BY_OPTIONS];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [...DEFAULT_CREATED_BY_OPTIONS];
    }

    const normalized = parsed
      .map((value) => value?.toString().trim())
      .filter(Boolean);

    return normalized;
  } catch {
    return [...DEFAULT_CREATED_BY_OPTIONS];
  }
}

export function saveCreatedByOptions(options) {
  const normalized = [...new Set(options.map((value) => value.trim()).filter(Boolean))];
  window.localStorage.setItem(PERSONNEL_STORAGE_KEY, JSON.stringify(normalized));
}

export function addCreatedByOption(name) {
  const current = getCreatedByOptions();

  if (current.includes(name)) {
    return { ok: false, reason: "duplicate" };
  }

  saveCreatedByOptions([...current, name]);
  return { ok: true };
}

export function removeCreatedByOption(name) {
  const current = getCreatedByOptions();
  const next = current.filter((item) => item !== name);
  saveCreatedByOptions(next);

  if (window.localStorage.getItem(LAST_CREATED_BY_KEY) === name) {
    window.localStorage.removeItem(LAST_CREATED_BY_KEY);
  }
}
