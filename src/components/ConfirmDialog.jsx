function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="dialog-overlay">
      <div className="dialog-box">
        <p>{message}</p>
        <div className="dialog-actions">
          <button onClick={onCancel}>取消</button>
          <button className="dialog-confirm" onClick={onConfirm}>
            确定删除
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;