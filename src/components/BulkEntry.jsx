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
        <div>
          <p className="eyebrow">YOUR RECORDS, TOGETHER</p>
          <h2>Bulk historical entry</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p>
        Paste CSV or spreadsheet rows with the template headers. Use{" "}
        <strong>mine</strong> / <strong>father</strong>, ISO dates (YYYY-MM-DD),
        positive prices and fees, and Bursa codes such as <strong>1155</strong>.
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!preview ? (
        <>
          <div className="section-actions">
            <button onClick={() => setSource(BULK_TEMPLATE)}>
              Load example template
            </button>
            <button onClick={() => fileInput.current.click()}>
              Load local file
            </button>
            <input
              hidden
              ref={fileInput}
              type="file"
              accept=".json,.csv,.tsv,.txt"
              onChange={loadFile}
            />
          </div>
          <label className="paste-label">
            Transaction data
            <textarea
              rows="10"
              spellCheck="false"
              placeholder={BULK_TEMPLATE}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>
          <p className="helper">
            Types: BUY, SELL, DEPOSIT, WITHDRAWAL, DIVIDEND. Amount is for cash
            entries and dividends; quantity and price are for trades. Fees use
            the entry's currency. Leave unavailable actual FX blank. Maximum 500
            rows. Example rows are illustrative. Local files may be CSV, TSV or
            a reviewed JSON draft.
          </p>
        </>
      ) : (
        <>
          <div className="notice">
            <strong>{preview.count} rows validated.</strong> All rows are saved
            together. Review owners and amounts before importing.
          </div>
          {preview.duplicate_rows.length > 0 && (
            <label className="checkbox notice error">
              <input
                type="checkbox"
                checked={duplicates}
                onChange={(e) => setDuplicates(e.target.checked)}
              />
              Rows {preview.duplicate_rows.join(", ")} may be duplicates. I
              checked these are separate fills and want to import them.
            </label>
          )}
          <div className="table-wrap preview-table">
            <table>
              <thead>
                <tr>
                  <th>Owner / date</th>
                  <th>Type / stock</th>
                  <th>Shares</th>
                  <th>Price / amount</th>
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
          {preview ? "Back to data" : "Cancel"}
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
          {busy
            ? "Working…"
            : preview
              ? `Import ${preview.count} records`
              : "Review entries →"}
        </button>
      </div>
    </dialog>
  );
}
