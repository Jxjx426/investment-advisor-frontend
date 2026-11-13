import { useEffect, useState } from "react";
import { request } from "../api";
import { money, shares, today } from "../lib/tracker";
import Icon from "./Icon";
export default function Reconciliation() {
  const [result, setResult] = useState(null),
    [form, setForm] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [extra, setExtra] = useState([]);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const data = await request("/tracker/reconciliation");
      setResult(data);
      setForm({
        as_of: data.snapshot.as_of,
        cash: {
          MYR: data.snapshot.cash.MYR ?? "",
          USD: data.snapshot.cash.USD ?? "",
        },
        positions: Object.fromEntries(
          data.snapshot.positions.map((row) => [
            `${row.market}:${row.symbol}`,
            row.quantity,
          ]),
        ),
        complete: data.snapshot.complete,
      });
      setDirty(false);
      setExtra([]);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function change(action) {
    setForm(action);
    setDirty(true);
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const positions = Object.entries(form.positions)
        .filter(([, quantity]) => quantity !== "")
        .map(([key, quantity]) => {
          const [market, symbol] = key.split(":");
          return { market, symbol, quantity };
        });
      for (const row of extra)
        if (row.symbol || row.quantity !== "") {
          if (!row.symbol || row.quantity === "")
            throw new Error("Complete each added broker stock.");
          positions.push(row);
        }
      const data = await request("/tracker/reconciliation", {
        method: "PUT",
        body: JSON.stringify({
          version: result.version,
          as_of: form.as_of,
          cash: form.cash,
          positions,
          complete: form.complete,
        }),
      });
      setResult(data);
      setForm((old) => ({
        ...old,
        positions: Object.fromEntries(
          data.snapshot.positions.map((row) => [
            `${row.market}:${row.symbol}`,
            row.quantity,
          ]),
        ),
      }));
      setExtra([]);
      setDirty(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  if (!form)
    return (
      <div className="empty-state">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={load}>Retry</button>
          </>
        ) : (
          "Loading…"
        )}
      </div>
    );
  const unchangedDate = form.as_of === result.comparison.as_of;
  const comparison = result.comparison;
  const rows = [
    ...new Set([
      ...comparison.positions.map((row) => `${row.market}:${row.symbol}`),
      ...Object.keys(form.positions),
    ]),
  ].sort();
  return (
    <form onSubmit={save} className="reconciliation">
      <div className="reconcile-heading">
        <div>
          <h2>
            Moomoo <span className="muted-label">Mine + Dad</span>
          </h2>
          <span className="reconcile-caption">
            {dirty
              ? "Unsaved"
              : result.version
                ? "Saved comparison"
                : "Enter broker balances"}
          </span>
        </div>
        <label>
          As of
          <input
            type="date"
            required
            max={today()}
            value={form.as_of}
            onChange={(event) =>
              change((old) => ({ ...old, as_of: event.target.value }))
            }
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save & compare"}
        </button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!dirty && result.version > 0 && (
        <div className="reconcile-status">
          <span className={comparison.share_mismatches ? "negative" : ""}>
            {comparison.share_mismatches} share differences
          </span>
          <span className={comparison.cash_mismatches ? "negative" : ""}>
            {comparison.cash_mismatches} cash differences
          </span>
          {comparison.missing > 0 && <span>{comparison.missing} missing</span>}
          {comparison.estimated && <span>Estimated cash</span>}
          {!comparison.share_mismatches &&
            !comparison.cash_mismatches &&
            !comparison.missing &&
            !comparison.estimated && <span className="positive">Matched</span>}
        </div>
      )}
      <section className="records-panel reconcile-panel">
        <div className="panel-heading">
          <h2>Cash</h2>
          {comparison.estimated && (
            <span className="muted-label">≈ History incomplete</span>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Currency</th>
                <th>Tracker</th>
                <th>Moomoo</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {comparison.cash.map((row) => (
                <tr key={row.currency}>
                  <td>{row.currency}</td>
                  <td>
                    {unchangedDate
                      ? `${row.estimated ? "≈ " : ""}${money(row.recorded, row.currency)}`
                      : "—"}
                  </td>
                  <td>
                    <input
                      aria-label={`Moomoo ${row.currency} cash`}
                      type="number"
                      step="0.01"
                      placeholder="Not entered"
                      value={form.cash[row.currency]}
                      onChange={(event) =>
                        change((old) => ({
                          ...old,
                          cash: {
                            ...old.cash,
                            [row.currency]: event.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className={row.status === "different" ? "negative" : ""}>
                    {!dirty ? money(row.difference, row.currency) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="records-panel reconcile-panel">
        <div className="panel-heading">
          <h2>Shares</h2>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.complete}
              onChange={(event) =>
                change((old) => ({ ...old, complete: event.target.checked }))
              }
            />
            All broker holdings listed
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Stock</th>
                <th>Tracker</th>
                <th>Moomoo</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((key) => {
                const row = comparison.positions.find(
                    (row) => `${row.market}:${row.symbol}` === key,
                  ),
                  [market, symbol] = key.split(":");
                return (
                  <tr key={key}>
                    <td>
                      <strong>{symbol}</strong>
                      <small>{market}</small>
                    </td>
                    <td>{unchangedDate ? shares(row?.recorded ?? 0) : "—"}</td>
                    <td>
                      <input
                        aria-label={`Moomoo ${market} ${symbol} shares`}
                        type="number"
                        min="0"
                        step="0.00000001"
                        placeholder={form.complete ? "0" : "Not entered"}
                        value={form.positions[key] ?? ""}
                        onChange={(event) =>
                          change((old) => ({
                            ...old,
                            positions: {
                              ...old.positions,
                              [key]: event.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td
                      className={row?.status === "different" ? "negative" : ""}
                    >
                      {!dirty && row?.difference != null
                        ? shares(row.difference)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {extra.map((row, index) => (
                <tr key={`extra-${index}`}>
                  <td>
                    <div className="broker-stock-input">
                      <select
                        aria-label={`New broker stock ${index + 1} market`}
                        value={row.market}
                        onChange={(event) => {
                          setExtra((old) =>
                            old.map((item, i) =>
                              i === index
                                ? { ...item, market: event.target.value }
                                : item,
                            ),
                          );
                          setDirty(true);
                        }}
                      >
                        <option>US</option>
                        <option>MY</option>
                      </select>
                      <input
                        aria-label={`New broker stock ${index + 1} symbol`}
                        placeholder="Stock"
                        value={row.symbol}
                        onChange={(event) => {
                          setExtra((old) =>
                            old.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    symbol: event.target.value.toUpperCase(),
                                  }
                                : item,
                            ),
                          );
                          setDirty(true);
                        }}
                      />
                    </div>
                  </td>
                  <td>—</td>
                  <td>
                    <input
                      aria-label={`New broker stock ${index + 1} shares`}
                      type="number"
                      min="0"
                      step="0.00000001"
                      value={row.quantity}
                      onChange={(event) => {
                        setExtra((old) =>
                          old.map((item, i) =>
                            i === index
                              ? { ...item, quantity: event.target.value }
                              : item,
                          ),
                        );
                        setDirty(true);
                      }}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove new broker stock ${index + 1}`}
                      onClick={() =>
                        setExtra((old) => old.filter((_, i) => i !== index))
                      }
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="reconcile-footer">
          <button
            type="button"
            onClick={() => {
              setExtra((old) => [
                ...old,
                { market: "US", symbol: "", quantity: "" },
              ]);
              setDirty(true);
            }}
          >
            <Icon name="add" size={14} />
            Broker stock
          </button>
          <span className="muted-label">Difference = Tracker − Moomoo</span>
        </div>
      </section>
    </form>
  );
}
