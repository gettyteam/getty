const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isSafeHexColor(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return HEX_COLOR_RE.test(trimmed);
}

function normalizeHexColor(value, fallback) {
  const fb = typeof fallback === 'string' ? fallback : '';
  if (typeof value !== 'string') return fb;
  const trimmed = value.trim();
  if (!HEX_COLOR_RE.test(trimmed)) return fb;
  return trimmed.toLowerCase();
}

function normalizeHexColorOrEmpty(value, fallback = '') {
  const fb = typeof fallback === 'string' ? fallback : '';
  if (value === undefined) return fb;
  if (value === null) return fb;
  if (typeof value !== 'string') return fb;
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!HEX_COLOR_RE.test(trimmed)) return fb;
  return trimmed.toLowerCase();
}

const TIP_GOAL_GRADIENT_RE = /^linear-gradient\(\s*(?:(?:to\s+(?:right|left|top|bottom))|(?:\d{1,3}(?:\.\d+)?deg))\s*,\s*(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})(?:\s+\d{1,3}%\s*)?)(?:\s*,\s*(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})(?:\s+\d{1,3}%\s*)?)){1,5}\s*\)$/;

function normalizeTipGoalProgressColor(value, fallback) {
  const fb = typeof fallback === 'string' ? fallback : '';
  if (typeof value !== 'string') return fb;
  const trimmed = value.trim();
  if (!trimmed) return fb;
  if (HEX_COLOR_RE.test(trimmed)) return trimmed.toLowerCase();
  if (TIP_GOAL_GRADIENT_RE.test(trimmed)) return trimmed;
  return fb;
}

module.exports = {
  isSafeHexColor,
  normalizeHexColor,
  normalizeHexColorOrEmpty,
  normalizeTipGoalProgressColor,
};
