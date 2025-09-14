import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  className?: string;
}

export function MetricCard({ title, value, className }: MetricCardProps) {
  return (
    <Card className={cn("transition-smooth hover:shadow-lg", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl md:text-3xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}