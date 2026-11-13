import { useEffect, useRef, useState } from "react";
import { request } from "../api";
import { kinds, today } from "../lib/tracker";
import Icon from "./Icon";
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
          owners.find((owner) => owner.owner_key === ownerKey)?.id ||
          owners[0].id,
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
    const element = dialog.current;
    element.showModal();
    return () => element.close();
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
        <h2>{initial ? "Edit" : "Add transaction"}</h2>
        <button
          className="icon-button"
          aria-label="Close"
          disabled={busy}
          onClick={onClose}
        >
          <Icon name="close" />
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
              onChange={(event) => setAllowDuplicates(event.target.checked)}
            />
            Separate fill · allow duplicate
          </label>
        )}
        <div className="form-grid">
          <label>
            Owner
            <select
              value={form.owner_id}
              onChange={(event) =>
                change("owner_id", Number(event.target.value))
              }
            >
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.owner_key === "father" ? "Dad" : "Mine"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select
              value={form.kind}
              onChange={(event) =>
                setForm((old) => ({
                  ...old,
                  kind: event.target.value,
                  market: old.market || "US",
                  currency: ["BUY", "SELL", "DIVIDEND"].includes(
                    event.target.value,
                  )
                    ? old.market === "MY"
                      ? "MYR"
                      : "USD"
                    : old.currency,
                }))
              }
            >
              {Object.entries(kinds).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
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
              onChange={(event) => change("occurred_on", event.target.value)}
            />
          </label>
          {security ? (
            <>
              <label>
                Market
                <select
                  value={form.market || "US"}
                  onChange={(event) =>
                    setForm((old) => ({
                      ...old,
                      market: event.target.value,
                      currency: event.target.value === "US" ? "USD" : "MYR",
                    }))
                  }
                >
                  <option value="US">US · USD</option>
                  <option value="MY">Malaysia · MYR</option>
                </select>
              </label>
              <label className="full">
                Stock
                <input
                  required
                  placeholder={form.market === "MY" ? "1155" : "AAPL"}
                  value={form.symbol || ""}
                  maxLength={20}
                  onChange={(event) =>
                    change("symbol", event.target.value.toUpperCase())
                  }
                />
              </label>
            </>
          ) : (
            <label>
              Currency
              <select
                value={form.currency}
                onChange={(event) => change("currency", event.target.value)}
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
                  onChange={(event) => change("quantity", event.target.value)}
                />
              </label>
              <label>
                Price ({form.currency})
                <input
                  type="number"
                  min="0.00000001"
                  step="0.00000001"
                  required
                  value={form.price}
                  onChange={(event) => change("price", event.target.value)}
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
                onChange={(event) => change("amount", event.target.value)}
              />
            </label>
          )}
          <label>
            {form.kind === "DIVIDEND" ? "Tax / fees" : "Fee"} ({form.currency})
            <input
              type="number"
              min="0"
              step="0.00000001"
              required
              value={form.fee}
              onChange={(event) => change("fee", event.target.value)}
            />
          </label>
        </div>
        <details className="more-fields">
          <summary>More</summary>
          <div className="form-grid">
            <label>
              Same-day order
              <input
                type="number"
                min="0"
                max="1000000"
                step="1"
                value={form.sequence}
                onChange={(event) => change("sequence", event.target.value)}
              />
            </label>
            {form.currency === "USD" && (
              <label>
                Actual FX
                <input
                  type="number"
                  min="0.00000001"
                  step="0.00000001"
                  placeholder="MYR per USD"
                  value={form.fx_rate ?? ""}
                  onChange={(event) => change("fx_rate", event.target.value)}
                />
              </label>
            )}
            <label className="full">
              Notes
              <input
                maxLength={1000}
                value={form.notes}
                onChange={(event) => change("notes", event.target.value)}
              />
            </label>
          </div>
        </details>
        {deleting && (
          <div className="notice error">
            <span>Delete this entry?</span>
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={remove}
            >
              Delete
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setDeleting(false)}
            >
              Keep
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
              Delete
            </button>
          )}
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
