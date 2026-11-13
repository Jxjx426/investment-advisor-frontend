const COLORS = [
  "#4775ee",
  "#8d75df",
  "#20a6b5",
  "#efa75c",
  "#d879a0",
  "#6873bd",
  "#70c9e0",
  "#a99fee",
  "#e1bc83",
  "#b988bb",
];
export function stockColors(positions) {
  const keys = [
    ...new Set(
      positions.map((position) => `${position.market}:${position.symbol}`),
    ),
  ].sort();
  return Object.fromEntries(
    keys.map((key, index) => [key, COLORS[index % COLORS.length]]),
  );
}
export function stockColor(key) {
  return COLORS[
    [...key].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) %
      COLORS.length
  ];
}
export function toMyr(value, currency, fx) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  if (currency === "MYR") return Number(value);
  if (
    currency !== "USD" ||
    fx == null ||
    !Number.isFinite(Number(fx)) ||
    Number(fx) <= 0
  )
    return null;
  return Number(value) * Number(fx);
}
function group(positions, fx, field, openOnly, strict = true) {
  const result = new Map();
  let missing = 0,
    fxMissing = false;
  for (const position of positions) {
    if (openOnly && Number(position.quantity) <= 0) continue;
    if (field === "realized" && Number(position.realized) === 0) continue;
    const value = toMyr(position[field], position.currency, fx);
    if (position.currency === "USD" && toMyr(1, "USD", fx) == null)
      fxMissing = true;
    if (value == null) {
      missing++;
      continue;
    }
    const key = `${position.market}:${position.symbol}`;
    const item = result.get(key) || {
      key,
      name: position.symbol,
      value: 0,
      color: stockColor(key),
    };
    item.value += value;
    result.set(key, item);
  }
  // Allocation must represent the whole selected portfolio, never a priced subset.
  return {
    items: missing && strict ? [] : [...result.values()],
    missing,
    fxMissing,
  };
}
export function allocationData(positions, fx, basis = "value", colors = {}) {
  const result = group(
    positions,
    fx,
    basis === "cost" ? "cost" : "current_value",
    true,
  );
  const items = result.items
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return {
    ...result,
    total,
    items: items.map((item) => ({
      ...item,
      color: colors[item.key] || item.color,
      percent: total ? (item.value / total) * 100 : 0,
    })),
  };
}
export function profitData(positions, fx, kind = "unrealized") {
  const result = group(
    positions,
    fx,
    kind === "realized" ? "realized" : "unrealized_pl",
    kind !== "realized",
    false,
  );
  return { ...result, items: result.items.sort((a, b) => b.value - a.value) };
}
