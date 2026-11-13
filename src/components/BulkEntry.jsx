import { useEffect, useRef, useState } from "react";
import { request } from "../api";
import { BULK_TEMPLATE, kinds, money, parseBulk, shares } from "../lib/tracker";
export default function BulkEntry({ owners, onClose, onSaved }) {
  const dialog = useRef(null);
  const fileInput = useRef(null);
  const [source, setSource] = useState(""),
    [preview, setPreview] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [duplicates, setDuplicates] = useState(false);
  useEffect(() => {
    const el = dialog.current;
    el.showModal();
    return () => el.close();
  }, []);
  async function loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024)
        throw new Error("Choose a file smaller than 1 MB.");
      let value = await file.text();
      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(value),
          rows = Array.isArray(parsed) ? parsed : parsed.transactions;
        if (!Array.isArray(rows) || rows.length > 500)
          throw new Error("The JSON file must contain up to 500 transactions.");
        const fields = [
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
        ];
        value = [
          fields.join(","),
          ...rows.map((row) =>
            fields
              .map(
                (field) =>
                  `"${String(row[field] ?? "").replaceAll('"', '""')}"`,
              )
              .join(","),
          ),
        ].join("\n");
      }
      setSource(value);
      setError("");
    } catch (error) {
      setError(error.message);
    }
    event.target.value = "";
  }
  async function review() {
    setError("");
    setBusy(true);
    try {
      const rows = parseBulk(source, owners);
      setPreview(
        await request("/tracker/transactions/preview", {
          method: "POST",
          body: JSON.stringify({ transactions: rows }),
        }),
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setError("");
    setBusy(true);
    try {
      await request("/tracker/transactions/bulk", {
        method: "POST",
        body: JSON.stringify({
          transactions: preview.transactions,
          allow_duplicates: duplicates,
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
      ref={dialog}
      className="editor bulk-editor"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2>Import</h2>
        <button
          className="icon-button"
          aria-label="Close"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!preview ? (
        <>
          <div className="bulk-tools">
            <button onClick={() => setSource(BULK_TEMPLATE)}>Template</button>
            <button onClick={() => fileInput.current.click()}>Upload</button>
            <input
              hidden
              ref={fileInput}
              type="file"
              accept=".json,.csv,.tsv,.txt"
              onChange={loadFile}
            />
            <small>CSV / TSV / JSON · 500 rows max</small>
          </div>
          <label className="paste-label">
            Data
            <textarea
              rows="10"
              spellCheck="false"
              placeholder={BULK_TEMPLATE}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>
          <details className="column-help">
            <summary>Format</summary>
            <p>
              Owners: mine / father. Dates: YYYY-MM-DD. Types: BUY, SELL,
              DEPOSIT, WITHDRAWAL, DIVIDEND. Positive prices and fees. Actual FX
              optional. Template contains sample rows.
            </p>
          </details>
        </>
      ) : (
        <>
          <p className="preview-count">
            {preview.count} entries · ready to import
          </p>
          {preview.duplicate_rows.length > 0 && (
            <label className="checkbox notice error">
              <input
                type="checkbox"
                checked={duplicates}
                onChange={(e) => setDuplicates(e.target.checked)}
              />
              Rows {preview.duplicate_rows.join(", ")}: allow duplicate fills
            </label>
          )}
          <div className="table-wrap preview-table">
            <table>
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Stock</th>
                  <th>Shares</th>
                  <th>Amount</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                {preview.transactions.map((r, i) => (
                  <tr key={i}>
                    <td>
                      {owners.find((o) => o.id === r.owner_id)?.name}
                      <small>{r.occurred_on}</small>
                    </td>
                    <td>
                      {kinds[r.kind]}
                      <small>{r.symbol || r.currency}</small>
                    </td>
                    <td>{shares(r.quantity)}</td>
                    <td>
                      {money(
                        ["BUY", "SELL"].includes(r.kind) ? r.price : r.amount,
                        r.currency,
                      )}
                    </td>
                    <td>{money(r.fee, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="dialog-actions">
        <button
          disabled={busy}
          onClick={
            preview
              ? () => {
                  setPreview(null);
                  setDuplicates(false);
                }
              : onClose
          }
        >
          {preview ? "Back" : "Cancel"}
        </button>
        <button
          className="primary"
          disabled={
            busy ||
            (!preview && !source.trim()) ||
            (preview?.duplicate_rows.length > 0 && !duplicates)
          }
          onClick={preview ? save : review}
        >
          {busy ? "Working…" : preview ? `Import ${preview.count}` : "Review"}
        </button>
      </div>
    </dialog>
  );
}
