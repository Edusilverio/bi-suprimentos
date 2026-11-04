import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface StackedBarChartProps {
  data: any[];
  categories: { key: string; label: string; color: string }[];
  xKey: string;
  title: string;
}

export function StackedBarChart({ data, categories, xKey, title }: StackedBarChartProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="title-style text-base mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis dataKey={xKey} type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {categories.map(cat => (
            <Bar key={cat.key} dataKey={cat.key} name={cat.label} fill={cat.color} stackId="a" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
