import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseBulk,
  exportHistory,
  summarize,
  BULK_TEMPLATE,
} from "../src/lib/tracker.js";
const owners = [
  { id: 1, owner_key: "mine" },
  { id: 2, owner_key: "father" },
];
test("bulk parser supports quoted commas, CRLF, BOM, TSV, fractions and leading-zero Bursa codes", () => {
  const rows = parseBulk(
    '\uFEFFowner,date,type,market,symbol,currency,quantity,price,fee,notes\r\nfather,2026-01-01,BUY,MY,0097,MYR,0.1,2,1,"a note, with commas"',
    owners,
  );
  assert.equal(rows[0].symbol, "0097");
  assert.equal(rows[0].notes, "a note, with commas");
  assert.equal(rows[0].owner_id, 2);
  assert.equal(
    parseBulk(
      "owner\tdate\ttype\tcurrency\tfee\tamount\nmine\t2026-01-01\tDEPOSIT\tMYR\t0\t500",
      owners,
    )[0].amount,
    "500",
  );
  assert.equal(parseBulk(BULK_TEMPLATE, owners).length, 2);
});
test("invalid rows are rejected before submission", () => {
  for (const input of [
    "",
    "owner,date,type,currency,fee\nunknown,2026-01-01,BUY,USD,1",
    "owner,date,type,currency,fee\nmine,2026-01-01,BUY,USD",
    'owner,date,type,currency,fee\nmine,2026-01-01,BUY,USD,"oops',
    "owner,date,type,currency,fee,unexpected\nmine,2026-01-01,BUY,USD,0,x",
  ])
    assert.throws(() => parseBulk(input, owners));
});
test("export round-trips records and protects spreadsheet formulas in notes", () => {
  const history = [
    {
      owner_id: 1,
      occurred_on: "2026-01-01",
      kind: "BUY",
      market: "US",
      symbol: "AAPL",
      currency: "USD",
      quantity: "0.1",
      price: "100",
      fee: "1",
      amount: "0",
      fx_rate: null,
      sequence: 0,
      notes: '=HYPERLINK("bad")',
    },
  ];
  const csv = exportHistory(history, owners);
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.equal(parseBulk(csv, owners)[0].quantity, "0.1");
});
test("combined totals keep unknown prices unknown and estimate cash at current FX", () => {
  const data = {
    owners,
    positions: [
      {
        owner_id: 1,
        currency: "USD",
        quantity: "1",
        cost: "100",
        current_value: null,
        quote: { status: "unavailable" },
      },
    ],
    accounts: [
      {
        owner_id: 1,
        currency: "MYR",
        balance: "500",
        contributions: "500",
        contributions_myr: "500",
        realized: "0",
        dividends: "0",
      },
      {
        owner_id: 1,
        currency: "USD",
        balance: "-100",
        contributions: "0",
        contributions_myr: "0",
        realized: "0",
        dividends: "0",
      },
    ],
    transactions: [],
    fx: { price: "4.5", status: "available" },
  };
  const result = summarize(data, "combined");
  assert.equal(result.cash, 50);
  assert.equal(result.value, null);
  assert.equal(result.equity, null);
  assert.equal(result.estimated, true);
  assert.equal(summarize(data, "father").equity, 0);
});
