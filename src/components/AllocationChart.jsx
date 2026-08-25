import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#e8b04b', '#5fd9a8', '#5b9fee', '#e8697a', '#a888e8', '#4ecdc4'];
function AllocationChart({ holdings }) {
  const data = holdings.map((h) => ({
    name: h.symbol,
    value: h.currentValue,
  }));

  return (
    <div className="chart-card">
      <h4>持仓配置比例</h4>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#1d1d22',
              border: '1px solid #2c2b28',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            formatter={(value) => `$${value.toFixed(2)}`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AllocationChart;