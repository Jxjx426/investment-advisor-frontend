import { Link } from 'react-router-dom';
import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { apiFetch } from '../api';

// 这就是一个组件（component）——本质上就是一个"专门回传一段画面"的function。
// { portfolio }是接收从外面传进来的资料，这叫props
function PortfolioSummary({ portfolio, onHoldingDeleted }) {
  if (!portfolio || portfolio.totalValue == null) {
    return <p>目前尚无持仓资料</p>
  }
  const [pendingDelete, setPendingDelete] = useState(null);  
  const confirmDelete = async () => {
    await apiFetch(`/holdings/${pendingDelete.id}`, {
      method: 'DELETE',
    });
    setPendingDelete(null);
    onHoldingDeleted();
  };

  return (
    <div className="summary-card">
      <h2>
        总市值: ${portfolio.totalValue.toFixed(2)} | 总盈亏: $
        {portfolio.totalGainLoss.toFixed(2)} (
        {portfolio.totalGainLossPercent.toFixed(2)}%)
      </h2>
      <ul className="holdings-list">
        {portfolio.holdings.map((h) => (
          /* 这跟你在backend写的map是一模一样的概念——把array里每一笔资料，
          转换成画面上的一个元素（这里是<li>）。*/
          <li key={h.symbol} className="holding-item">
            <div className="holding-info">
              {/* React要求你在"列表渲染"时，每个项目要给一个独一无二的key，方便它追踪哪个元素改变了。*/}
              <span className="holding-symbol">{h.symbol}</span>
              <span className="holding-detail">
                - 数量: {h.quantity}, 
                平均买入价:{' '} {h.avgBuyPrice != null? `${h.avgBuyPrice.toFixed(2)}}` : '暂无资料'}, 
                现价:{' '}  {h.currentPrice != null ? `$${h.currentPrice.toFixed(2)}` : '暂无报价'}
              </span>
              {h.gainLoss != null ? (
                <span className={h.gainLoss >= 0 ? 'gain' : 'loss'}>
                    盈亏: ${h.gainLoss.toFixed(2)} ({h.gainLossPercent.toFixed(2)}%)
                  </span>
                ) : (
                  <span className="holding-detail">盈亏: 暂无资料</span>
              )}
            </div>
            <div className="holding-actions">
              <button onClick={() => setPendingDelete({ id: h.id, symbol: h.symbol })}>删除</button>
              <Link to={`/news/${h.symbol}`}>
                {/*用模板字串动态组出网址，比如h.symbol是AAPL，这里就会变成/news/AAPL。 */}
                <button>查看新闻</button>
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {pendingDelete && (
        <ConfirmDialog
          message={`确定要删除 ${pendingDelete.symbol} 这笔持仓吗？此操作无法复原。`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>  
  );
}

export default PortfolioSummary;