import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { request } from "./api";
import LoginPage from "./pages/LoginPage";
import TransactionEditor from "./components/TransactionEditor";
import BulkEntry from "./components/BulkEntry";
import ManualPrice from "./components/ManualPrice";
import Reconciliation from "./components/Reconciliation";
import Icon from "./components/Icon";
import {
  exportHistory,
  kinds,
  money,
  shares,
  summarize,
  STOCK_KINDS,
  visibleLegs,
} from "./lib/tracker";
import { stockColors } from "./lib/charts";
import "./App.css";
import "./Phase2.css";

const AllocationChart = lazy(() => import("./components/AllocationChart"));
const ProfitChart = lazy(() => import("./components/ProfitChart"));
const Research = lazy(() => import("./components/Research"));

const tabs = [
  ["home", "Home"],
  ["trades", "Trades"],
  ["cash", "Cash"],
  ["research", "Research"],
];
const tone = (value) =>
  value == null
    ? ""
    : Number(value) < 0
      ? "negative"
      : Number(value) > 0
        ? "positive"
        : "";
const ownerLabel = (owners, id) =>
  owners.find((owner) => owner.id === id)?.owner_key === "father"
    ? "Dad"
    : "Mine";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const [owner, setOwner] = useState("mine"),
    [tab, setTab] = useState("home");
  const [editor, setEditor] = useState(null),
    [bulk, setBulk] = useState(false),
    [manualPrice, setManualPrice] = useState(null),
    [audit, setAudit] = useState(null);
  const [showClosed, setShowClosed] = useState(false),
    [filter, setFilter] = useState("");
  const [basis, setBasis] = useState(null),
    [profitKind, setProfitKind] = useState("unrealized");
  const [cashView, setCashView] = useState("ledger");
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setLoggedIn(false);
    setData(null);
    setEditor(null);
    setBulk(false);
    setManualPrice(null);
    setAudit(null);
    setError("");
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await request("/tracker"));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    window.addEventListener("session-expired", logout);
    return () => window.removeEventListener("session-expired", logout);
  }, [logout]);
  useEffect(() => {
    if (loggedIn) {
      void load();
      const timer = setInterval(load, 5 * 60 * 1000);
      return () => clearInterval(timer);
    }
  }, [loggedIn, load]);
  function saved() {
    setEditor(null);
    setBulk(false);
    setManualPrice(null);
    setAudit(null);
    void load();
  }
  function download() {
    const blob = new Blob(
      ["\uFEFF" + exportHistory(summary.transactions, data.owners)],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `investments-${owner}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function viewAudit(id) {
    try {
      setAudit({
        id,
        rows: await request(`/tracker/transactions/${id}/audit`),
      });
    } catch (error) {
      setError(error.message);
    }
  }
  async function backup() {
    try {
      const archive = await request("/backup");
      const url = URL.createObjectURL(new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `investments-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setError(error.message); }
  }
  if (!loggedIn) return <LoginPage onLoginSuccess={() => setLoggedIn(true)} />;
  const summary = data ? summarize(data, owner) : null;
  const colors = stockColors(data?.positions || []);
  const currencies = summary
    ? ["MYR", "USD"].filter((currency) =>
        summary.accounts.some((account) => account.currency === currency),
      )
    : ["MYR"];
  if (!currencies.length) currencies.push("MYR");
  const positions =
    summary?.positions.filter(
      (position) => showClosed || Number(position.quantity) > 0,
    ) || [];
  const records =
    summary?.transactions
      .filter((row) =>
        tab === "cash"
          ? !STOCK_KINDS.includes(row.kind)
          : STOCK_KINDS.includes(row.kind),
      )
      .filter(
        (row) =>
          !filter ||
          `${row.symbol} ${row.kind} ${row.notes}`
            .toLowerCase()
            .includes(filter.toLowerCase()),
      )
      .toReversed() || [];
  const quoteCount =
    summary?.positions.filter(
      (position) =>
        Number(position.quantity) > 0 && position.quote.status !== "available",
    ).length || 0;
  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={() => setTab("home")}>
          <Icon name="research" size={23} />
          <span>Investments</span>
        </button>
        <nav aria-label="Navigation">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              aria-current={tab === key ? "page" : undefined}
              aria-label={label}
              title={label}
              onClick={() => {
                setTab(key);
                setFilter("");
              }}
            >
              <Icon name={key} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Download records backup" title="Download records backup" onClick={backup}><Icon name="download" /></button>
          {data?.is_local && <span className="demo-badge">Local</span>}
          {data?.is_demo && (
            <span
              className="demo-badge"
              title="Sample data. Isolated local database."
            >
              Demo
            </span>
          )}
          <button
            className="icon-button"
            aria-label="Sign out"
            title="Sign out"
            onClick={logout}
          >
            <Icon name="logout" />
          </button>
        </div>
      </header>
      <main className="content">
        <div className="page-heading">
          <h1>
            {tab === "home"
              ? "Overview"
              : tabs.find((item) => item[0] === tab)?.[1]}
          </h1>
          {tab !== "research" && <div className="heading-actions">
            <button
              className="icon-button"
              aria-label="Refresh"
              title="Refresh"
              disabled={loading}
              onClick={load}
            >
              <Icon name="refresh" />
            </button>
            <button
              className="primary"
              disabled={!data}
              onClick={() =>
                setEditor({ kind: tab === "cash" ? "DEPOSIT" : "BUY" })
              }
            >
              <Icon name="add" />
              Add
            </button>
          </div>}
        </div>
        {!(tab === "cash" && cashView === "reconcile") && (
          <div className="owner-switch" role="group" aria-label="Portfolio">
            {[
              ["mine", "Mine"],
              ["father", "Dad"],
              ["combined", "All"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={owner === key}
                onClick={() => setOwner(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
            <button onClick={load}>Retry</button>
          </div>
        )}
        {!data && !error && (
          <div className="empty-state" role="status">
            Loading…
          </div>
        )}
        {data && (
          <>
            {tab !== "research" && !(tab === "cash" && cashView === "reconcile") &&
              (summary.estimated ||
                summary.incomplete ||
                summary.stale ||
                data.legacy_holdings_count > 0 ||
                data.funding_snapshots?.length > 0) && (
                <details className="data-status">
                  <summary>
                    {[
                      summary.estimated ? "Estimated MYR" : "",
                      quoteCount > 0
                        ? `${quoteCount} price${quoteCount > 1 ? "s" : ""} to review`
                        : summary.incomplete
                          ? "Pricing unavailable"
                          : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Details"}
                  </summary>
                  <div>
                    {data.funding_snapshots?.length > 0 && (
                      <p>Capital totals supplied; deposit dates unknown.</p>
                    )}
                    {summary.estimated && (
                      <p>
                        Cash uses current FX. Historical exchanges are missing.
                      </p>
                    )}
                    {data.fx?.price && (
                      <p>
                        USD 1 = {money(data.fx.price)} · {data.fx.status}
                      </p>
                    )}
                    {summary.incomplete && (
                      <p>
                        Missing quotes or FX keep affected totals unavailable.
                      </p>
                    )}
                    {quoteCount > 0 && (
                      <p>Manual / stale prices are marked in Holdings.</p>
                    )}
                    {data.legacy_holdings_count > 0 && (
                      <p>
                        {data.legacy_holdings_count} old holdings need
                        transaction entry.
                      </p>
                    )}
                  </div>
                </details>
              )}
            {tab === "home" && (
              <>
                <section
                  className="summary-strip"
                  aria-label="Portfolio totals"
                >
                  <div className="summary-total">
                    <span>Total{summary.estimated ? " ≈" : ""}</span>
                    <strong>{money(summary.equity)}</strong>
                  </div>
                  <div>
                    <span>Cash{summary.estimated ? " ≈" : ""}</span>
                    <strong>{money(summary.cash)}</strong>
                  </div>
                  <div>
                    <span>Realized P/L</span>
                    <NativeValue
                      totals={summary.totals}
                      currencies={currencies}
                      field="realized"
                    />
                  </div>
                  <div>
                    <span>Unrealized P/L</span>
                    <NativeValue
                      totals={summary.totals}
                      currencies={currencies}
                      field="unrealized"
                    />
                  </div>
                </section>
                <Suspense
                  fallback={<div className="chart-empty">Loading charts…</div>}
                >
                  <div className="charts-grid">
                    <AllocationChart
                      positions={summary.positions}
                      fx={data.fx?.price}
                      basis={
                        basis ??
                        (summary.positions.some(
                          (p) =>
                            Number(p.quantity) > 0 && p.current_value == null,
                        )
                          ? "cost"
                          : "value")
                      }
                      onBasisChange={setBasis}
                      colors={colors}
                    />
                    <ProfitChart
                      positions={summary.positions}
                      fx={data.fx?.price}
                      kind={profitKind}
                      onKindChange={setProfitKind}
                    />
                  </div>
                </Suspense>
                <section className="holdings-panel">
                  <div className="panel-heading">
                    <h2>
                      Holdings <span className="count">{positions.length}</span>
                    </h2>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={showClosed}
                        onChange={(event) =>
                          setShowClosed(event.target.checked)
                        }
                      />
                      Closed
                    </label>
                  </div>
                  {positions.length ? (
                    <div className="table-wrap">
                      <table className="holdings-table">
                        <thead>
                          <tr>
                            <th>Stock</th>
                            <th>Shares</th>
                            <th>Avg. cost</th>
                            <th>Value</th>
                            <th>P/L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {positions.map((position) => {
                            const closed = Number(position.quantity) === 0;
                            return (
                              <tr
                                key={`${position.owner_id}:${position.market}:${position.symbol}`}
                              >
                                <td>
                                  <div className="stock-label">
                                    <span
                                      className="color-dot"
                                      style={{
                                        background:
                                          colors[
                                            `${position.market}:${position.symbol}`
                                          ],
                                      }}
                                    />
                                    <div>
                                      <strong>{position.symbol}</strong>
                                      <small>
                                        {owner === "combined"
                                          ? `${ownerLabel(data.owners, position.owner_id)} · `
                                          : ""}
                                        {position.currency}
                                        {closed ? " · Closed" : ""}
                                      </small>
                                      <details className="mobile-cost">
                                        <summary>
                                          {shares(position.quantity)} shares
                                        </summary>
                                        <p>
                                          Avg.{" "}
                                          {money(
                                            position.average_cost,
                                            position.currency,
                                          )}
                                          <br />
                                          Cost{" "}
                                          {money(
                                            position.cost,
                                            position.currency,
                                          )}
                                        </p>
                                      </details>
                                    </div>
                                  </div>
                                </td>
                                <td>{shares(position.quantity)}</td>
                                <td>
                                  {money(
                                    position.average_cost,
                                    position.currency,
                                  )}
                                  <small>
                                    {money(position.cost, position.currency)}{" "}
                                    cost
                                  </small>
                                </td>
                                <td>
                                  {money(
                                    position.current_value,
                                    position.currency,
                                  )}
                                  {!closed &&
                                    (position.quote.status === "available" ? (
                                      <small title={quoteTime(position.quote)}>
                                        {money(
                                          position.quote.price,
                                          position.currency,
                                        )}{" "}
                                        / share
                                      </small>
                                    ) : (
                                      <button
                                        className="quote-button"
                                        title={quoteTime(position.quote)}
                                        onClick={() => setManualPrice(position)}
                                      >
                                        {position.quote.status === "unavailable"
                                          ? "Set price"
                                          : position.quote.status === "manual"
                                            ? "Manual"
                                            : "Stale"}
                                        <Icon name="edit" size={11} />
                                      </button>
                                    ))}
                                </td>
                                <td
                                  className={tone(
                                    closed
                                      ? position.realized
                                      : position.unrealized_pl,
                                  )}
                                >
                                  {money(
                                    closed
                                      ? position.realized
                                      : position.unrealized_pl,
                                    position.currency,
                                  )}
                                  {!closed &&
                                    position.unrealized_pl != null &&
                                    Number(position.cost) > 0 && (
                                      <small
                                        className={tone(position.unrealized_pl)}
                                      >
                                        {(
                                          (Number(position.unrealized_pl) /
                                            Number(position.cost)) *
                                          100
                                        ).toFixed(1)}
                                        %
                                      </small>
                                    )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      label="No holdings"
                      onAdd={() => setEditor({ kind: "BUY" })}
                      onImport={() => setBulk(true)}
                    />
                  )}
                </section>
              </>
            )}
            {tab === "cash" && (
              <div className="cash-subnav" role="group" aria-label="Cash view">
                {[
                  ["ledger", "Ledger"],
                  ["reconcile", "Reconcile"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={cashView === key}
                    onClick={() => setCashView(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {tab === "cash" && cashView === "reconcile" && <Reconciliation />}
            {(tab === "trades" ||
              (tab === "cash" && cashView === "ledger")) && (
              <>
                {tab === "cash" && (
                  <div className="cash-grid">
                    {["MYR", "USD"].map((currency) => (
                      <section key={currency} className="cash-panel">
                        <h2>{currency}</h2>
                        <strong className="cash-value">
                          {money(summary.totals[currency].cash, currency)}
                        </strong>
                        <dl>
                          <div>
                            <dt>Contributions</dt>
                            <dd>
                              {money(
                                summary.totals[currency].contributions,
                                currency,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Dividends</dt>
                            <dd>
                              {money(
                                summary.totals[currency].dividends,
                                currency,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Transfers</dt>
                            <dd>
                              {money(
                                summary.totals[currency].transfers,
                                currency,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Tax paid</dt>
                            <dd>
                              {money(summary.totals[currency].taxes, currency)}
                            </dd>
                          </div>
                        </dl>
                      </section>
                    ))}
                  </div>
                )}
                <section className="records-panel">
                  <div className="records-toolbar">
                    <input
                      aria-label="Search"
                      placeholder="Search"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                    />
                    <div>
                      <button onClick={() => setBulk(true)}>
                        <Icon name="upload" size={15} />
                        Import
                      </button>
                      <button
                        aria-label="Export CSV"
                        title="Export CSV"
                        disabled={!summary.transactions.length}
                        onClick={download}
                      >
                        <Icon name="download" size={15} />
                        <span className="desktop-label">Export</span>
                      </button>
                    </div>
                  </div>
                  {records.length ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>{tab === "cash" ? "Type" : "Stock"}</th>
                            {tab === "trades" && <th>Shares × price</th>}
                            <th>Cash change</th>
                            <th>{tab === "cash" ? "Balance" : "P/L"}</th>
                            <th>
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((row) => (
                            <tr key={row.id}>
                              <td>
                                {row.occurred_on}
                                {owner === "combined" && (
                                  <small>
                                    {ownerLabel(data.owners, row.owner_id)}
                                  </small>
                                )}
                              </td>
                              <td>
                                <strong>
                                  {tab === "cash"
                                    ? kinds[row.kind]
                                    : row.symbol}
                                </strong>
                                <small>
                                  {tab === "cash"
                                    ? row.kind === "TRANSFER"
                                      ? `${ownerLabel(data.owners, row.owner_id)} → ${ownerLabel(data.owners, row.counterparty_owner_id)}`
                                      : row.kind === "FX"
                                        ? `${row.currency} → ${row.target_currency}`
                                        : row.symbol || row.currency
                                    : kinds[row.kind]}
                                </small>
                              </td>
                              {tab === "trades" && (
                                <td>
                                  {row.kind === "SPLIT" ? (
                                    `${shares(row.split_from)} : ${shares(row.split_to)}`
                                  ) : row.kind === "OPENING_POSITION" ? (
                                    `${shares(row.quantity)} · ${money(row.amount, row.currency)} cost`
                                  ) : (
                                    <>
                                      {shares(row.quantity)} ×{" "}
                                      {money(row.price, row.currency)}
                                    </>
                                  )}
                                  <small>{row.currency}</small>
                                </td>
                              )}
                              <td className={tone(row.cash_change)}>
                                <CashLegValue
                                  row={row}
                                  ownerId={
                                    owner === "combined"
                                      ? null
                                      : data.owners.find(
                                          (item) => item.owner_key === owner,
                                        )?.id
                                  }
                                />
                              </td>
                              <td
                                className={
                                  tab === "cash" ? "" : tone(row.realized_pl)
                                }
                              >
                                {tab === "cash" ? (
                                  <CashLegValue
                                    row={row}
                                    ownerId={
                                      owner === "combined"
                                        ? null
                                        : data.owners.find(
                                            (item) => item.owner_key === owner,
                                          )?.id
                                    }
                                    balance
                                  />
                                ) : (
                                  money(row.realized_pl, row.currency)
                                )}
                              </td>
                              <td>
                                <div className="row-actions">
                                  <button
                                    className="icon-button"
                                    aria-label={`Edit record ${row.id}`}
                                    title="Edit"
                                    onClick={() => setEditor({ initial: row })}
                                  >
                                    <Icon name="edit" size={15} />
                                  </button>
                                  <button
                                    className="icon-button"
                                    aria-label={`History for record ${row.id}`}
                                    title="History"
                                    onClick={() => viewAudit(row.id)}
                                  >
                                    <Icon name="history" size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      label={filter ? "No results" : "No transactions"}
                      onAdd={() =>
                        setEditor({ kind: tab === "cash" ? "DEPOSIT" : "BUY" })
                      }
                      onImport={() => setBulk(true)}
                    />
                  )}
                </section>
              </>
            )}
            {tab === "research" && (
              <Suspense fallback={<div className="empty-state">Loading…</div>}><Research positions={summary.positions} /></Suspense>
            )}
          </>
        )}
      </main>
      {editor && data && (
        <TransactionEditor
          owners={data.owners}
          ownerKey={owner}
          initial={editor.initial}
          defaultKind={editor.kind}
          fx={data.fx?.price}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
      {bulk && data && (
        <BulkEntry
          owners={data.owners}
          onClose={() => setBulk(false)}
          onSaved={saved}
        />
      )}
      {manualPrice && data && (
        <ManualPrice
          position={manualPrice}
          onClose={() => setManualPrice(null)}
          onSaved={saved}
        />
      )}
      {audit && <AuditHistory audit={audit} onClose={() => setAudit(null)} />}
    </div>
  );
}
function NativeValue({ totals, currencies, field }) {
  return (
    <div className="native-values">
      {currencies.map((currency) => (
        <strong key={currency} className={tone(totals[currency][field])}>
          {money(totals[currency][field], currency)}
        </strong>
      ))}
    </div>
  );
}
function CashLegValue({ row, ownerId, balance = false }) {
  const legs = visibleLegs(row, ownerId);
  return legs.length ? (
    <div className="cash-legs">
      {legs.map((leg, index) => (
        <span key={index} className={balance ? "" : tone(leg.cash_change)}>
          {money(balance ? leg.running_cash : leg.cash_change, leg.currency)}
        </span>
      ))}
    </div>
  ) : (
    "—"
  );
}
function Empty({ label, onAdd, onImport }) {
  return (
    <div className="empty-state">
      <p>{label}</p>
      <div>
        <button onClick={onImport}>Import</button>
        <button className="primary" onClick={onAdd}>
          Add
        </button>
      </div>
    </div>
  );
}
function quoteTime(quote) {
  return [
    quote.source,
    quote.status,
    quote.quoted_at
      ? new Date(quote.quoted_at).toLocaleString("en-MY", {
          timeZone: "Asia/Kuala_Lumpur",
        })
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
function AuditHistory({ audit, onClose }) {
  const [dialog, setDialog] = useState(null);
  useEffect(() => {
    if (dialog) {
      dialog.showModal();
      return () => dialog.close();
    }
  }, [dialog]);
  const fields = {
    owner_id: "Owner",
    kind: "Type",
    occurred_on: "Date",
    symbol: "Stock",
    currency: "Currency",
    market: "Market",
    quantity: "Shares",
    price: "Price",
    fee: "Fee",
    amount: "Amount",
    fx_rate: "FX",
    sequence: "Order",
    notes: "Notes",
    tax: "Withholding",
    counterparty_owner_id: "To owner",
    target_currency: "Received currency",
    target_amount: "Received amount",
    split_from: "Old shares",
    split_to: "New shares",
    fx_estimated: "Estimated FX",
    voided: "Deleted",
  };
  return (
    <dialog
      ref={setDialog}
      className="editor"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <h2>History</h2>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {audit.rows.length ? (
        audit.rows.map((row, index) => {
          const before = JSON.parse(row.before_json) || {},
            after = JSON.parse(row.after_json) || {};
          return (
            <details key={index} className="audit-row">
              <summary>
                {row.action} ·{" "}
                {new Date(row.created_at).toLocaleString("en-MY", {
                  timeZone: "Asia/Kuala_Lumpur",
                })}
              </summary>
              <dl>
                {Object.entries(fields)
                  .filter(
                    ([key]) => before[key] !== after[key] && after[key] != null,
                  )
                  .map(([key, label]) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>
                        {before[key] != null ? `${before[key]} → ` : ""}
                        {String(after[key])}
                      </dd>
                    </div>
                  ))}
              </dl>
            </details>
          );
        })
      ) : (
        <p>No changes.</p>
      )}
    </dialog>
  );
}
