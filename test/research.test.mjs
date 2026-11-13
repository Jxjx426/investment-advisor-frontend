import { test } from "node:test";
import assert from "node:assert/strict";
import { chartPoints, periodChange, researchStocks } from "../src/lib/research.js";
test("research picker deduplicates owners but distinguishes markets and excludes closed positions", () => {
  assert.deepEqual(researchStocks([{ market: "US", symbol: "TSLA", quantity: "2" }, { market: "US", symbol: "TSLA", quantity: "26" }, { market: "MY", symbol: "1155", quantity: "200" }, { market: "US", symbol: "TSLL", quantity: "0" }]), [{ market: "MY", symbol: "1155" }, { market: "US", symbol: "TSLA" }]);
});
test("chart average waits for seven observations and period return stays unavailable with one point", () => {
  const points = chartPoints(Array.from({ length: 8 }, (_, i) => ({ date: `2026-11-${10 + i}`, price: 10 + i })));
  assert.equal(points[5].ma, null); assert.equal(points[6].ma, 13); assert.equal(points[7].ma, 14);
  assert.ok(Math.abs(periodChange(points) - 70) < 0.00001);
  assert.equal(periodChange(points.slice(0, 1)), null); assert.equal(periodChange([]), null);
});
