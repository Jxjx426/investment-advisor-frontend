import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseBulk,
  exportHistory,
  visibleLegs,
  summarize,
} from "../src/lib/tracker.js";
const owners = [
  { id: 1, owner_key: "mine" },
  { id: 2, owner_key: "father" },
];
test("Phase 2 CSV round trips exchange amounts, tax, split ratio and receiving owner", () => {
  const rows = [
    {
      owner_id: 1,
      occurred_on: "2026-01-01",
      kind: "FX",
      currency: "MYR",
      quantity: "0",
      price: "0",
      fee: "1",
      amount: "430",
      fx_rate: "4.3",
      sequence: 0,
      notes: "Estimate",
      target_currency: "USD",
      target_amount: "100",
      fx_estimated: 1,
      tax: "0",
      split_from: "0",
      split_to: "0",
    },
    {
      owner_id: 1,
      counterparty_owner_id: 2,
      occurred_on: "2026-01-02",
      kind: "TRANSFER",
      currency: "USD",
      quantity: "0",
      price: "0",
      fee: "0",
      amount: "10",
      sequence: 0,
      notes: "",
      tax: "0",
      split_from: "0",
      split_to: "0",
      target_amount: "0",
      fx_estimated: 0,
    },
  ];
  const parsed = parseBulk(exportHistory(rows, owners), owners);
  assert.equal(parsed[0].target_amount, "100");
  assert.equal(parsed[0].fx_estimated, 1);
  assert.equal(parsed[1].counterparty_owner_id, 2);
  assert.throws(() =>
    parseBulk(
      "owner,date,type,currency,fee,to_owner\nmine,2026-01-01,TRANSFER,USD,0,unknown",
      owners,
    ),
  );
});
test("incoming transfers appear in the receiving owner history with the positive cash leg", () => {
  const transfer = {
    owner_id: 1,
    counterparty_owner_id: 2,
    kind: "TRANSFER",
    cash_legs: [
      {
        owner_id: 1,
        currency: "MYR",
        cash_change: "-100",
        running_cash: "400",
      },
      { owner_id: 2, currency: "MYR", cash_change: "100", running_cash: "100" },
    ],
  };
  assert.equal(visibleLegs(transfer, 2)[0].cash_change, "100");
  assert.equal(visibleLegs(transfer, null).length, 2);
  const data = {
    phase: 2,
    owners,
    positions: [],
    accounts: [
      {
        owner_id: 2,
        currency: "MYR",
        balance: "100",
        contributions: "0",
        contributions_myr: "0",
        transfers: "100",
        realized: "0",
        dividends: "0",
      },
    ],
    transactions: [transfer],
    fx: null,
  };
  const father = summarize(data, "father");
  assert.equal(father.transactions.length, 1);
  assert.equal(father.totals.MYR.transfers, 100);
  assert.equal(father.contributions, 0);
  assert.equal(father.estimated, false);
});
test("exact USD cash is not labelled estimated merely because it uses current display FX", () => {
  const data = {
    phase: 2,
    owners,
    positions: [],
    accounts: [
      {
        owner_id: 1,
        currency: "USD",
        balance: "100",
        contributions: "0",
        contributions_myr: "0",
        realized: "0",
        dividends: "0",
        cash_estimated: false,
      },
    ],
    transactions: [],
    fx: { price: "4.3", status: "available" },
  };
  assert.equal(summarize(data, "mine").cash, 430);
  assert.equal(summarize(data, "mine").estimated, false);
  data.accounts[0].cash_estimated = true;
  assert.equal(summarize(data, "mine").estimated, true);
});
