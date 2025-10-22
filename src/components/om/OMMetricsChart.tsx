import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const mockData = [
  { month: "Jan", mtbf: 120, mttr: 4, availability: 98.5 },
  { month: "Fev", mtbf: 135, mttr: 3.5, availability: 98.8 },
  { month: "Mar", mtbf: 128, mttr: 4.2, availability: 98.3 },
  { month: "Abr", mtbf: 142, mttr: 3.8, availability: 99.1 },
  { month: "Mai", mtbf: 138, mttr: 3.6, availability: 98.9 },
  { month: "Jun", mtbf: 145, mttr: 3.4, availability: 99.2 },
];

export function OMMetricsChart() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>MTBF & MTTR Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="mtbf"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="MTBF (horas)"
              />
              <Line
                type="monotone"
                dataKey="mttr"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                name="MTTR (horas)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disponibilidade Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis domain={[95, 100]} className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="availability"
                fill="hsl(var(--primary))"
                radius={[8, 8, 0, 0]}
                name="Disponibilidade (%)"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
