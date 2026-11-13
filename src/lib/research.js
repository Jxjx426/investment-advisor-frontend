export function researchStocks(positions) {
  return [...new Map(positions.filter(item => Number(item.quantity) > 0).map(item => [`${item.market}:${item.symbol}`, { market: item.market, symbol: item.symbol }])).values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}
export function chartPoints(history) {
  return history.map((point, index) => ({ ...point, ma: index < 6 ? null : history.slice(index - 6, index + 1).reduce((sum, item) => sum + item.price, 0) / 7 }));
}
export function periodChange(points) {
  return points.length > 1 && points[0].price > 0 ? (points.at(-1).price / points[0].price - 1) * 100 : null;
}
