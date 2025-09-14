import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Utensils, Film, Plane, Package } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const services = [
  { name: "Chipotle", icon: Utensils, count: 6, variant: "chipotle" as const },
  { name: "Movies", icon: Film, count: 0, variant: "movies" as const },
  { name: "Flights", icon: Plane, count: 0, variant: "flights" as const },
  { name: "Others", icon: Package, count: 0, variant: "others" as const },
];

const chartData = [
  { value: 20 }, { value: 35 }, { value: 25 }, { value: 50 }, 
  { value: 40 }, { value: 65 }, { value: 45 }, { value: 70 }
];

export function MobileInterface() {
  return (
    <div className="space-y-6">
      {/* Mobile Header */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">6:41</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="h-1 w-1 bg-foreground rounded-full"></div>
              <div className="h-1 w-1 bg-foreground rounded-full"></div>
              <div className="h-1 w-1 bg-muted-foreground rounded-full"></div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* New Order Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">New Order</h2>
            <Button variant="ghost" size="icon">
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Services Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Services</span>
              <span className="text-xs text-muted-foreground">At 1:00</span>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {services.map((service) => {
                const Icon = service.icon;
                const serviceStyles = {
                  chipotle: "service-chipotle",
                  movies: "service-movies", 
                  flights: "service-flights",
                  others: "service-others"
                };
                
                return (
                  <div key={service.name} className="text-center">
                    <div className={`relative p-3 rounded-xl ${serviceStyles[service.variant]} mb-2`}>
                      <Icon className="h-6 w-6 text-white mx-auto" />
                      {service.count > 0 && (
                        <Badge 
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white"
                        >
                          {service.count}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-foreground">{service.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Earnings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Earnings</span>
              <span className="text-xs text-muted-foreground">3C</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">$0</span>
              <span className="text-lg font-semibold text-foreground">$0.0</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total revevens</span>
              <span className="text-muted-foreground">$ 0</span>
            </div>

            <Button className="w-full gradient-brand text-white font-medium py-3 rounded-xl">
              Order Form
            </Button>
          </div>

          {/* Staff Chart */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Staff</span>
              <span className="text-xs text-muted-foreground">Action ago</span>
            </div>
            
            <div className="h-24 rounded-lg bg-muted/20 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="mobileGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#mobileGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">$0 From</span>
              <span className="text-muted-foreground">Lest 20 Days &gt;</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}