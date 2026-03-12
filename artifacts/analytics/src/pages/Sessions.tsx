import { format, parseISO } from "date-fns";
import { ArrowRight, Clock, Users } from "lucide-react";
import { Link, useParams } from "wouter";
import { useListSessions } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/ui/empty-state";

export default function Sessions() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: sessionData, isLoading } = useListSessions(projectId!, { limit: 50 });

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "-";
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}m ${remainder}s`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sessoes</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe jornadas, duracao e paginas de entrada de cada visita.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-subtle">
          {isLoading ? (
            <div className="animate-pulse p-8 text-center text-muted-foreground">Carregando sessoes...</div>
          ) : !sessionData || sessionData.sessions.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="Nenhuma sessao registrada"
              description="Quando os usuarios navegarem e dispararem eventos, as sessoes vao aparecer aqui."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/50 bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-medium">Usuario</th>
                    <th className="px-6 py-4 font-medium">Inicio</th>
                    <th className="px-6 py-4 font-medium">Duracao</th>
                    <th className="px-6 py-4 font-medium">Eventos</th>
                    <th className="px-6 py-4 font-medium">Pagina inicial</th>
                    <th className="px-6 py-4 text-right font-medium">Acao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sessionData.sessions.map((session) => (
                    <tr key={session.id} className="group transition-colors hover:bg-muted/20">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {(session.userId || session.anonymousId || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="w-24 truncate font-mono text-xs text-muted-foreground">
                            {session.userId || session.anonymousId}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-foreground">
                        {format(parseISO(session.startedAt), "MMM d, HH:mm")}
                      </td>
                      <td className="flex items-center gap-1 px-6 py-4 text-muted-foreground">
                        <Clock className="h-3 w-3" /> {formatDuration(session.duration)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded bg-muted px-2 py-1 text-xs font-medium">
                          {session.eventCount}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-4 text-muted-foreground">
                        {session.entryPage || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/projects/${projectId}/sessions/${session.id}`}
                          className="inline-flex items-center justify-center rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground opacity-0 transition-colors hover:bg-secondary/80 group-hover:opacity-100"
                        >
                          Ver detalhes <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
