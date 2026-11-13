import { useEffect, useRef, useState } from "react";
import { request } from "../api";
import { kinds, today } from "../lib/tracker";
import Icon from "./Icon";
export default function TransactionEditor({
  owners,
  ownerKey,
  initial,
  defaultKind = "BUY",
  fx,
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
        currency: ["DEPOSIT", "OPENING_CASH", "TRANSFER"].includes(defaultKind)
          ? "MYR"
          : "USD",
        quantity: "",
        price: "",
        fee: "0",
        amount: "",
        fx_rate: "",
        sequence: 0,
        notes: "",
        tax: "0",
        target_currency: "USD",
        target_amount: "",
        counterparty_owner_id: owners.find(
          (owner) =>
            owner.id !==
            (owners.find((item) => item.owner_key === ownerKey)?.id ||
              owners[0].id),
        )?.id,
        split_from: "",
        split_to: "",
        fx_estimated: 0,
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
  const trade = ["BUY", "SELL"].includes(form.kind),
    security =
      trade || ["DIVIDEND", "SPLIT", "OPENING_POSITION"].includes(form.kind),
    exchange = form.kind === "FX",
    split = form.kind === "SPLIT",
    opening = form.kind === "OPENING_POSITION",
    feeAllowed = !["SPLIT", "OPENING_CASH", "OPENING_POSITION", "TAX"].includes(
      form.kind,
    );
  function change(key, value) {
    setForm((old) => ({
      ...old,
      [key]: value,
      ...(key === "target_amount" ? { fx_estimated: 0 } : {}),
      ...(key === "owner_id" &&
      Number(value) === Number(old.counterparty_owner_id)
        ? {
            counterparty_owner_id: owners.find(
              (owner) => owner.id !== Number(value),
            )?.id,
          }
        : {}),
      ...(key === "currency"
        ? { target_currency: value === "MYR" ? "USD" : "MYR" }
        : {}),
    }));
  }
  function chooseKind(kind) {
    setForm((old) => ({
      ...old,
      kind,
      market: old.market || "US",
      currency: [
        "BUY",
        "SELL",
        "DIVIDEND",
        "SPLIT",
        "OPENING_POSITION",
      ].includes(kind)
        ? old.market === "MY"
          ? "MYR"
          : "USD"
        : old.currency,
      target_currency: old.currency === "MYR" ? "USD" : "MYR",
      fee: ["SPLIT", "OPENING_CASH", "OPENING_POSITION", "TAX"].includes(kind)
        ? "0"
        : old.fee,
    }));
  }
  function estimate() {
    const amount = Number(form.amount),
      rate = Number(fx);
    if (!Number.isFinite(amount) || amount <= 0 || !rate) return;
    setForm((old) => ({
      ...old,
      target_amount: (old.currency === "MYR"
        ? amount / rate
        : amount * rate
      ).toFixed(8),
      fx_estimated: 1,
    }));
  }
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
  const numberInput = (field, minimum = "0.00000001") => (
    <input
      type="number"
      min={minimum}
      step="0.00000001"
      required
      value={form[field] ?? ""}
      onChange={(event) => change(field, event.target.value)}
    />
  );
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
            {form.kind === "TRANSFER" ? "From owner" : "Owner"}
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
              onChange={(event) => chooseKind(event.target.value)}
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
              {exchange ? "Pay in" : "Currency"}
              <select
                value={form.currency}
                onChange={(event) => change("currency", event.target.value)}
              >
                <option>MYR</option>
                <option>USD</option>
              </select>
            </label>
          )}
          {form.kind === "TRANSFER" && (
            <label className="full">
              To owner
              <select
                value={form.counterparty_owner_id || ""}
                onChange={(event) =>
                  change("counterparty_owner_id", Number(event.target.value))
                }
              >
                {owners
                  .filter((owner) => owner.id !== Number(form.owner_id))
                  .map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.owner_key === "father" ? "Dad" : "Mine"}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {split ? (
            <>
              <label>Old shares{numberInput("split_from")}</label>
              <label>New shares{numberInput("split_to")}</label>
            </>
          ) : trade ? (
            <>
              <label>Shares{numberInput("quantity")}</label>
              <label>
                Price ({form.currency}){numberInput("price")}
              </label>
            </>
          ) : opening ? (
            <>
              <label>Shares{numberInput("quantity")}</label>
              <label>
                Total cost ({form.currency}){numberInput("amount")}
              </label>
            </>
          ) : (
            <label>
              {form.kind === "DIVIDEND"
                ? "Gross dividend"
                : exchange
                  ? "Paid"
                  : form.kind === "OPENING_CASH"
                    ? "Cash balance"
                    : "Amount"}{" "}
              ({form.currency})
              {numberInput(
                "amount",
                form.kind === "OPENING_CASH" ? "0" : "0.00000001",
              )}
            </label>
          )}
          {exchange && (
            <>
              <label>
                Received ({form.currency === "MYR" ? "USD" : "MYR"})
                <input
                  type="number"
                  min="0.00000001"
                  step="0.00000001"
                  required
                  value={form.target_amount ?? ""}
                  onChange={(event) =>
                    setForm((old) => ({
                      ...old,
                      target_currency: old.currency === "MYR" ? "USD" : "MYR",
                      target_amount: event.target.value,
                      fx_estimated: 0,
                    }))
                  }
                />
              </label>
              <div className="fx-tools full">
                <button
                  type="button"
                  onClick={() => {
                    setForm((old) => ({
                      ...old,
                      target_currency: old.currency === "MYR" ? "USD" : "MYR",
                    }));
                    estimate();
                  }}
                  disabled={!fx || !Number(form.amount)}
                >
                  Use current rate
                </button>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!form.fx_estimated}
                    onChange={(event) =>
                      change("fx_estimated", event.target.checked ? 1 : 0)
                    }
                  />
                  Estimated
                </label>
              </div>
            </>
          )}
          {form.kind === "DIVIDEND" && (
            <label>
              Withholding tax ({form.currency}){numberInput("tax", "0")}
            </label>
          )}
          {feeAllowed && (
            <label>
              Fee ({form.currency}){numberInput("fee", "0")}
            </label>
          )}
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
            {form.currency === "USD" && !exchange && !split && (
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
