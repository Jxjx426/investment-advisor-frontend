import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '../api';

function calculateMovingAverage(history, windowSize) {
  return history.map((point, index) => {
    if (index < windowSize - 1) {
      return { ...point, ma: null };
    }
    const windowSlice = history.slice(index - windowSize + 1, index + 1);
    const average =
      windowSlice.reduce((sum, p) => sum + p.price, 0) / windowSize;
    return { ...point, ma: Number(average.toFixed(2)) };
  });
}

function PriceChart({ symbol }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    apiFetch(`/portfolio/history/${symbol}`)
      .then((res) => res.json()) // Response物件转换成真正的JSON资料
      .then((data) => { // 拿到的才是你期待的{symbol, history}这种物件
        if (!ignore) {
          const rawHistory = data.history || [];
          setHistory(calculateMovingAverage(rawHistory, 7));
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [symbol]);

  if (loading) return <p>加载价格走势中...</p>;
  if (history.length === 0) return <p>暂无历史价格资料</p>;

  return (
    <div className="chart-card">
      <h4>{symbol} — 近30天价格走势</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={history}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={50} />
          <Tooltip
            cursor={{ stroke: '#2c2b28' }}
            contentStyle={{
              background: '#1d1d22',
              border: '1px solid #2c2b28',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#8a8578' }}
          />
          <Line
            type="monotone"
            dataKey="price"
            name="每日价格"
            stroke="#c9a15a"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="ma"
            name="7日移动平均"
            stroke="#5b9fee"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="chart-hint">
        蓝色虚线为过去7天平均价格，用于观察近期趋势，非预测。
      </p>
    </div>
  );
}

export default PriceChart;