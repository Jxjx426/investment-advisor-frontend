import { useEffect, useRef, useState } from "react";
import { request } from "../api";
export default function ManualPrice({ position, onClose, onSaved }) {
  const ref = useRef(null),
    [price, setPrice] = useState(""),
    [date, setDate] = useState(new Date().toISOString().slice(0, 16)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/tracker/quotes/manual", {
        method: "POST",
        body: JSON.stringify({
          market: position.market,
          symbol: position.symbol,
          currency: position.currency,
          price,
          quoted_at: `${date}:00Z`,
        }),
      });
      onSaved();
    } catch (error) {
      setError(error.message);
      setBusy(false);
    }
  }
  return (
    <dialog
      className="editor"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2>{position.symbol} · manual price</h2>
        <button
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <p className="helper">
        Enter a price from your broker when automatic data is unavailable. It
        stays labelled as manual and is replaced by a newer valid automatic
        quote.
      </p>
      <form onSubmit={save}>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="form-grid">
          <label>
            Price ({position.currency})
            <input
              required
              type="number"
              min="0.00000001"
              step="0.00000001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label>
            Quote time (UTC)
            <input
              required
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <div className="dialog-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save manual price"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
