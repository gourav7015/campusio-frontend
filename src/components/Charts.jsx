import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ScatterChart, Scatter } from 'recharts';

/** Series colours come from the design tokens; the first colour leads, the rest are kept apart by hue. */
export const PALETTE = ['rgb(var(--c-primary))', 'rgb(var(--c-success))', 'rgb(var(--c-warning))', 'rgb(var(--c-danger))', 'rgb(var(--c-fg-3))', 'rgb(var(--c-tone))', 'rgb(var(--c-fg-2))', 'rgb(var(--c-border-strong))'];
const axis = { stroke: 'var(--muted)', fontSize: 12, tickLine: false, axisLine: false, tick: { fill: 'var(--muted)' } };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Show ISO dates (2026-11-05) as "5 Nov" and months (2026-11) as "Nov 26". */
export const tick = (v) => {
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${Number(s.slice(8))} ${MON[Number(s.slice(5, 7)) - 1]}`;
  if (/^\d{4}-\d{2}$/.test(s)) return `${MON[Number(s.slice(5, 7)) - 1]} ${s.slice(2, 4)}`;
  return s;
};
const ChartEmpty = ({ text = 'Not enough data yet' }) => <div className="empty small">{text}</div>;

export function TrendChart({ data, x, lines, height = 240, domain = [0, 100], unit = '%' }) {
  if (!data?.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={x} {...axis} tickFormatter={tick} /><YAxis domain={domain} {...axis} tickFormatter={(v) => `${v}${unit}`} />
        <Tooltip formatter={(v) => `${v}${unit}`} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }} />
        {lines.length > 1 && <Legend wrapperStyle={{ color: 'var(--text)' }} />}
        {lines.map((l, i) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.name || l.key} stroke={l.color || PALETTE[i]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** `format` shows the amounts on the axis and in the tip in a friendlier way (for example ₹1.5L). */
export function BarsChart({ data, x, bars, height = 240, domain, stacked, unit = '', format }) {
  if (!data?.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: format ? 4 : -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={x} {...axis} tickFormatter={tick} /><YAxis domain={domain} allowDecimals={false} {...axis} tickFormatter={format ? (v) => format(v, true) : undefined} width={format ? 52 : undefined} />
        <Tooltip formatter={(v) => (format ? format(v) : `${v}${unit}`)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }} />
        {bars.length > 1 && <Legend wrapperStyle={{ color: 'var(--text)' }} />}
        {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} name={b.name || b.key} fill={b.color || PALETTE[i]} stackId={stacked ? 's' : undefined} radius={[5, 5, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, name = 'name', value = 'value', height = 220 }) {
  if (!data?.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={value} nameKey={name} innerRadius={55} outerRadius={85} paddingAngle={2}>{data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie>
        <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }} /><Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ScatterPlot({ data, x, y, xLabel, yLabel, height = 240 }) {
  if (!data?.length) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 12, left: -12, bottom: 12 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis type="number" dataKey={x} name={xLabel} domain={[0, 100]} {...axis} label={{ value: xLabel, position: 'insideBottom', offset: -6, fill: 'var(--muted)', fontSize: 12 }} />
        <YAxis type="number" dataKey={y} name={yLabel} domain={[0, 100]} {...axis} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }} />
        <Scatter data={data} fill={PALETTE[0]} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
