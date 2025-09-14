import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis } from "recharts";

const data = [
  { name: "Mon", value: 12 },
  { name: "Tue", value: 19 },
  { name: "Wed", value: 15 },
  { name: "Thu", value: 25 },
  { name: "Fri", value: 22 },
  { name: "Sat", value: 30 },
  { name: "Sun", value: 28 },
];

export function OrdersChart() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg font-semibold">Orders</CardTitle>
        <span className="text-xs md:text-sm text-muted-foreground">Weekly Trend</span>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-32 md:h-40">
          <LineChart data={data}>
            <defs>
              <linearGradient id="ordersGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="oklch(0.7 0.25 180)" />
                <stop offset="25%" stopColor="oklch(0.7 0.25 200)" />
                <stop offset="50%" stopColor="oklch(0.6 0.2 270)" />
                <stop offset="100%" stopColor="oklch(0.7 0.3 320)" />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="url(#ordersGradient)"
              strokeWidth={4}
              dot={{ fill: 'oklch(0.6 0.35 200)', stroke: 'oklch(0.6 0.35 200)', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 4, fill: 'oklch(0.6 0.35 200)', stroke: 'oklch(0.6 0.35 200)' }}
              className="animate-fade-in-up"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}