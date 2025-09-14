import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, ArrowUp } from "lucide-react";

const activities = [
  {
    id: 1,
    type: "Payment captured",
    amount: "$96.34",
    time: "5 min ago",
    status: "completed"
  },
  {
    id: 2,
    type: "Flights",
    time: "1 hr ago",
    status: "active",
    badge: "PTC → TOI"
  },
  {
    id: 3,
    type: "Order completed",
    time: "2 hours ago",
    status: "completed"
  }
];

export function ActivityList() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base md:text-lg font-semibold">Order Activity</CardTitle>
        <ArrowUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
              {activity.type === "Flights" && (
                <div className="p-1 rounded service-flights shrink-0">
                  <Plane className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-foreground truncate">{activity.type}</p>
                {activity.amount && (
                  <p className="text-sm md:text-lg font-bold text-foreground">{activity.amount}</p>
                )}
                {activity.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {activity.badge}
                  </Badge>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{activity.time}</span>
          </div>
        ))}
        
        <div className="pt-3 md:pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-xs text-white font-semibold">A</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium truncate">Alex completed</p>
                <p className="text-xs text-muted-foreground">Active order</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">3 hours ago</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}