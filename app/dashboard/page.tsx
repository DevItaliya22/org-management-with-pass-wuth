"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { ServiceCard } from "@/components/Dashboard/ServiceCard";
import { ProfitChart } from "@/components/Dashboard/ProfitChart";
import { RevenueChart } from "@/components/Dashboard/RevenueChart";
import { OrdersChart } from "@/components/Dashboard/OrdersChart";
import { ActivityList } from "@/components/Dashboard/ActivityList";
import { RoleInfo } from "@/components/Dashboard/RoleInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { Utensils, Film, ShoppingBag } from "lucide-react";

const Dashboard = () => {
  const categoryMix = [
    { name: "Food", value: 35 },
    { name: "Movies", value: 20 },
    { name: "Groceries", value: 15 },
    { name: "Pharmacy", value: 12 },
    { name: "Electronics", value: 10 },
    { name: "Clothing", value: 8 },
  ];
  const colors = [
    "#156082",
    "#E97132",
    "#196B24",
    "#0F9ED5",
    "#A02B93",
    "#4EA72E",
  ];

  // Create gradient definitions for each color
  const createGradient = (color: string, index: number) => {
    // Convert hex to RGB and create darker/lighter variants
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Create darker shade (reduce by 20% for moderate contrast)
    const darkerR = Math.max(0, Math.floor(r * 0.8));
    const darkerG = Math.max(0, Math.floor(g * 0.8));
    const darkerB = Math.max(0, Math.floor(b * 0.8));

    // Create lighter shade (increase by 12% for moderate contrast)
    const lighterR = Math.min(255, Math.floor(r * 1.12));
    const lighterG = Math.min(255, Math.floor(g * 1.12));
    const lighterB = Math.min(255, Math.floor(b * 1.12));

    const darkerColor = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
    const lighterColor = `rgb(${lighterR}, ${lighterG}, ${lighterB})`;

    return (
      <defs key={`gradient-${index}`}>
        <radialGradient id={`gradient-${index}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={darkerColor} />
          <stop offset="100%" stopColor={lighterColor} />
        </radialGradient>
      </defs>
    );
  };

  // Chart config for legend
  const chartConfig = {
    Food: {
      label: "Food",
      color: "#156082",
    },
    Movies: {
      label: "Movies",
      color: "#E97132",
    },
    Groceries: {
      label: "Groceries",
      color: "#196B24",
    },
    Pharmacy: {
      label: "Pharmacy",
      color: "#0F9ED5",
    },
    Electronics: {
      label: "Electronics",
      color: "#A02B93",
    },
    Clothing: {
      label: "Clothing",
      color: "#4EA72E",
    },
  };
  const receivablesTop = [
    { reseller: "Acme Corp", balance: 1250.5 },
    { reseller: "Globex", balance: 890.0 },
    { reseller: "Umbrella Ltd", balance: 2210.0 },
    { reseller: "Tech Solutions", balance: 1850.0 },
    { reseller: "Global Systems", balance: 675.5 },
  ];
  const disputesRecent = [
    { id: "ORD-9003", reason: "Partial fulfillment" },
    { id: "ORD-9002", reason: "Late delivery" },
    { id: "ORD-9001", reason: "Wrong item delivered" },
  ];
  const queueTop = [
    { category: "Food", depth: 42 },
    { category: "Movies", depth: 18 },
    { category: "Groceries", depth: 12 },
    { category: "Pharmacy", depth: 8 },
    { category: "Electronics", depth: 15 },
  ];
  const RADIAN = Math.PI / 180;
  const renderCategoryLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 8, fontWeight: 600 }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  return (
    <DashboardLayout>
      {/* Dashboard Content - Same for All Screen Sizes */}
      <div className="space-y-4">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <MetricCard title="Profit Latest Entry" value="$2,900" />
          <MetricCard title="Profit Last 7 Days" value="$12,450" />
          <MetricCard title="Total Revenue" value="$78,000" />
        </div>

        {/* Orders and Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          {/* Orders Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg md:text-xl font-semibold text-foreground">
                Orders
              </CardTitle>
              <span className="text-xs md:text-sm text-muted-foreground">
                3 active orders
              </span>
            </CardHeader>
            <CardContent className="space-y-2 md:space-y-3">
              <ServiceCard
                name="iPhone 15 Pro"
                icon={Utensils}
                category="Electronics"
                variant="chipotle"
                action="Pick"
              />
              <ServiceCard
                name="MacBook Air M3"
                icon={Film}
                category="Computers"
                time="410 Min"
                variant="movies"
                action="Pick"
              />
              <ServiceCard
                name="Nike Air Max"
                icon={ShoppingBag}
                category="Footwear"
                time="2 hrs"
                variant="others"
                action="Pick"
              />
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            <ProfitChart />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <RevenueChart />
              <OrdersChart />
            </div>
          </div>
        </div>

        {/* Snapshots Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Category Mix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-56">
                  <ChartContainer config={chartConfig}>
                    <PieChart>
                      {colors.map((color, idx) => createGradient(color, idx))}
                      <Pie
                        data={categoryMix}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        labelLine={false}
                        stroke="#000"
                        strokeWidth={0.1}
                      >
                        {categoryMix.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={`url(#gradient-${idx})`}
                            stroke="#000"
                            strokeWidth={0.1}
                            style={{ transition: "all 0.2s ease-in-out" }}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {categoryMix.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[idx] }}
                      />
                      <span className="text-muted-foreground truncate">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Receivables Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reseller</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivablesTop.map((r) => (
                      <TableRow key={r.reseller}>
                        <TableCell className="font-medium">
                          {r.reseller}
                        </TableCell>
                        <TableCell className="text-right">
                          ${r.balance.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Queue Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Depth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueTop.map((q) => (
                      <TableRow key={q.category}>
                        <TableCell className="font-medium">
                          {q.category}
                        </TableCell>
                        <TableCell className="text-right">{q.depth}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Section */}
        <ActivityList />
        <div className="h-[15vw] md:h-[15vw]"></div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
