import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { allocationData } from "../lib/charts";
import { money } from "../lib/tracker";

export default function AllocationChart({
  positions,
  fx,
  basis,
  onBasisChange,
  colors,
}) {
  const chart = allocationData(positions, fx, basis, colors);
  return (
    <section className="chart-panel" aria-label="Portfolio allocation">
      <div className="panel-heading">
        <h2>Allocation</h2>
        <div className="mini-switch" aria-label="Allocation basis">
          {[
            ["value", "Value"],
            ["cost", "Cost"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={basis === key}
              onClick={() => onBasisChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {chart.items.length ? (
        <div className="allocation-body">
          <div
            className="donut-container"
            aria-label={`Allocation by ${basis}, in MYR`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart accessibilityLayer>
                <Pie
                  data={chart.items}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="70%"
                  outerRadius="92%"
                  paddingAngle={3}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                >
                  {chart.items.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [money(value), name]}
                  contentStyle={{
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-label" aria-hidden="true">
              <strong>
                {new Intl.NumberFormat("en-MY", {
                  style: "currency",
                  currency: "MYR",
                  currencyDisplay: "narrowSymbol",
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(chart.total)}
              </strong>
              <span>{basis === "cost" ? "cost" : "holdings"}</span>
            </div>
          </div>
          <ul className="allocation-legend">
            {chart.items.map((item) => (
              <li key={item.key}>
                <span
                  className="color-dot"
                  style={{ background: item.color }}
                />
                <span>{item.name}</span>
                <strong>{item.percent.toFixed(1)}%</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="chart-empty">
          {chart.fxMissing
            ? "USD/MYR unavailable"
            : chart.missing
              ? `${chart.missing} missing price${chart.missing > 1 ? "s" : ""}`
              : "No holdings"}
        </div>
      )}
      {basis === "cost" && chart.items.length > 0 && (
        <small className="chart-unit">Cost · MYR at current FX</small>
      )}
    </section>
  );
}
