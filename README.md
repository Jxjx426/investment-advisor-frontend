# My Investment Tracker frontend

Phase 1 of the existing React/Vite application rebuild. See [the backend guide](../Backend/README.md) for accounting rules, setup, current price coverage and remaining phases.

```powershell
npm run dev -- --host 127.0.0.1
```

Start the backend separately with `npm run demo` for sample data, or `npm start` for the private configured database. Development uses `/api`, with the prefix stripped by Vite's proxy before forwarding to port 3000. Production uses `VITE_API_BASE_URL` if set, otherwise the existing Render API address. The new frontend requires the matching Phase 1 backend; it is not deployed by this task.

The interface supports owner selection, open/closed holdings, fee-aware realized and unrealized P/L, MYR equity/cash estimates, cash and dividend entries, corrections and audit history, bulk entry preview and import, manual quote fallback, and history export. Research tools are preserved in source for Phase 3 reconnection.

The redesigned dashboard uses a compact dark layout with an allocation donut and interactive profit/loss bars. Allocation converts all values to MYR before calculating percentages, groups matching stocks across owners, and excludes closed positions. If a current price is missing, the default view is explicitly Cost; choosing Value leaves incomplete allocation unavailable. Profit bars may show individually priced stocks while flagging unpriced ones. Both chart types use current FX for their MYR equivalents. Stock colors remain consistent across owner filters. Optional transaction fields are under More; data-quality notes are collapsed.

`npm test` checks bulk parsing, export safety, owner filtering and unavailable valuations. `npm run build` produces the Vite bundle. Browser checks covered desktop and mobile layouts, login, bulk preview and correction save/recalculation. The demo login is documented in the backend guide and never accesses real records.
