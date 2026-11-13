import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { profitData } from "../lib/charts";
import { money } from "../lib/tracker";
export default function ProfitChart({ positions, fx, kind, onKindChange }) {
  const chart = profitData(positions, fx, kind);
  const limit =
    Math.max(...chart.items.map((item) => Math.abs(item.value)), 1) * 1.25;
  return (
    <section className="chart-panel" aria-label="Profit and loss chart">
      <div className="panel-heading">
        <h2>Profit / loss</h2>
        <div className="mini-switch" aria-label="Profit type">
          {[
            ["unrealized", "Open"],
            ["realized", "Realized"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={kind === key}
              onClick={() => onKindChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {chart.items.length ? (
        <>
          <div
            className="profit-chart"
            style={{ height: Math.max(220, chart.items.length * 39 + 34) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart.items}
                layout="vertical"
                margin={{ left: 0, right: 18, top: 12, bottom: 0 }}
                accessibilityLayer
              >
                <XAxis
                  type="number"
                  domain={[-limit, limit]}
                  ticks={[-limit, 0, limit]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("en", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(value)
                  }
                  tickCount={3}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  width={62}
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                />
                <ReferenceLine x={0} stroke="var(--border)" />
                <Tooltip
                  cursor={{ fill: "var(--hover)" }}
                  formatter={(value) => [money(value), "P/L"]}
                  contentStyle={{
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="value"
                  maxBarSize={17}
                  radius={3}
                  isAnimationActive={false}
                >
                  {chart.items.map((item) => (
                    <Cell
                      key={item.key}
                      fill={item.value < 0 ? "#df6872" : "#4775ee"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <small className="chart-unit">
            MYR · current FX
            {chart.missing > 0 ? ` · ${chart.missing} unpriced` : ""}
          </small>
        </>
      ) : (
        <div className="chart-empty">
          {chart.fxMissing
            ? "USD/MYR unavailable"
            : chart.missing
              ? `${chart.missing} missing price${chart.missing > 1 ? "s" : ""}`
              : kind === "realized"
                ? "No realized P/L"
                : "No holdings"}
        </div>
      )}
    </section>
  );
}
