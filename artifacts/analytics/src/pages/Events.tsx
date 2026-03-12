import { useRoute } from "wouter";
import { Activity, Clock } from "lucide-react";
import { useListEvents } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/utils";

export default function Events() {
  const [, params] = useRoute("/projects/:projectId/events");
  const projectId = params?.projectId || "";

  const { data, isLoading } = useListEvents(projectId, { limit: 50 }, { query: { enabled: !!projectId, refetchInterval: 10000 } });

  const getEventColor = (name: string) => {
    if (name.includes('pageview')) return "bg-blue-500/10 text-blue-600 border-blue-200";
    if (name.includes('click')) return "bg-purple-500/10 text-purple-600 border-purple-200";
    if (name.includes('purchase') || name.includes('signup')) return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    return "bg-slate-500/10 text-slate-600 border-slate-200";
  };

  return (
    <AppLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" /> Eventos
          </h1>
          <p className="text-muted-foreground mt-1">Stream de eventos em tempo real.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      <Card className="shadow-subtle overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead className="hidden md:table-cell">URL / Propriedades</TableHead>
              <TableHead className="text-right">Tempo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  Nenhum evento recebido ainda.
                </TableCell>
              </TableRow>
            ) : (
              data?.events.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/30 transition-colors font-mono text-sm">
                  <TableCell>
                    <Badge variant="outline" className={getEventColor(e.name)}>
                      {e.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.userId || e.anonymousId || 'Anônimo'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[300px]" title={e.url ?? undefined}>
                    {e.url ? new URL(e.url).pathname : '-'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Clock className="w-3 h-3 opacity-50" />
                      {formatRelative(e.timestamp)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}
