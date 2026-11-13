import { useEffect, useRef, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { request } from "../api";
import { money } from "../lib/tracker";
import { chartPoints, periodChange, researchStocks } from "../lib/research";
import "../Research.css";

const dateLabel = value => new Date(`${value}T12:00:00Z`).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
const stamp = value => value ? new Date(value).toLocaleString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }) : "";

export default function Research({ positions }) {
  const stocks = researchStocks(positions);
  const [stock, setStock] = useState(stocks[0] || { market: "US", symbol: "TSLA" });
  const [market, setMarket] = useState("US"), [query, setQuery] = useState("");
  const [range, setRange] = useState("3m"), [average, setAverage] = useState(false);
  const [history, setHistory] = useState(null), [news, setNews] = useState(null), [summary, setSummary] = useState(null);
  const [chartError, setChartError] = useState(""), [newsError, setNewsError] = useState(""), [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false), [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const path = `/research/${stock.market}/${encodeURIComponent(stock.symbol)}`;

  useEffect(() => {
    let active = true;
    setHistory(null); setChartError("");
    request(`${path}/history?range=${range}`).then(data => { if (active) setHistory(data); }).catch(error => { if (active) setChartError(error.message); });
    return () => { active = false; };
  }, [path, range, retry]);
  useEffect(() => {
    let active = true;
    generation.current++;
    setNews(null); setSummary(null); setNewsError(""); setAiError(""); setAiLoading(false);
    request(`${path}/news`).then(data => { if (active) setNews(data); }).catch(error => { if (active) setNewsError(error.message); });
    return () => { active = false; generation.current++; };
  }, [path, retry]);
  async function analyze() {
    const version = generation.current;
    setAiLoading(true); setAiError("");
    try { const result = await request(`${path}/summary`, { method: "POST" }); if (generation.current === version) setSummary(result); }
    catch (error) { if (generation.current === version) setAiError(error.message); }
    finally { if (generation.current === version) setAiLoading(false); }
  }
  function search(event) {
    event.preventDefault();
    const symbol = query.trim().toUpperCase();
    if (symbol) { setStock({ market, symbol }); setQuery(""); }
  }
  const points = chartPoints(history?.history || []), change = periodChange(points);
  const last = points.at(-1), counts = news?.sentiment, total = news?.articles.length || 0;
  return (
    <section className="research-view" aria-label="Stock research">
      <div className="research-tools">
        <div className="stock-pills" role="group" aria-label="Your stocks">
          {stocks.map(item => <button key={`${item.market}:${item.symbol}`} aria-pressed={stock.market === item.market && stock.symbol === item.symbol} onClick={() => setStock(item)}>{item.symbol}<small>{item.market}</small></button>)}
        </div>
        <form className="stock-search" onSubmit={search}>
          <select aria-label="Search market" value={market} onChange={event => setMarket(event.target.value)}><option>US</option><option>MY</option></select>
          <input aria-label="Stock symbol" placeholder="Search stock" value={query} onChange={event => setQuery(event.target.value)} maxLength={15} required pattern={market === "MY" ? "[0-9]{4,5}[A-Za-z]{0,2}" : "[A-Za-z][A-Za-z0-9.\\-]{0,14}"} autoCapitalize="characters" spellCheck={false} />
          <button type="submit" aria-label="Search">↗</button>
        </form>
      </div>
      <div className="research-chart chart-panel">
        <div className="research-chart-heading">
          <div><span className="eyebrow">{stock.market} / {history?.currency || (stock.market === "MY" ? "MYR" : "USD")}</span><h2>{stock.symbol}</h2></div>
          <div className="period-switch" role="group" aria-label="Chart period">{["1m", "3m", "1y"].map(value => <button key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{value.toUpperCase()}</button>)}</div>
        </div>
        {last && <div className="research-price"><strong>{money(last.price, history.currency)}</strong>{change != null && <span className={change < 0 ? "negative" : "positive"}>{change >= 0 ? "+" : ""}{change.toFixed(2)}% <small>in view</small></span>}</div>}
        {chartError ? <div className="research-empty" role="status"><p>{chartError}</p><button onClick={() => setRetry(value => value + 1)}>Retry</button></div> : !history ? <div className="research-empty" role="status">Loading chart…</div> : !points.length ? <div className="research-empty">No daily prices in this period.</div> : <div className="price-chart" role="img" aria-label={`${stock.symbol} daily closing prices, ${points[0].date} to ${last.date}${change == null ? "" : `, ${change.toFixed(2)} percent change`}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 18, right: 2, left: 0, bottom: 0 }}>
              <defs><linearGradient id="research-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#629bff" stopOpacity={0.28} /><stop offset="100%" stopColor="#629bff" stopOpacity={0.01} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#2a3447" strokeDasharray="3 5" />
              <XAxis dataKey="date" tickFormatter={dateLabel} axisLine={false} tickLine={false} minTickGap={46} tick={{ fill: "#8192af", fontSize: 10 }} dy={10} />
              <YAxis domain={["auto", "auto"]} orientation="right" width={57} axisLine={false} tickLine={false} tick={{ fill: "#8192af", fontSize: 10 }} tickFormatter={value => Number(value).toLocaleString("en-MY", { maximumFractionDigits: 2 })} />
              <Tooltip labelFormatter={dateLabel} formatter={(value, name) => [money(value, history.currency), name]} contentStyle={{ background: "#1b2538", border: "1px solid #374761", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "#9daec9", marginBottom: 6 }} />
              <Area type="linear" dataKey="price" name="Close" stroke="#79aaff" strokeWidth={2.2} fill="url(#research-fill)" isAnimationActive={false} />
              {average && <Line type="linear" dataKey="ma" name="7-day average" stroke="#c3a5ff" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>}
        <div className="research-chart-footer"><span>{history ? `Twelve Data · close ${last?.date || "—"} · split adjusted${history.stale ? " · cached / stale" : ""}` : "Daily close"}</span><button aria-pressed={average} onClick={() => setAverage(value => !value)}>7D average</button></div>
        {history?.warning && <p className="research-warning">{history.warning}</p>}
      </div>
      <div className="research-bottom">
        <section className="research-news chart-panel" aria-label="Headlines">
          <div className="research-section-heading"><h2>Headlines</h2><small>{news ? `${news.source} · ${stamp(news.fetched_at)}${news.stale ? " · stale" : ""}` : ""}</small></div>
          {newsError ? <p role="status" className="research-warning">{newsError}</p> : !news ? <p className="research-placeholder" role="status">Loading news…</p> : !total ? <p className="research-placeholder">No recent headlines.</p> : <>
            <div className="headline-tone"><div><span>Headline tone</span><small>Keyword count</small></div><div className="tone-bar" role="img" aria-label={`${counts.positive} positive, ${counts.neutral} neutral, ${counts.negative} negative headlines`}>{["positive", "neutral", "negative"].map(tone => counts[tone] > 0 && <span key={tone} className={tone} style={{ flex: counts[tone] }} />)}</div><div className="tone-legend">{["positive", "neutral", "negative"].map(tone => <span key={tone}><i className={tone} />{counts[tone]} {tone}</span>)}</div></div>
            {news.warning && <p className="research-warning">{news.warning}</p>}
            <div className="headlines">{news.articles.map(article => <a key={article.url} href={article.url} target="_blank" rel="noopener noreferrer"><span>{article.source} <time dateTime={article.published_at}>{stamp(article.published_at)}</time></span><h3>{article.title}</h3><b aria-hidden="true">↗</b></a>)}</div>
          </>}
        </section>
        <section className="research-ai chart-panel" aria-label="AI news summary">
          <div className="research-section-heading"><h2><span className="ai-spark" aria-hidden="true">✦</span> Brief</h2><small>AI</small></div>
          {summary ? <><ul>{summary.points.map((point, index) => <li key={index}>{point.text}<span className="summary-sources">{point.sources.map(id => <a key={id} href={summary.articles.find(article => article.id === id)?.url} target="_blank" rel="noopener noreferrer" aria-label={`Source ${id}`}>[{id}]</a>)}</span></li>)}</ul><p className="research-meta">Gemini · {stamp(summary.fetched_at)}{summary.stale ? " · stale" : ""}</p>{summary.warning && <p className="research-warning">{summary.warning}</p>}</> : <div className="ai-prompt"><span aria-hidden="true">✦</span><p>Read less. Catch up.</p><button disabled={!total || aiLoading} onClick={analyze}>{aiLoading ? "Summarizing…" : "Summarize"}</button></div>}
          {aiError && <p className="research-warning" role="status">{aiError}</p>}
          <p className="ai-note">Headlines only · May be inaccurate · No buy/sell advice</p>
        </section>
      </div>
    </section>
  );
}
