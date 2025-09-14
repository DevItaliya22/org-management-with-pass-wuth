import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";

const data = [
  { name: "Jan", value: 120 },
  { name: "Feb", value: 190 },
  { name: "Mar", value: 300 },
  { name: "Apr", value: 250 },
  { name: "May", value: 400 },
  { name: "Jun", value: 350 },
];

export function RevenueChart() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg font-semibold">Revenue</CardTitle>
        <span className="text-xs md:text-sm text-muted-foreground">Monthly Overview</span>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-32 md:h-40">
          <BarChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="oklch(0.6 0.35 180)" />
                <stop offset="25%" stopColor="oklch(0.6 0.35 200)" />
                <stop offset="50%" stopColor="oklch(0.5 0.3 270)" />
                <stop offset="100%" stopColor="oklch(0.6 0.4 320)" />
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
            <Bar
              dataKey="value"
              fill="url(#revenueGradient)"
              radius={[2, 2, 0, 0]}
              className="animate-fade-in-up"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}