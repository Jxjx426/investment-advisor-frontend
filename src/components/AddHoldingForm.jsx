import { useState } from 'react';
import { apiFetch } from '../api';

function AddHoldingForm({ onHoldingAdded }) {
  const [symbol, setSymbol] = useState('');
  // useState('')会自动回传两个东西：
  // 目前的值（symbol）
  // 一个专门用来"更新这个值"的function（setSymbol）
  const [quantity, setQuantity] = useState('');
  const [avgBuyPrice, setAvgBuyPrice] = useState('');
  // 表单里每一个输入框，都要有自己的一个state来"记住使用者打了什么
  // 都是文字 -- HTML input就算是number类型，React接收到的还是字串
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // 取消这个默认清空行为，让我们自己用JavaScript控制接下来要做什么（呼叫API）。
    setError('');

    if (!symbol.trim()){
      setError('股票代号不能为空');
      return; 
    }
    if (Number(quantity) <= 0 || Number(avgBuyPrice) <= 0) {
      setError('数量和平均买入价必须大于0');
      return; // 一旦验证失败，设定错误讯息、马上结束function
    }

    const res = await apiFetch('/holdings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 告诉backend"我送的资料是JSON格式"（这样Express的express.json()才知道怎么解析）
      body: JSON.stringify({ 
        // 把JavaScript物件转成JSON格式的字串（因为网路传输只能传"文字"，不能直接传物件）
        symbol: symbol.toUpperCase().trim(), //去掉字串前后多余的空白
        quantity: Number(quantity),
        avg_buy_price: Number(avgBuyPrice).toFixed(2), 
        // 送去backend之前要转成真正的数字，不然数据库存进去的可能是文字。
      }),
    });
    
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      return;
    }

    setSymbol('');
    setQuantity('');
    setAvgBuyPrice('');

    onHoldingAdded();
    /*
    onHoldingAdded prop 跟 fetchPortfolio — 这是最关键的新概念

    - App.jsx把fetchPortfolio这个function，当作onHoldingAdded传给AddHoldingForm
    - 在AddHoldingForm里，handleSubmit成功新增之后，会呼叫onHoldingAdded()——其实就是在呼叫App.jsx的fetchPortfolio
    - 这样做的目的：AddHoldingForm自己不知道、也不需要知道"资料要怎么重新抓"，它只需要"完成新增后，通知外面一声"，至于外面收到通知要做什么（重新fetch），是App.jsx的责任
    
    */
  };

  return (
    <form onSubmit={handleSubmit}> {/* 表单被提交时（按钮或Enter），执行handleSubmit。 */}
      <h3>新增持仓</h3>
      {error && <p className="form-error">{error}</p>}
      <input
        type="text"
        placeholder="股票代号 (例如 AAPL)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="数量"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        required
      />
      <input
        type="number"
        step="0.01"
        placeholder="平均买入价"
        value={avgBuyPrice}
        onChange={(e) => setAvgBuyPrice(e.target.value)}
        required
      />
      <button type="submit">新增</button>
    </form>
  );
}

export default AddHoldingForm;