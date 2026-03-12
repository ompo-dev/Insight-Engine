import { useParams } from "wouter";
import { useGetAnalyticsOverview } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Clock, MousePointerClick } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

export default function Overview() {
  const { projectId } = useParams<{ projectId: string }>();
  // Mocking 30 days data for visual completeness as API might return empty initially
  const { data: overview, isLoading } = useGetAnalyticsOverview(projectId!);

  if (isLoading) return <AppLayout><div className="animate-pulse flex flex-col gap-6"><div className="h-32 bg-muted rounded-xl"></div><div className="h-96 bg-muted rounded-xl"></div></div></AppLayout>;

  const stats = overview || {
    totalEvents: 0, totalSessions: 0, uniqueUsers: 0, avgSessionDuration: 0,
    dailyStats: [], topEvents: [], topPages: []
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Project Overview</h1>
          <p className="text-muted-foreground text-sm">Key metrics and trends for the last 30 days.</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Events" value={stats.totalEvents.toLocaleString()} icon={Activity} />
          <MetricCard title="Unique Users" value={stats.uniqueUsers.toLocaleString()} icon={Users} />
          <MetricCard title="Total Sessions" value={stats.totalSessions.toLocaleString()} icon={MousePointerClick} />
          <MetricCard title="Avg Duration" value={formatDuration(stats.avgSessionDuration)} icon={Clock} />
        </div>

        {/* Chart */}
        <Card className="rounded-2xl border-border/50 shadow-subtle overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
            <CardTitle className="text-base font-semibold">Events & Sessions Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full">
              {stats.dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(str) => format(parseISO(str), 'MMM d')} 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-card)' }}
                      labelFormatter={(lbl) => format(parseISO(lbl as string), 'MMM d, yyyy')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="events" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorEvents)" 
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Not enough data to display chart.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl border-border/50 shadow-subtle">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
              <CardTitle className="text-base font-semibold">Top Events</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {stats.topEvents.length > 0 ? stats.topEvents.map((event, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <span className="font-mono text-sm font-medium text-foreground">{event.name}</span>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">{event.count.toLocaleString()}</span>
                  </div>
                )) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">No events recorded yet.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-subtle">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
              <CardTitle className="text-base font-semibold">Top Pages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {stats.topPages.length > 0 ? stats.topPages.map((page, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <span className="text-sm truncate max-w-[70%] text-foreground">{page.url}</span>
                    <div className="flex items-center gap-4 text-sm">
                       <span className="text-muted-foreground">{page.avgDuration ? formatDuration(page.avgDuration) : '-'}</span>
                       <span className="font-medium bg-muted px-2 py-1 rounded-md">{page.count.toLocaleString()} views</span>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">No pageviews recorded yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string, value: string | number, icon: any }) {
  return (
    <Card className="rounded-2xl border-border/50 shadow-subtle hover:shadow-card transition-all">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>
        </div>
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-foreground/70" />
        </div>
      </CardContent>
    </Card>
  );
}
