import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ArrowRight, CheckCircle2, Filter, TimerReset, Users } from "lucide-react";
import { Link, useParams } from "wouter";
import { useGetFunnel } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDuration, formatPercent, formatRelative } from "@/lib/utils";

export default function FunnelDetail() {
  const { projectId, funnelId } = useParams<{ projectId: string; funnelId: string }>();
  const { data, isLoading } = useGetFunnel(projectId!, funnelId!);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-xl bg-card" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl border border-border/50 bg-card" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-2xl border border-border/50 bg-card" />
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <EmptyState
          icon={<Filter className="h-6 w-6" />}
          title="Funil nao encontrado"
          description="Esse funil pode ter sido removido ou ainda nao possui analise disponivel."
          action={
            <Button asChild variant="outline">
              <Link href={`/projects/${projectId}/funnels`}>Voltar para funis</Link>
            </Button>
          }
        />
      </AppLayout>
    );
  }

  const { funnel, totalEntrants, completedSessions, overallConversionRate, avgCompletionTime, steps, recentSessions } =
    data;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href={`/projects/${projectId}/funnels`}>
                <ArrowLeft className="h-4 w-4" />
                Voltar para funis
              </Link>
            </Button>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary">
                  Analise mockada
                </Badge>
                <Badge variant="secondary">{funnel.steps.length} etapas</Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{funnel.name}</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                {funnel.description || "Acompanhe a progressao dos usuarios por cada etapa do funil."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Entradas"
            value={totalEntrants.toLocaleString("pt-BR")}
            helper="sessoes que iniciaram o fluxo"
            icon={<Users className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            title="Conclusoes"
            value={completedSessions.toLocaleString("pt-BR")}
            helper="sessoes que chegaram ao fim"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          />
          <MetricCard
            title="Conversao geral"
            value={formatPercent(overallConversionRate)}
            helper="do primeiro ao ultimo passo"
            icon={<ArrowRight className="h-5 w-5 text-sky-500" />}
          />
          <MetricCard
            title="Tempo medio"
            value={avgCompletionTime !== null && avgCompletionTime !== undefined ? formatDuration(avgCompletionTime) : "-"}
            helper="entre a primeira e a ultima etapa"
            icon={<TimerReset className="h-5 w-5 text-amber-500" />}
          />
        </div>

        <Card className="overflow-hidden border-border/50 shadow-subtle">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle>Leitura por etapa</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {steps.map((step, index) => {
                const isLast = index === steps.length - 1;
                return (
                  <div
                    key={`${step.step.order}-${step.step.eventName}`}
                    className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {step.step.order}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{step.step.label}</p>
                          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                            {step.step.eventName}
                          </p>
                        </div>
                      </div>
                      {!isLast ? (
                        <Badge variant="outline" className="text-xs">
                          queda {formatPercent(step.dropOffRate)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          final
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sessoes que chegaram aqui</span>
                          <span className="font-semibold text-foreground">{step.reachedSessions}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${Math.max(6, step.conversionRate * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-muted/30 p-3">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Conversao</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {formatPercent(step.conversionRate)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-muted/30 p-3">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Tempo medio</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {step.avgTimeToNextStep !== null && step.avgTimeToNextStep !== undefined
                              ? formatDuration(step.avgTimeToNextStep)
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/50 shadow-subtle">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle>Sessoes recentes no funil</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentSessions.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="Nenhuma sessao entrou nesse funil"
                description="Os dados mock aparecem aqui assim que houver combinacao entre eventos e etapas."
                className="border-0 rounded-none bg-transparent"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/50 bg-muted/30 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-medium">Sessao</th>
                      <th className="px-6 py-4 font-medium">Usuario</th>
                      <th className="px-6 py-4 font-medium">Entrada</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium text-right">Inicio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {recentSessions.map((session) => (
                      <tr key={session.sessionId} className="hover:bg-muted/20">
                        <td className="px-6 py-4 font-mono text-xs text-foreground">{session.sessionId}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {session.userId || session.anonymousId || "Anonimo"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{session.entryPage || "-"}</td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={
                              session.completed
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                                : "border-amber-500/20 bg-amber-500/10 text-amber-600"
                            }
                          >
                            {session.completed ? "Concluiu" : "Em progresso"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right text-muted-foreground">
                          <div>{format(parseISO(session.startedAt), "dd/MM HH:mm")}</div>
                          <div className="text-xs">{formatRelative(session.startedAt)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
};

function MetricCard({ title, value, helper, icon }: MetricCardProps) {
  return (
    <Card className="border-border/50 shadow-subtle">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40">{icon}</div>
        </div>
        <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
        <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
