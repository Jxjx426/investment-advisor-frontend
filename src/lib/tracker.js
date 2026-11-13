export const kinds = {
  BUY: "Buy",
  SELL: "Sell",
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  DIVIDEND: "Dividend",
  FX: "Exchange",
  TRANSFER: "Transfer",
  SPLIT: "Split",
  OPENING_CASH: "Opening cash",
  OPENING_POSITION: "Opening shares",
  TAX: "Tax",
};
export const STOCK_KINDS = ["BUY", "SELL", "SPLIT", "OPENING_POSITION"];
export const ENTRY_COLUMNS = [
  "owner",
  "date",
  "type",
  "market",
  "symbol",
  "currency",
  "quantity",
  "price",
  "fee",
  "amount",
  "fx_rate",
  "sequence",
  "notes",
  "to_owner",
  "target_currency",
  "target_amount",
  "tax",
  "split_from",
  "split_to",
  "fx_estimated",
];
export function visibleLegs(row, ownerId = null) {
  const legs = row.cash_legs ?? [
    {
      owner_id: row.owner_id,
      currency: row.currency,
      cash_change: row.cash_change,
      running_cash: row.running_cash,
    },
  ];
  return legs.filter((leg) => ownerId === null || leg.owner_id === ownerId);
}
export const money = (value, currency = "MYR") =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-MY", {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value));
export const shares = (value) =>
  new Intl.NumberFormat("en-MY", { maximumFractionDigits: 8 }).format(
    Number(value),
  );
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function summarize(data, owner) {
  const selected = (row) =>
    owner === "combined" ||
    data.owners.find((o) => o.owner_key === owner)?.id === row.owner_id;
  const positions = data.positions.filter(selected),
    accounts = data.accounts.filter(selected),
    transactions = data.transactions.filter(
      (row) =>
        selected(row) ||
        (owner !== "combined" &&
          row.counterparty_owner_id ===
            data.owners.find((o) => o.owner_key === owner)?.id),
    );
  const totals = Object.fromEntries(
    ["MYR", "USD"].map((currency) => {
      const ps = positions.filter(
          (p) => p.currency === currency && Number(p.quantity) > 0,
        ),
        as = accounts.filter((a) => a.currency === currency);
      const sum = (field) => as.reduce((s, a) => s + Number(a[field] ?? 0), 0);
      const value = ps.some((p) => p.current_value == null)
        ? null
        : ps.reduce((s, p) => s + Number(p.current_value), 0);
      const cost = ps.reduce((s, p) => s + Number(p.cost), 0);
      return [
        currency,
        {
          cash: sum("balance"),
          contributions: sum("contributions"),
          realized: sum("realized"),
          dividends: sum("dividends"),
          taxes: sum("taxes"),
          transfers: sum("transfers"),
          opening: sum("opening"),
          cost,
          value,
          unrealized: value == null ? null : value - cost,
        },
      ];
    }),
  );
  const fx = data.fx?.price == null ? null : Number(data.fx.price);
  const convert = (myr, usd) =>
    myr == null || usd == null
      ? null
      : usd === 0
        ? myr
        : fx == null
          ? null
          : myr + usd * fx;
  const cash = convert(totals.MYR.cash, totals.USD.cash);
  const value = convert(totals.MYR.value, totals.USD.value);
  const contributions = accounts.some((a) => a.contributions_myr == null)
    ? null
    : accounts.reduce((s, a) => s + Number(a.contributions_myr), 0);
  return {
    positions,
    accounts,
    transactions,
    totals,
    cash,
    value,
    contributions,
    equity: cash == null || value == null ? null : cash + value,
    estimated:
      accounts.some((account) => account.cash_estimated) ||
      (data.phase !== 2 && totals.USD.cash !== 0),
    incomplete:
      positions.some(
        (p) => Number(p.quantity) > 0 && p.quote.status === "unavailable",
      ) ||
      ((totals.USD.cash !== 0 ||
        positions.some(
          (p) => p.currency === "USD" && Number(p.quantity) > 0,
        )) &&
        fx === null),
    stale:
      positions.some(
        (p) =>
          Number(p.quantity) > 0 &&
          ["stale", "manual"].includes(p.quote.status),
      ) ||
      ((totals.USD.cash !== 0 ||
        positions.some(
          (p) => p.currency === "USD" && Number(p.quantity) > 0,
        )) &&
        ["stale", "manual"].includes(data.fx?.status)),
  };
}

