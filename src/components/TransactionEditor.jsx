import { useEffect, useRef, useState } from "react";
import { request } from "../api";
import { kinds, today } from "../lib/tracker";
export default function TransactionEditor({
  owners,
  ownerKey,
  initial,
  defaultKind = "BUY",
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(
    () =>
      initial || {
        owner_id:
          owners.find((o) => o.owner_key === ownerKey)?.id || owners[0].id,
        kind: defaultKind,
        occurred_on: today(),
        market: "US",
        symbol: "",
        currency: defaultKind === "DEPOSIT" ? "MYR" : "USD",
        quantity: "",
        price: "",
        fee: "0",
        amount: "",
        fx_rate: "",
        sequence: 0,
        notes: "",
      },
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(false),
    [allowDuplicates, setAllowDuplicates] = useState(false);
  const dialog = useRef(null);
  useEffect(() => {
    const el = dialog.current;
    el.showModal();
    return () => el.close();
  }, []);
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const trade = ["BUY", "SELL"].includes(form.kind),
    security = trade || form.kind === "DIVIDEND";
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request(
        initial
          ? `/tracker/transactions/${initial.id}`
          : "/tracker/transactions",
        {
          method: initial ? "PUT" : "POST",
          body: JSON.stringify({ ...form, allow_duplicates: allowDuplicates }),
        },
      );
      onSaved();
    } catch (error) {
      setError(error.message);
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await request(`/tracker/transactions/${initial.id}`, {
        method: "DELETE",
        body: JSON.stringify({ version: initial.version }),
      });
      onSaved();
    } catch (error) {
      setError(error.message);
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="editor"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">
            {initial ? "CORRECT A RECORD" : "BUILD YOUR HISTORY"}
          </p>
          <h2>{initial ? "Edit transaction" : "Add transaction"}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <form onSubmit={save}>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {!initial && error.includes("Possible duplicate") && (
          <label className="checkbox notice">
            <input
              type="checkbox"
              checked={allowDuplicates}
              onChange={(e) => setAllowDuplicates(e.target.checked)}
            />
            This is a separate fill. Allow the duplicate details.
          </label>
        )}
        <div className="form-grid">
          <label>
            Owner
            <select
              value={form.owner_id}
              onChange={(e) => change("owner_id", Number(e.target.value))}
            >
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select
              value={form.kind}
              onChange={(e) =>
                setForm((old) => ({
                  ...old,
                  kind: e.target.value,
                  market: old.market || "US",
                  currency: ["BUY", "SELL", "DIVIDEND"].includes(e.target.value)
                    ? old.market === "MY"
                      ? "MYR"
                      : "USD"
                    : old.currency,
                }))
              }
            >
              {Object.entries(kinds).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              required
              max={today()}
              value={form.occurred_on}
              onChange={(e) => change("occurred_on", e.target.value)}
            />
          </label>
          <label>
            Same-day order
            <input
              type="number"
              min="0"
              max="1000000"
              step="1"
              required
              value={form.sequence}
              onChange={(e) => change("sequence", e.target.value)}
            />
          </label>
          {security && (
            <>
              <label>
                Market
                <select
                  value={form.market || "US"}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      market: e.target.value,
                      currency: e.target.value === "US" ? "USD" : "MYR",
                    }))
                  }
                >
                  <option value="US">United States</option>
                  <option value="MY">Malaysia · Bursa</option>
                </select>
              </label>
              <label>
                Stock ticker
                <input
                  required
                  placeholder={form.market === "MY" ? "1155 (Maybank)" : "AAPL"}
                  value={form.symbol || ""}
                  maxLength="20"
                  onChange={(e) =>
                    change("symbol", e.target.value.toUpperCase())
                  }
                />
              </label>
            </>
          )}
          {!security && (
            <label>
              Currency
              <select
                value={form.currency}
                onChange={(e) => change("currency", e.target.value)}
              >
                <option>MYR</option>
                <option>USD</option>
              </select>
            </label>
          )}
          {trade ? (
            <>
              <label>
                Shares
                <input
                  type="number"
                  min="0.00000001"
                  step="0.00000001"
                  required
                  value={form.quantity}
                  onChange={(e) => change("quantity", e.target.value)}
                />
              </label>
              <label>
                Price per share ({form.currency})
                <input
                  type="number"
                  min="0.00000001"
                  step="0.00000001"
                  required
                  value={form.price}
                  onChange={(e) => change("price", e.target.value)}
                />
              </label>
            </>
          ) : (
            <label>
              {form.kind === "DIVIDEND" ? "Gross dividend" : "Amount"} (
              {form.currency})
              <input
                type="number"
                min="0.00000001"
                step="0.00000001"
                required
                value={form.amount}
                onChange={(e) => change("amount", e.target.value)}
              />
            </label>
          )}
          <label>
            {form.kind === "DIVIDEND"
              ? "Withholding / fees"
              : "Exact total fee"}{" "}
            ({form.currency})
            <input
              type="number"
              min="0"
              step="0.00000001"
              required
              value={form.fee}
              onChange={(e) => change("fee", e.target.value)}
            />
          </label>
          {form.currency === "USD" && (
            <label>
              Actual FX, if known <span className="muted">optional</span>
              <input
                type="number"
                min="0.00000001"
                step="0.00000001"
                placeholder="MYR per 1 USD"
                value={form.fx_rate ?? ""}
                onChange={(e) => change("fx_rate", e.target.value)}
              />
            </label>
          )}
          <label className="full">
            Notes
            <input
              maxLength="1000"
              value={form.notes}
              onChange={(e) => change("notes", e.target.value)}
              placeholder="Optional reference or broker note"
            />
          </label>
        </div>
        <p className="helper">
          {trade
            ? "Enter positive shares, prices and fees. Buy fees enter cost; sell fees reduce proceeds."
            : form.kind === "DIVIDEND"
              ? "Dividends increase cash without changing your shares."
              : "Deposits and withdrawals change cash and contributions, never trading profit."}{" "}
          Same-day entries run by order, then entry time.
        </p>
        {deleting && (
          <div className="notice error">
            <p>
              Delete this record? Later balances will be recalculated. The
              correction history is kept.
            </p>
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={remove}
            >
              Confirm delete
            </button>{" "}
            <button
              type="button"
              disabled={busy}
              onClick={() => setDeleting(false)}
            >
              Keep record
            </button>
          </div>
        )}
        <div className="dialog-actions">
          {initial && (
            <button
              type="button"
              className="text-danger"
              disabled={busy}
              onClick={() => setDeleting(true)}
            >
              Delete record
            </button>
          )}
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy
              ? "Saving…"
              : initial
                ? "Save correction"
                : "Save transaction"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
