import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allocationData,
  profitData,
  stockColor,
  stockColors,
} from "../src/lib/charts.js";
test("a portfolio-wide palette keeps stock colors distinct and stable when switching owners", () => {
  const all = [
    position(),
    position({ owner_id: 2, symbol: "GOOG" }),
    position({ symbol: "TSLA" }),
  ];
  const colors = stockColors(all);
  assert.equal(new Set(Object.values(colors)).size, 3);
  assert.equal(
    allocationData([all[0]], "4", "value", colors).items[0].color,
    allocationData(all, "4", "value", colors).items.find(
      (item) => item.name === "AAPL",
    ).color,
  );
});
const position = (overrides = {}) => ({
  owner_id: 1,
  market: "US",
  symbol: "AAPL",
  currency: "USD",
  quantity: "2",
  cost: "180",
  current_value: "200",
  unrealized_pl: "20",
  realized: "5",
  ...overrides,
});
test("allocation converts mixed currencies before calculating proportions and groups owners by stock", () => {
  const chart = allocationData(
    [
      position(),
      position({ owner_id: 2, current_value: "100" }),
      position({
        market: "MY",
        symbol: "1155",
        currency: "MYR",
        current_value: "600",
      }),
    ],
    "4",
  );
  assert.equal(chart.total, 1800);
  assert.equal(chart.items.length, 2);
  assert.equal(chart.items[0].name, "AAPL");
  assert.equal(chart.items[0].value, 1200);
  assert.ok(
    Math.abs(chart.items.reduce((sum, item) => sum + item.percent, 0) - 100) <
      0.000001,
  );
});
test("missing prices never silently renormalize the priced subset into a full portfolio", () => {
  const rows = [position(), position({ symbol: "TSLA", current_value: null })];
  assert.deepEqual(allocationData(rows, "4").items, []);
  assert.equal(allocationData(rows, "4").missing, 1);
  assert.equal(allocationData(rows, "4", "cost").items.length, 2);
  assert.deepEqual(allocationData(rows, null).items, []);
  assert.equal(allocationData(rows, null).fxMissing, true);
});
test("closed positions are excluded from allocation and remain in realized profit charts", () => {
  const closed = position({
    quantity: "0",
    cost: "0",
    current_value: "0",
    unrealized_pl: "0",
    realized: "-10",
  });
  assert.equal(allocationData([closed], "4").items.length, 0);
  assert.equal(profitData([closed], "4").items.length, 0);
  assert.equal(profitData([closed], "4", "realized").items[0].value, -40);
});
test("profit charts keep negative values, aggregate owners and preserve missing values", () => {
  const chart = profitData(
    [
      position(),
      position({ owner_id: 2, unrealized_pl: "-30" }),
      position({ symbol: "GOOG", unrealized_pl: "40" }),
    ],
    "4",
  );
  assert.equal(chart.items[0].name, "GOOG");
  assert.equal(chart.items[1].value, -40);
  assert.equal(profitData([position({ unrealized_pl: null })], "4").missing, 1);
  assert.equal(
    stockColor("US:AAPL"),
    allocationData([position()], "4").items[0].color,
  );
});
test("individual profit bars can show priced holdings while flagging an unpriced stock", () => {
  const result = profitData(
    [
      position(),
      position({
        symbol: "1155",
        market: "MY",
        currency: "MYR",
        unrealized_pl: null,
      }),
    ],
    "4",
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].value, 80);
  assert.equal(result.missing, 1);
});
