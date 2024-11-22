import { Card } from "./ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { LearningItem } from "@/types";

interface AnalyticsTabProps {
  items: LearningItem[];
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export function AnalyticsTab({ items }: AnalyticsTabProps) {
  // Calculate time spent per category
  const categoryData = items.reduce((acc, item) => {
    const category = item.category || "Uncategorized";
    const hours = (item.progress?.current?.hours || 0) + (item.progress?.current?.minutes || 0) / 60;
    
    acc[category] = (acc[category] || 0) + hours;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100
  }));

  // Calculate daily activity for the past 7 days
  const now = new Date();
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const hours = items.reduce((acc, item) => {
      const sessionHours = (item.progress?.sessions || [])
        .filter(session => session.startTime.startsWith(dateStr))
        .reduce((sum, session) => {
          return sum + ((session.duration?.hours || 0) + (session.duration?.minutes || 0) / 60);
        }, 0);
      
      return acc + sessionHours;
    }, 0);

    return {
      date: dateStr,
      hours: Math.round(hours * 100) / 100
    };
  }).reverse();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-6">Time Spent by Category</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}h`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-6">Daily Activity (Past 7 Days)</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: 'short' })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [`${value} hours`, "Time Spent"]}
                />
                <Bar dataKey="hours" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Learning Insights</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600 mb-1">Total Items</h3>
            <p className="text-2xl font-semibold">{items.length}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-green-600 mb-1">Completed</h3>
            <p className="text-2xl font-semibold">
              {items.filter(item => item.completed).length}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="text-sm font-medium text-purple-600 mb-1">Categories</h3>
            <p className="text-2xl font-semibold">
              {new Set(items.map(item => item.category)).size}
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <h3 className="text-sm font-medium text-orange-600 mb-1">Total Hours</h3>
            <p className="text-2xl font-semibold">
              {Math.round(items.reduce((acc, item) => 
                acc + (item.progress?.current?.hours || 0) + (item.progress?.current?.minutes || 0) / 60
              , 0))}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
