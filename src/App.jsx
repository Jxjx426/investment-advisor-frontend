import { useCallback, useEffect, useState } from "react";
import { request } from "./api";
import LoginPage from "./pages/LoginPage";
import TransactionEditor from "./components/TransactionEditor";
import BulkEntry from "./components/BulkEntry";
import ManualPrice from "./components/ManualPrice";
import { exportHistory, kinds, money, shares, summarize } from "./lib/tracker";
import "./App.css";

const tabs = [
  ["home", "⌂", "Home"],
  ["trades", "⇄", "Trades"],
  ["cash", "▣", "Cash"],
  ["research", "◈", "Research"],
];
const tone = (value) =>
  value == null
    ? ""
    : Number(value) < 0
      ? "negative"
      : Number(value) > 0
        ? "positive"
        : "";
function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const [owner, setOwner] = useState("mine"),
    [tab, setTab] = useState("home"),
    [editor, setEditor] = useState(null),
    [bulk, setBulk] = useState(false);
  const [showClosed, setShowClosed] = useState(false),
    [filter, setFilter] = useState(""),
    [audit, setAudit] = useState(null);
  const [manualPrice, setManualPrice] = useState(null);
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setLoggedIn(false);
    setData(null);
    setEditor(null);
    setBulk(false);
    setAudit(null);
    setManualPrice(null);
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
  const saved = () => {
    setEditor(null);
    setBulk(false);
    setAudit(null);
    setManualPrice(null);
    void load();
  };
  function download() {
    const blob = new Blob(
      ["\uFEFF" + exportHistory(summary.transactions, data.owners)],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investment-history-${owner}.csv`;
    a.click();
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
  if (!loggedIn) return <LoginPage onLoginSuccess={() => setLoggedIn(true)} />;
  const summary = data ? summarize(data, owner) : null;
  const ownerName =
    owner === "combined"
      ? "Both portfolios"
      : owner === "mine"
        ? "My portfolio"
        : "Father's portfolio";
  const records = summary?.transactions
    .filter((r) =>
      tab === "cash"
        ? !["BUY", "SELL"].includes(r.kind)
        : ["BUY", "SELL"].includes(r.kind),
    )
    .filter(
      (r) =>
        !filter ||
        `${r.symbol} ${r.kind} ${r.notes}`
          .toLowerCase()
          .includes(filter.toLowerCase()),
    )
    .toReversed();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("home");
          }}
        >
          <span className="brand-mark">m.</span>
          <span>
            my investments<small>PERSONAL TRACKER</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {tabs.map(([key, icon, label]) => (
            <button
              key={key}
              className={tab === key ? "nav-item active" : "nav-item"}
              onClick={() => {
                setTab(key);
                setFilter("");
              }}
              aria-current={tab === key ? "page" : undefined}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
              {key === "research" && <small>03</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-label">
            <span className="status-dot" />
            Private workspace
          </div>
          <p>
            One account.
            <br />
            Two independent portfolios.
          </p>
          <button className="sign-out" onClick={logout}>
            Sign out ↗
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            PERSONAL FINANCE <span className="topbar-divider">/</span>{" "}
            {tabs.find((t) => t[0] === tab)?.[2]}
          </span>
          <span className="currency-label">
            MYR <span>BASE CURRENCY</span>
          </span>
          <button
            className="mobile-signout"
            onClick={logout}
            aria-label="Sign out"
          >
            ↗
          </button>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">A LITTLE CLARITY, EVERY DAY</p>
              <h1>
                {tab === "home"
                  ? "Your investments."
                  : tab === "trades"
                    ? "Every trade, accounted for."
                    : tab === "cash"
                      ? "Follow the money."
                      : "A space for perspective."}
              </h1>
              <p className="subtitle">
                {tab === "home"
                  ? "A clear view of what belongs to whom."
                  : tab === "trades"
                    ? "Buys, sells and the history behind your holdings."
                    : tab === "cash"
                      ? "Contributions, cash balances and dividends."
                      : "Your research tools will return in Phase 3."}
              </p>
            </div>
            <button
              className="primary add-top"
              disabled={!data}
              onClick={() =>
                setEditor({ kind: tab === "cash" ? "DEPOSIT" : "BUY" })
              }
            >
              ＋ Add transaction
            </button>
          </div>
          <div className="toolbar">
            <div
              className="owner-switch"
              role="group"
              aria-label="Portfolio owner"
            >
              {[
                ["mine", "Mine"],
                ["father", "Father's"],
                ["combined", "Combined"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={owner === key ? "selected" : ""}
                  aria-pressed={owner === key}
                  onClick={() => setOwner(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button className="refresh" disabled={loading} onClick={load}>
              {loading ? "Updating…" : "↻ Refresh"}
            </button>
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error} <button onClick={load}>Retry</button>
            </div>
          )}
          {!data && !error && (
            <div className="empty-state" role="status">
              Loading your private tracker…
            </div>
          )}
          {data && (
            <>
              {data.is_demo && (
                <div className="notice">
                  DEMO WORKSPACE · Sample data only. This does not use your
                  cloud database or real records.
                </div>
              )}
              {data.legacy_holdings_count > 0 && (
                <div className="notice">
                  Your {data.legacy_holdings_count} original holding records are
                  preserved. Enter their underlying trades here to assign owners
                  and calculate history.
                </div>
              )}
              {tab === "home" && (
                <>
                  <section className="overview-grid">
                    <div className="equity-card">
                      <div className="card-overline">
                        <span>{ownerName.toUpperCase()}</span>
                        <span className="light-pill">MYR</span>
                      </div>
                      <p>
                        {summary.estimated
                          ? "Estimated portfolio equity"
                          : "Portfolio equity"}
                      </p>
                      <div className="equity-number">
                        {money(summary.equity)}
                      </div>
                      <div className="equity-footer">
                        <span>Cash + current holdings</span>
                        <span>
                          {summary.incomplete
                            ? "Prices incomplete"
                            : summary.stale
                              ? "Last known prices"
                              : "Recorded portfolio"}
                        </span>
                      </div>
                    </div>
                    <div className="contribution-card">
                      <span className="card-icon">↙</span>
                      <p>Net contributions</p>
                      <h2>{money(summary.contributions)}</h2>
                      <span className="muted">Deposits minus withdrawals</span>
                      <div className="card-rule" />
                      <p className="small-copy">
                        Adding money grows your balance.
                        <br />
                        It doesn’t count as investment profit.
                      </p>
                    </div>
                  </section>
                  {(summary.estimated ||
                    summary.stale ||
                    summary.incomplete) && (
                    <div className="notice">
                      {summary.estimated &&
                        "MYR cash and equity use current FX as an estimate; actual exchange history is unavailable. "}
                      {summary.stale &&
                        "Some valuations use stale or manually entered prices; timestamps appear below. "}
                      {summary.incomplete &&
                        "Missing prices leave totals unavailable until pricing returns. "}
                      {data.fx?.price &&
                        `USD 1 = ${money(data.fx.price)} · ${data.fx.status} · ${new Date(data.fx.quoted_at).toLocaleString("en-MY")}`}
                    </div>
                  )}
                  <section className="stats-grid">
                    <Metric
                      label={
                        summary.estimated
                          ? "Estimated cash · MYR"
                          : "Available cash · MYR"
                      }
                      value={money(summary.cash)}
                      detail="Across your currency ledgers"
                    />
                    <Metric
                      label="Holdings value · MYR"
                      value={money(summary.value)}
                      detail="At the latest available prices"
                    />
                    <div className="metric">
                      <p>Realized trading P/L</p>
                      {["MYR", "USD"].map((c) => (
                        <strong
                          key={c}
                          className={tone(summary.totals[c].realized)}
                        >
                          {c} {money(summary.totals[c].realized, c)}
                        </strong>
                      ))}
                      <small>After buy and sell fees</small>
                    </div>
                    <div className="metric">
                      <p>Unrealized P/L</p>
                      {["MYR", "USD"].map((c) => (
                        <strong
                          key={c}
                          className={tone(summary.totals[c].unrealized)}
                        >
                          {c} {money(summary.totals[c].unrealized, c)}
                        </strong>
                      ))}
                      <small>In each holding's own currency</small>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="section-heading">
                      <div>
                        <p className="eyebrow">WHAT YOU OWN</p>
                        <h2>
                          Holdings{" "}
                          <span className="count">
                            {
                              summary.positions.filter(
                                (p) => Number(p.quantity) > 0,
                              ).length
                            }
                          </span>
                        </h2>
                      </div>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={showClosed}
                          onChange={(e) => setShowClosed(e.target.checked)}
                        />
                        Include closed
                      </label>
                    </div>
                    {summary.positions.filter(
                      (p) => showClosed || Number(p.quantity) > 0,
                    ).length > 0 ? (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Stock / owner</th>
                              <th>Shares</th>
                              <th>Avg. cost / total cost</th>
                              <th>Latest price</th>
                              <th>Value / unrealized P/L</th>
                              <th>Realized P/L</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.positions
                              .filter(
                                (p) => showClosed || Number(p.quantity) > 0,
                              )
                              .map((p) => (
                                <tr
                                  key={`${p.owner_id}:${p.market}:${p.symbol}`}
                                >
                                  <td>
                                    <span className="stock-label">
                                      <span
                                        className={`ticker-avatar ${p.market === "MY" ? "malaysia" : ""}`}
                                      >
                                        {p.symbol.slice(0, 2)}
                                      </span>
                                      <span>
                                        <strong>{p.symbol}</strong>
                                        <small>
                                          {
                                            data.owners.find(
                                              (o) => o.id === p.owner_id,
                                            )?.name
                                          }{" "}
                                          · {p.market} · {p.currency}
                                          {Number(p.quantity) === 0
                                            ? " · Closed"
                                            : ""}
                                        </small>
                                      </span>
                                    </span>
                                  </td>
                                  <td>{shares(p.quantity)}</td>
                                  <td>
                                    {money(p.average_cost, p.currency)}
                                    <small>
                                      {money(p.cost, p.currency)} total
                                    </small>
                                  </td>
                                  <td>
                                    {Number(p.quantity) === 0
                                      ? "—"
                                      : money(p.quote.price, p.currency)}
                                    {Number(p.quantity) > 0 && (
                                      <small
                                        className={
                                          p.quote.status === "available"
                                            ? ""
                                            : "warning"
                                        }
                                      >
                                        {p.quote.source
                                          ? `${p.quote.source} · `
                                          : ""}
                                        {p.quote.status}
                                        {p.quote.quoted_at &&
                                          ` · ${new Date(p.quote.quoted_at).toLocaleString("en-MY")}`}
                                      </small>
                                    )}
                                    {Number(p.quantity) > 0 &&
                                      p.quote.status !== "available" && (
                                        <button
                                          className="manual-price-button"
                                          onClick={() => setManualPrice(p)}
                                        >
                                          Set price
                                        </button>
                                      )}
                                  </td>
                                  <td>
                                    {money(p.current_value, p.currency)}
                                    <small className={tone(p.unrealized_pl)}>
                                      {money(p.unrealized_pl, p.currency)}
                                    </small>
                                  </td>
                                  <td className={tone(p.realized)}>
                                    {money(p.realized, p.currency)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty
                        title="Your portfolio starts here."
                        text="Record each owner's deposits, then add their buys and sells. We'll take care of the calculations."
                        onAdd={() => setEditor({ kind: "DEPOSIT" })}
                        onBulk={() => setBulk(true)}
                      />
                    )}
                  </section>
                  <div className="bottom-note">
                    <span className="status-dot" />
                    Weighted-average cost · Fees included · Each owner
                    calculated independently
                  </div>
                </>
              )}
              {(tab === "trades" || tab === "cash") && (
                <>
                  {tab === "cash" && (
                    <>
                      <section className="currency-cards">
                        {["MYR", "USD"].map((c) => (
                          <div className="panel cash-card" key={c}>
                            <div className="card-overline">
                              <span>{c} LEDGER</span>
                              <span className="currency-badge">
                                {c === "MYR" ? "RM" : "$"}
                              </span>
                            </div>
                            <h2>{money(summary.totals[c].cash, c)}</h2>
                            <dl>
                              <div>
                                <dt>Net contributions</dt>
                                <dd>
                                  {money(summary.totals[c].contributions, c)}
                                </dd>
                              </div>
                              <div>
                                <dt>Net dividends</dt>
                                <dd>{money(summary.totals[c].dividends, c)}</dd>
                              </div>
                            </dl>
                          </div>
                        ))}
                      </section>
                      <div className="notice">
                        No historical currency conversions have been assumed.
                        Negative USD cash can represent purchases funded by MYR;
                        your Home total estimates this using current FX.
                        Currency-exchange records and reconciliation are planned
                        for Phase 2.
                      </div>
                    </>
                  )}
                  <section className="panel">
                    <div className="section-heading">
                      <div>
                        <p className="eyebrow">THE FULL PICTURE</p>
                        <h2>
                          {tab === "cash" ? "Cash activity" : "Trade history"}{" "}
                          <span className="count">{records.length}</span>
                        </h2>
                      </div>
                      <div className="section-actions">
                        <button onClick={() => setBulk(true)}>
                          Bulk entry
                        </button>
                        <button
                          onClick={download}
                          disabled={!summary.transactions.length}
                        >
                          Export CSV ↗
                        </button>
                      </div>
                    </div>
                    <div className="search-row">
                      <input
                        aria-label="Search records"
                        placeholder="Search by stock, type or note…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      />
                    </div>
                    {records.length > 0 ? (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Date / owner</th>
                              <th>Type / stock</th>
                              <th>
                                {tab === "cash" ? "Amount" : "Shares × price"}
                              </th>
                              <th>Fee</th>
                              <th>Cash change</th>
                              <th>
                                {tab === "cash"
                                  ? "Running cash"
                                  : "Realized P/L"}
                              </th>
                              <th>Record</th>
                            </tr>
                          </thead>
                          <tbody>
                            {records.map((r) => (
                              <tr key={r.id}>
                                <td>
                                  {r.occurred_on}
                                  <small>
                                    {
                                      data.owners.find(
                                        (o) => o.id === r.owner_id,
                                      )?.name
                                    }{" "}
                                    · order {r.sequence}
                                  </small>
                                </td>
                                <td>
                                  <span
                                    className={`type-badge ${r.kind.toLowerCase()}`}
                                  >
                                    {kinds[r.kind]}
                                  </span>
                                  <small>
                                    {r.symbol || r.currency}
                                    {r.notes && ` · ${r.notes}`}
                                  </small>
                                </td>
                                <td>
                                  {tab === "cash" ? (
                                    money(r.amount, r.currency)
                                  ) : (
                                    <>
                                      {shares(r.quantity)} ×{" "}
                                      {money(r.price, r.currency)}
                                    </>
                                  )}
                                  <small>{r.currency}</small>
                                </td>
                                <td>{money(r.fee, r.currency)}</td>
                                <td className={tone(r.cash_change)}>
                                  {money(r.cash_change, r.currency)}
                                </td>
                                <td
                                  className={
                                    tab === "cash" ? "" : tone(r.realized_pl)
                                  }
                                >
                                  {money(
                                    tab === "cash"
                                      ? r.running_cash
                                      : r.realized_pl,
                                    r.currency,
                                  )}
                                </td>
                                <td>
                                  <div className="row-actions">
                                    <button
                                      onClick={() => setEditor({ initial: r })}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      aria-label={`Correction history for record ${r.id}`}
                                      onClick={() => viewAudit(r.id)}
                                    >
                                      History
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
                        title={
                          filter
                            ? "No matching records."
                            : "A fresh start for your records."
                        }
                        text={
                          filter
                            ? "Try another stock, type or note."
                            : "Add a single transaction or paste your historical records together."
                        }
                        onAdd={() =>
                          setEditor({
                            kind: tab === "cash" ? "DEPOSIT" : "BUY",
                          })
                        }
                        onBulk={() => setBulk(true)}
                      />
                    )}
                  </section>
                  {audit && (
                    <section className="panel audit-panel">
                      <div className="section-heading">
                        <h2>Record #{audit.id} · correction history</h2>
                        <button onClick={() => setAudit(null)}>Close</button>
                      </div>
                      {audit.rows.map((row, i) => (
                        <details key={i}>
                          <summary>
                            {row.action} ·{" "}
                            {new Date(row.created_at).toLocaleString("en-MY", {
                              timeZone: "Asia/Kuala_Lumpur",
                            })}
                          </summary>
                          <pre>
                            {JSON.stringify(
                              {
                                before: JSON.parse(row.before_json),
                                after: JSON.parse(row.after_json),
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </details>
                      ))}
                    </section>
                  )}
                </>
              )}
              {tab === "research" && (
                <section className="panel research-placeholder">
                  <span className="research-icon">◈</span>
                  <p className="eyebrow">PHASE 03</p>
                  <h2>
                    Understand the story
                    <br />
                    behind your stocks.
                  </h2>
                  <p>
                    Your existing price charts, news summaries and sentiment
                    tools are preserved in the project. They’ll reconnect here
                    after your financial records are complete.
                  </p>
                  <div className="research-tags">
                    <span>Price charts</span>
                    <span>News summaries</span>
                    <span>Sentiment</span>
                  </div>
                </section>
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>MY INVESTMENT TRACKER</span>
            <span>Personal records. Clearer decisions.</span>
          </footer>
        </main>
      </div>
      {editor && data && (
        <TransactionEditor
          owners={data.owners}
          ownerKey={owner}
          initial={editor.initial}
          defaultKind={editor.kind}
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
    </div>
  );
}
function Metric({ label, value, detail }) {
  return (
    <div className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function Empty({ title, text, onAdd, onBulk }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">↗</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <div>
        <button className="primary" onClick={onAdd}>
          Add a transaction
        </button>
        <button onClick={onBulk}>Bulk historical entry</button>
      </div>
    </div>
  );
}
export default App;
