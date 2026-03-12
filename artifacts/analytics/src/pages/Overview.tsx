import { Link, useParams } from "wouter";
import { Activity, ArrowRight, Clock, MousePointerClick, User } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGetAnalyticsOverview } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration, formatNumber, formatShortDate } from "@/lib/utils";

export default function Overview() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const { data: overview, isLoading } = useGetAnalyticsOverview(projectId, undefined, {
    query: { enabled: !!projectId },
  });

  const topEvents = overview?.topEvents ?? [];
  const topPages = overview?.topPages ?? [];
  const dailyStats = overview?.dailyStats ?? [];

  const stats = [
    { title: "Total de eventos", value: formatNumber(overview?.totalEvents), icon: Activity, color: "text-blue-500" },
    { title: "Sessoes", value: formatNumber(overview?.totalSessions), icon: MousePointerClick, color: "text-indigo-500" },
    { title: "Usuarios unicos", value: formatNumber(overview?.uniqueUsers), icon: User, color: "text-purple-500" },
    { title: "Duracao media", value: formatDuration(overview?.avgSessionDuration), icon: Clock, color: "text-emerald-500" },
  ];

  return (
    <AppLayout>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Visao geral</h1>
          <p className="mt-1 text-muted-foreground">Analise de produto e engajamento dos ultimos 30 dias.</p>
        </div>
        <Link
          href={`/projects/${projectId}/metrics`}
          className="flex items-center gap-1 rounded-lg bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 hover:text-primary/80"
        >
          Ver metricas de receita <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-subtle transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div
                  className={`rounded-lg border bg-background p-2 ${stat.color.replace("text-", "bg-").replace("500", "500/10")}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="mb-1 h-8 w-24" />
              ) : (
                <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
              )}
              <p className="mt-1 text-sm font-medium text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-8 overflow-hidden shadow-subtle">
        <CardHeader className="border-b bg-muted/10 pb-4">
          <CardTitle>Eventos e sessoes</CardTitle>
          <CardDescription>Volume de trafego diario</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] p-6">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "var(--shadow-floating)",
                  }}
                  labelFormatter={(value) => formatShortDate(value as string)}
                />
                <Area
                  type="monotone"
                  dataKey="events"
                  name="Eventos"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEvents)"
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Sessoes"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSessions)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-subtle">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-lg">Top eventos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-right">Contagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-12" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  topEvents.map((event, index) => (
                    <TableRow key={`${event.name}-${index}`} className="transition-colors hover:bg-muted/30">
                      <TableCell className="font-mono text-sm text-foreground/80">{event.name}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(event.count)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-subtle">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-lg">Top paginas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Pagina</TableHead>
                  <TableHead className="text-right">Visualizacoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-12" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  topPages.map((page, index) => (
                    <TableRow key={`${page.url}-${index}`} className="transition-colors hover:bg-muted/30">
                      <TableCell className="max-w-[200px] truncate" title={page.url}>
                        {page.url.replace(/^https?:\/\/[^/]+/, "")}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(page.count)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
