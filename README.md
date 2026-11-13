# My Investment Tracker frontend

Phase 2 of the existing React/Vite application rebuild. See [the backend guide](../Backend/README.md) for accounting rules, setup, current price coverage and remaining phases. Current work is on `rebuild/phase-2-records`.

Phase 2 adds exchanges, owner cash transfers, explicit dividend withholding, later tax payments, splits and opening balances to the existing Add/Edit dialog. Cash -> Ledger shows both legs of exchanges and incoming owner transfers; Cash -> Reconcile compares Mine + Dad with manually entered Moomoo balances and shares. Reconciliation has its own combined scope and does not inherit the selected owner filter. Unknown broker quantities are blank; omitted holdings become zero only when the user explicitly marks the broker list complete. All new record fields round-trip through CSV and reviewed JSON imports.

```powershell
npm run dev -- --host 127.0.0.1
```

For your imported records, run `npm run preview` from `C:\Investment-advisor\Backend`; it starts the private local backend and the development page at http://127.0.0.1:5173. Keep that terminal running.

To view the production build locally, run `npm run preview` in the frontend as well, then open http://localhost:4173. This command rebuilds first so it cannot silently serve an old bundle. It still needs the local backend on port 3000. Both development and local preview send `/api` to that backend; Vercel uses the `/api` rewrite in `vercel.json` to reach Render. `VITE_API_BASE_URL` can explicitly override this before building. Local and cloud accounts are separate. The rebuilt application has not been deployed by this task.

The interface supports owner selection, open/closed holdings, fee-aware realized and unrealized P/L, MYR equity/cash estimates, cash and dividend entries, corrections and audit history, bulk entry preview and import, manual quote fallback, and history export. Research tools are preserved in source for Phase 3 reconnection.

The redesigned dashboard uses a compact dark layout with an allocation donut and interactive profit/loss bars. Allocation converts all values to MYR before calculating percentages, groups matching stocks across owners, and excludes closed positions. If a current price is missing, the default view is explicitly Cost; choosing Value leaves incomplete allocation unavailable. Profit bars may show individually priced stocks while flagging unpriced ones. Both chart types use current FX for their MYR equivalents. Stock colors remain consistent across owner filters. Optional transaction fields are under More; data-quality notes are collapsed.

`npm test` checks bulk parsing, export safety, owner filtering and unavailable valuations. `npm run build` produces the Vite bundle. Browser checks covered desktop and mobile layouts, login, bulk preview and correction save/recalculation. The demo login is documented in the backend guide and never accesses real records.
