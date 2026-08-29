import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PriceChart from './PriceChart';
import { apiFetch } from '../api';

/*
这次symbol不需要onHoldingAdded那种父子沟通
因为NewsAnalysis是完全独立的功能——它自己管理自己的symbol、analysis、loading这几个state，
不需要通知App.jsx任何事，也不需要App.jsx给它任何资料。这是跟之前不一样的模式：
不是所有组件都需要父子沟通，有些组件就是完全自给自足的。
*/
function NewsAnalysis() {
  const { symbol: symbolFromUrl } = useParams();
  // React Router提供的一个function，用来读取网址里:symbol这个变量的实际值。
  // 跟你在backend用req.params.symbol是一模一样的概念，只是这次是前端路由，不是API路由。
  // 这里做了一个"改名"的解构——useParams()回传的物件里有一个symbol栏位，但因为组件内部已经有一个
  // 叫symbol的state了（打字用的那个），会撞名，所以把它取名叫symbolFromUrl区分开来。
  const [symbol, setSymbol] = useState(symbolFromUrl || '');
  const [searchedSymbol, setSearchedSymbol] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (searchSymbol) => {
    const targetSymbol = searchSymbol || symbol;
    if (!targetSymbol) {
      setError('股票代号不能为空');
      return;
    }
    setLoading(true);
    setAnalysis(null);
    setError('');
    try {
      const res = await apiFetch(`/news/${targetSymbol}/analysis`);
      const data = await res.json();

      if (data.error) {
      setError('查询失败，请确认股票代号是否正确，或稍后再试。');
      setLoading(false);
      return;
      }

      setAnalysis(data);
      setSearchedSymbol(targetSymbol.toUpperCase());
  
    } catch (err) {
      setError('无法连接到服务器，请检查网路连线。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbolFromUrl) {
      handleSearch(symbolFromUrl);
    }
  }, [symbolFromUrl]);
  /*
  这次的[]里面放了symbolFromUrl，不是空的。意思是"当symbolFromUrl这个值改变时，重新执行这段code"。
  这样设计的原因是：如果使用者先点了AAPL的新闻，又跳回去点TSLA的新闻，网址变了(/news/AAPL → /news/TSLA)，
  这个effect要能侦测到变化，自动重新查询。
  */

  return (
    <div>
      <h3>新闻分析</h3>
      <input
        type="text"
        placeholder="输入股票代号 (例如 AAPL)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />
      <button onClick={() => handleSearch()}>查询</button>

      {loading && <p>分析中，请稍等...</p>}
      {error && <p className="form-error">{error}</p>}
      {/*JSX里常见的条件渲染简写：如果loading是true，就显示<p>那段；
      如果是false，&&前半段是false，后面整个表达式就不会显示任何东西。比if简洁，很常用 
      只有analysis有资料（不是null）时，才显示这一大段*/}
      {searchedSymbol && <PriceChart symbol={searchedSymbol} />}
      
      {analysis && (
      <div className="news-summary">
        <h4>
          {analysis.symbol} — 情绪倾向:{' '}
          <span
            className={
              analysis.sentiment.label === 'leaning positive'
                ? 'sentiment-badge sentiment-positive'
                : analysis.sentiment.label === 'leaning negative'
                ? 'sentiment-badge sentiment-negative'
                : 'sentiment-badge sentiment-neutral'
            }
          >
            {analysis.sentiment.label}
          </span>
          （正面信号 {analysis.sentiment.positiveSignals} / 负面信号{' '}
          {analysis.sentiment.negativeSignals}）
        </h4>
        <p style={{ whiteSpace: 'pre-line' }}>{analysis.summary}</p>
        <small className="news-note">{analysis.note}</small>
      </div>
      )}
    </div>
  );
}

export default NewsAnalysis;