// Supports quoted CSV fields, spreadsheet TSV, escaped quotes, CRLF and a UTF-8 BOM.
export function parseBulk(source, owners) {
  const input = source.replace(/^\uFEFF/, "").trim();
  if (!input)
    throw new Error("Paste a header row and at least one transaction.");
  const delimiter = input.split(/\r?\n/, 1)[0].includes("\t") ? "\t" : ",";
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (quoted || field === "") quoted = !quoted;
      else throw new Error("Invalid quote in a CSV field.");
    } else if (
      !quoted &&
      (char === delimiter || char === "\n" || char === "\r")
    ) {
      row.push(field.trim());
      field = "";
      if (char !== delimiter) {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (char === "\r" && input[i + 1] === "\n") i++;
      }
    } else field += char;
  }
  if (quoted) throw new Error("A quoted CSV field is not closed.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift().map((x) => x.toLowerCase());
  const required = ["owner", "date", "type", "currency", "fee"];
  if (required.some((x) => !headers.includes(x)))
    throw new Error(`Required columns: ${required.join(", ")}.`);
  const allowed = new Set([
    "owner",
    "date",
    "type",
    "market",
    "symbol",
    "currency",
    "quantity",
    "price",
    "fee",
    "amount",
    "fx_rate",
    "sequence",
    "notes",
    "to_owner",
    "target_currency",
    "target_amount",
    "tax",
    "split_from",
    "split_to",
    "fx_estimated",
  ]);
  if (
    new Set(headers).size !== headers.length ||
    headers.some((h) => !allowed.has(h))
  )
    throw new Error("Use unique column names from the template.");
  if (rows.length < 1 || rows.length > 500)
    throw new Error("Paste between 1 and 500 rows.");
  return rows.map((cells, i) => {
    if (cells.length !== headers.length)
      throw new Error(
        `Row ${i + 1}: expected ${headers.length} columns, found ${cells.length}.`,
      );
    const value = Object.fromEntries(headers.map((h, j) => [h, cells[j]]));
    const owner = owners.find((o) => o.owner_key === value.owner.toLowerCase());
    if (!owner) throw new Error(`Row ${i + 1}: owner must be mine or father.`);
    const recipient = value.to_owner
      ? owners.find((owner) => owner.owner_key === value.to_owner.toLowerCase())
      : null;
    if (value.to_owner && !recipient)
      throw new Error(`Row ${i + 1}: receiving owner must be mine or father.`);
    if (
      value.fx_estimated &&
      !["0", "1", "true", "false"].includes(value.fx_estimated.toLowerCase())
    )
      throw new Error(`Row ${i + 1}: FX estimate must be 0 or 1.`);
    return {
      ...value,
      owner_id: owner.id,
      occurred_on: value.date,
      kind: value.type.toUpperCase(),
      fee: value.fee || "0",
      sequence: value.sequence || 0,
      counterparty_owner_id: recipient?.id ?? null,
      tax: value.tax || "0",
      fx_estimated: ["1", "true"].includes(value.fx_estimated?.toLowerCase())
        ? 1
        : 0,
    };
  });
}
export const BULK_TEMPLATE =
  "owner,date,type,market,symbol,currency,quantity,price,fee,amount,fx_rate,sequence,notes\nmine,2026-01-01,DEPOSIT,,,MYR,,,0,5000,,0,Example only - replace with your records\nmine,2026-01-02,BUY,US,AAPL,USD,1,200,1,,,0,Example only";
export function exportHistory(rows, owners) {
  const headers = ENTRY_COLUMNS;
  const cell = (value) =>
    `"${String(value ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) =>
      [
        owners.find((o) => o.id === r.owner_id)?.owner_key,
        r.occurred_on,
        r.kind,
        r.market,
        r.symbol,
        r.currency,
        r.quantity,
        r.price,
        r.fee,
        r.amount,
        r.fx_rate,
        r.sequence,
        r.notes,
        owners.find((owner) => owner.id === r.counterparty_owner_id)?.owner_key,
        r.target_currency,
        r.target_amount,
        r.tax,
        r.split_from,
        r.split_to,
        r.fx_estimated ?? 0,
      ]
        .map(cell)
        .join(","),
    ),
  ].join("\r\n");
}
