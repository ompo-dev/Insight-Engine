import { useRoute, Link } from "wouter";
import { Activity, MousePointerClick, Clock, User, ArrowRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useGetAnalyticsOverview } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatDuration, formatShortDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function Overview() {
  const [, params] = useRoute("/projects/:projectId/overview");
  const projectId = params?.projectId || "";

  const { data: overview, isLoading } = useGetAnalyticsOverview(projectId, undefined, { query: { enabled: !!projectId } });

  const stats = [
    { title: "Total de Eventos", value: formatNumber(overview?.totalEvents), icon: Activity, color: "text-blue-500" },
    { title: "Sessões", value: formatNumber(overview?.totalSessions), icon: MousePointerClick, color: "text-indigo-500" },
    { title: "Usuários Únicos", value: formatNumber(overview?.uniqueUsers), icon: User, color: "text-purple-500" },
    { title: "Duração Média", value: formatDuration(overview?.avgSessionDuration), icon: Clock, color: "text-emerald-500" },
  ];

  return (
    <AppLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">Análise de produto e engajamento dos últimos 30 dias.</p>
        </div>
        <Link href={`/projects/${projectId}/metrics`}>
          <a className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors">
            Ver Métricas de Receita <ArrowRight className="w-4 h-4" />
          </a>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <Card key={i} className="shadow-subtle hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-background border ${stat.color.replace('text-', 'bg-').replace('500', '500/10')}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mb-1" />
              ) : (
                <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
              )}
              <p className="text-sm font-medium text-muted-foreground mt-1">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-8 shadow-subtle overflow-hidden">
        <CardHeader className="bg-muted/10 border-b pb-4">
          <CardTitle>Eventos e Sessões</CardTitle>
          <CardDescription>Volume de tráfego diário</CardDescription>
        </CardHeader>
        <CardContent className="p-6 h-[350px]">
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.dailyStats || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={formatShortDate} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-floating)' }}
                  labelFormatter={(v) => formatShortDate(v as string)}
                />
                <Area type="monotone" dataKey="events" name="Eventos" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
                <Area type="monotone" dataKey="sessions" name="Sessões" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-subtle">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">Top Eventos</CardTitle>
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
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : overview?.topEvents.map((event, i) => (
                  <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-sm text-foreground/80">{event.name}</TableCell>
                    <TableCell className="text-right font-medium">{formatNumber(event.count)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-subtle">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">Top Páginas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Página</TableHead>
                  <TableHead className="text-right">Visualizações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : overview?.topPages.map((page, i) => (
                  <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="truncate max-w-[200px]" title={page.url}>
                      {page.url.replace(/^https?:\/\/[^\/]+/, '')}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatNumber(page.count)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
