import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, Bar,
} from 'recharts';

interface ComboChartProps {
  data: any[];
  barKey: string;
  lineKey: string;
  xKey: string;
  barLabel: string;
  lineLabel: string;
  title: string;
  barColor?: string;
  lineColor?: string;
}

export function ComboChart({ data, barKey, lineKey, xKey, barLabel, lineLabel, title, barColor, lineColor }: ComboChartProps) {
  const bColor = barColor ?? 'hsl(var(--chart-primary))';
  const lColor = lineColor ?? 'hsl(var(--chart-secondary))';
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-4">
      <h3 className="title-style text-base mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey={barKey} name={barLabel} fill={bColor} radius={[4, 4, 0, 0]} />
          <Line dataKey={lineKey} name={lineLabel} stroke={lColor} strokeWidth={2.5} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
