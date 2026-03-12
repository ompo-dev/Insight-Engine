import { useParams } from "wouter";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, TrendingDown, Target } from "lucide-react";
import { useGetInsights, useGetAlerts } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Insights() {
  const { projectId = "" } = useParams<{ projectId: string }>();

  const { data: insightsRes, isLoading: insightsLoading } = useGetInsights(projectId, { query: { enabled: !!projectId } });
  const { data: alerts, isLoading: alertsLoading } = useGetAlerts(projectId, { query: { enabled: !!projectId } });

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'positive': return { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
      case 'warning': return { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" };
      case 'critical': return { color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" };
      default: return { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" };
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'growth': return TrendingUp;
      case 'churn': return TrendingDown;
      case 'revenue': return Target;
      default: return Lightbulb;
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Insights IA
        </h1>
        <p className="text-muted-foreground mt-1">Análises automatizadas e recomendações para o crescimento do seu SaaS.</p>
      </div>

      <div className="space-y-8">
        {/* ALERTS SECTION */}
        <section>
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Atenção Necessária
          </h2>
          
          {alertsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : alerts?.length === 0 ? (
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">Tudo limpo!</h3>
                  <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">Nenhuma anomalia crítica detectada nos seus dados.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts?.map(alert => (
                <div key={alert.id} className={cn("p-4 rounded-xl border flex items-start gap-4", alert.severity === 'critical' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20')}>
                  <div className={cn("mt-0.5 p-2 rounded-lg", alert.severity === 'critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500')}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{alert.title}</h3>
                      <Badge variant="outline" className={alert.severity === 'critical' ? 'text-rose-500 border-rose-500/30' : 'text-amber-500 border-amber-500/30'}>
                        {alert.severity === 'critical' ? 'Crítico' : 'Aviso'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* INSIGHTS GRID */}
        <section>
          <h2 className="text-xl font-bold tracking-tight mb-4">Descobertas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insightsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
            ) : insightsRes?.insights.length === 0 ? (
              <p className="text-muted-foreground col-span-2">A inteligência artificial ainda está processando seus dados para gerar recomendações.</p>
            ) : (
              insightsRes?.insights.map(insight => {
                const styles = getSeverityStyles(insight.severity);
                const Icon = getIcon(insight.type);
                
                return (
                  <Card key={insight.id} className={cn("shadow-subtle overflow-hidden border", styles.border)}>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn("p-2.5 rounded-lg", styles.bg)}>
                          <Icon className={cn("w-5 h-5", styles.color)} />
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {insight.type}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold mb-2">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        {insight.description}
                      </p>
                      
                      {insight.recommendation && (
                        <div className="mt-auto bg-muted/50 p-3 rounded-lg border">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Recomendação</span>
                          <p className="text-sm font-medium">{insight.recommendation}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
