import { useParams } from "wouter";
import { Activity, BarChart3, Filter, Gauge, LayoutDashboard, Plus, Rows3 } from "lucide-react";
import { useListDashboards } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function Dashboards() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: dashboards, isLoading } = useListDashboards(projectId!);
  const totalWidgets = dashboards?.reduce((total, dashboard) => total + dashboard.widgets.length, 0) ?? 0;
  const averageWidgets = dashboards?.length ? Math.round(totalWidgets / dashboards.length) : 0;

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case "line_chart":
        return Activity;
      case "bar_chart":
        return BarChart3;
      case "metric":
        return Gauge;
      case "table":
        return Rows3;
      case "funnel":
        return Filter;
      default:
        return LayoutDashboard;
    }
  };

  const getWidgetLabel = (type: string) => {
    switch (type) {
      case "line_chart":
        return "Serie temporal";
      case "bar_chart":
        return "Comparativo";
      case "metric":
        return "Indicador";
      case "table":
        return "Tabela";
      case "funnel":
        return "Funil";
      default:
        return "Widget";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <LayoutDashboard className="h-6 w-6 text-muted-foreground" /> Dashboards
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize visoes executivas e operacionais com widgets reutilizaveis.
            </p>
          </div>
          <Button className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Novo dashboard
          </Button>
        </div>

        {isLoading ? (
          <div className="h-40 animate-pulse rounded-2xl border border-border/50 bg-card" />
        ) : !dashboards || dashboards.length === 0 ? (
          <EmptyState
            icon={<LayoutDashboard className="w-6 h-6" />}
            title="Nenhum dashboard criado"
            description="Monte paineis dedicados para produto, receita e operacao conforme o time evolui."
            action={<Button variant="outline">Criar dashboard</Button>}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Dashboards ativos", value: dashboards.length, helper: "visoes publicadas no workspace" },
                { label: "Widgets totais", value: totalWidgets, helper: "blocos configurados hoje" },
                { label: "Media por painel", value: averageWidgets, helper: "densidade atual da interface" },
              ].map((item) => (
                <Card key={item.label} className="shadow-subtle">
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <p className="text-3xl font-bold tracking-tight">{item.value}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        Lynx boards
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {dashboards.map((dashboard) => (
                <Card
                  key={dashboard.id}
                  className="overflow-hidden border-border/60 shadow-subtle transition-all hover:-translate-y-0.5 hover:shadow-card"
                >
                  <CardHeader className="border-b bg-muted/10">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>{dashboard.name}</CardTitle>
                        <CardDescription>
                          {dashboard.description || "Painel sem descricao publicada ainda."}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-background">
                        {dashboard.widgets.length} widgets
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {dashboard.widgets.slice(0, 4).map((widget) => {
                        const Icon = getWidgetIcon(widget.type);
                        return (
                          <div key={widget.id} className="rounded-xl border bg-muted/20 p-4">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{widget.title}</p>
                                <p className="text-xs text-muted-foreground">{getWidgetLabel(widget.type)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {dashboard.widgets.length > 4 && (
                      <p className="text-xs text-muted-foreground">
                        +{dashboard.widgets.length - 4} widgets adicionais prontos para detalhamento.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
