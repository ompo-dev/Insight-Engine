import { useMemo } from "react";
import { BrainCircuit, LayoutTemplate, X } from "lucide-react";
import { specialistAgentDefinitions, teamPersonaMap, type TeamPersonaId } from "@/lib/personas/team-personas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceItemEditor } from "@/components/workspace/WorkspaceItemEditor";
import { useGetCollectionSnippets, useListCollectionRecords } from "@/lib/data/hooks";
import { pluginManifestMap } from "@/lib/workspace/registry";
import { getWorkspaceNodeActions } from "@/lib/workspace/presenters";
import { formatMoney, formatPercent, formatRelative } from "@/lib/utils";
import { resolveTelemetryItem, type TelemetryItemDefinition } from "@/lib/telemetry/items";
import { cn } from "@/lib/utils";
import type {
  CanvasNode,
  WorkspaceInspectorTab,
  WorkspaceItemEditorSection,
  WorkspaceNodeBinding,
  WorkspaceNodePresentation,
} from "@/lib/workspace/types";
import type { useWorkspaceData } from "@/lib/workspace/use-workspace-data";

type WorkspaceDataSnapshot = ReturnType<typeof useWorkspaceData>;

interface WorkspaceInspectorProps {
  projectId: string;
  roleId: TeamPersonaId;
  node: CanvasNode | null;
  presentation: WorkspaceNodePresentation | null;
  data: WorkspaceDataSnapshot;
  tab: WorkspaceInspectorTab;
  onTabChange: (tab: WorkspaceInspectorTab) => void;
  onClose: () => void;
  onAction: (actionId: string, binding: WorkspaceNodeBinding, nodeId: string) => void;
  focusSection?: WorkspaceItemEditorSection | null;
  chrome?: "panel" | "dock";
}

export function WorkspaceInspector({
  projectId,
  roleId,
  node,
  presentation,
  data,
  tab,
  onTabChange,
  onClose,
  onAction,
  focusSection,
  chrome = "panel",
}: WorkspaceInspectorProps) {
  const dock = chrome === "dock";
  const shellClassName = cn(
    "flex h-full flex-col overflow-hidden rounded-[28px]",
    dock ? "workspace-inspector-dock" : "workspace-inspector-panel",
    dock
      ? "border border-white/10 bg-[#10141a]/86 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      : "border border-border/60 bg-card",
  );
  const sectionBorderClassName = dock ? "border-white/8" : "border-border/60";
  const iconShellClassName = dock ? "rounded-2xl border border-white/8 bg-white/5 p-3" : "rounded-2xl border border-border/60 bg-muted/20 p-3";
  const headingClassName = dock ? "text-lg font-semibold text-white" : "text-lg font-semibold text-foreground";
  const bodyTextClassName = dock ? "mt-1 text-sm text-white/55" : "mt-1 text-sm text-muted-foreground";

  const binding = node?.binding ?? null;
  const item = useMemo(
    () => (binding?.kind === "item" ? resolveTelemetryItem(data.items, binding.entityId) : undefined),
    [binding, data.items],
  );

  const recordsQuery = useListCollectionRecords(
    projectId,
    item?.legacy?.kind === "collection" ? item.slug : "",
    { limit: 8 },
    { query: { enabled: binding?.kind === "item" && item?.legacy?.kind === "collection" } },
  );
  const snippetsQuery = useGetCollectionSnippets(
    projectId,
    item?.legacy?.kind === "collection" ? item.slug : "",
    { query: { enabled: binding?.kind === "item" && item?.legacy?.kind === "collection" } },
  );

  if (!binding || !node || !presentation) {
    return (
      <div className={cn("flex h-full items-center justify-center p-6", dock && shellClassName)}>
        <EmptyState
          icon={<LayoutTemplate className="h-5 w-5" />}
          title="Selecione um no"
          description="O inspector mostra detalhes, configuracao e acoes do bloco selecionado."
        />
      </div>
    );
  }
  if (binding.kind === "item" && item?.mode === "custom") {
    const Icon = presentation.icon;

    return (
      <div className={shellClassName}>
        {!dock ? (
          <div className={cn("flex items-start justify-between border-b px-5 py-4", sectionBorderClassName)}>
            <div className="flex items-start gap-3">
              <div className={iconShellClassName}>
                <Icon className={`h-5 w-5 ${presentation.accentClassName}`} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={headingClassName}>{presentation.title}</h2>
                  <Badge variant="outline">{presentation.kindLabel}</Badge>
                </div>
                <p className={bodyTextClassName}>{presentation.summary}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <ScrollArea className="min-h-0 flex-1 overscroll-contain">
          <div className="p-5">
            <WorkspaceItemEditor
              projectId={projectId}
              item={item}
              items={data.items}
              systemMetrics={data.systemMetrics}
              focusSection={focusSection}
            />
          </div>
        </ScrollArea>
      </div>
    );
  }

  const Icon = presentation.icon;
  const actions = getWorkspaceNodeActions(binding, item);

  return (
    <div className={shellClassName}>
      {!dock ? (
        <div className={cn("flex items-start justify-between border-b px-5 py-4", sectionBorderClassName)}>
          <div className="flex items-start gap-3">
            <div className={iconShellClassName}>
              <Icon className={`h-5 w-5 ${presentation.accentClassName}`} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={headingClassName}>{presentation.title}</h2>
                <Badge variant="outline">{presentation.kindLabel}</Badge>
              </div>
              <p className={bodyTextClassName}>{presentation.summary}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(value) => onTabChange(value as WorkspaceInspectorTab)} className="flex min-h-0 flex-1 flex-col">
        <div className={cn("border-b px-4 py-3", sectionBorderClassName)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visao</TabsTrigger>
            <TabsTrigger value="data">Dados</TabsTrigger>
            <TabsTrigger value="actions">Acoes</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="min-h-0 flex-1 overscroll-contain">
          <div className="space-y-5 p-5">
            <TabsContent value="overview" className="mt-0 space-y-4">
              <Card className="border-border/60 shadow-none">
                <CardHeader>
                  <CardTitle>{presentation.headline}</CardTitle>
                  <CardDescription>{presentation.summary}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {presentation.metrics.map((metricItem) => (
                    <div key={metricItem.label} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{metricItem.label}</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{metricItem.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {presentation.signal ? (
                <Card className="border-border/60 shadow-none">
                  <CardHeader>
                    <CardTitle>Leitura contextual</CardTitle>
                    <CardDescription>{teamPersonaMap[roleId].label}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{presentation.signal}</p>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="data" className="mt-0 space-y-4">
              {renderDataTab({ binding, roleId, data, item, records: recordsQuery.data, snippets: snippetsQuery.data })}
            </TabsContent>

            <TabsContent value="actions" className="mt-0 space-y-4">
              <Card className="border-border/60 shadow-none">
                <CardHeader>
                  <CardTitle>Acoes disponiveis</CardTitle>
                  <CardDescription>As acoes principais operam sobre o no atual e o canvas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {actions.map((action) => (
                    <Button
                      key={action.id}
                      variant={action.kind === "primary" ? "default" : action.kind === "danger" ? "destructive" : "outline"}
                      className="w-full justify-start"
                      onClick={() => onAction(action.id, binding, node.id)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="config" className="mt-0 space-y-4">
              {renderConfigTab({ projectId, binding, item, data, focusSection })}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function renderDataTab(input: {
  binding: WorkspaceNodeBinding;
  roleId: TeamPersonaId;
  data: WorkspaceDataSnapshot;
  item?: TelemetryItemDefinition;
  records?: ReturnType<typeof useListCollectionRecords>["data"];
  snippets?: ReturnType<typeof useGetCollectionSnippets>["data"];
}) {
  const { binding, roleId, data, item, records, snippets } = input;

  if (binding.kind === "item" && item) {
    if (item.mode === "custom") {
      return (
        <div className="space-y-4">
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Runtime do no</CardTitle>
              <CardDescription>Recebimento, transformacao, exibicao e acao no mesmo objeto.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Preview" value={item.result?.text ?? item.expressionPreview?.text ?? "Sem preview"} />
              <MetricCard label="Display" value={item.displayEnabled ? item.presentation ?? "stat" : "draft"} />
              <MetricCard label="Acao" value={item.actionEnabled ? item.actionType ?? "webhook" : "desligada"} />
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Estado atual</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Ultimo run" value={item.lastRun ? `${item.lastRun.status} em ${item.lastRun.latencyMs}ms` : "Sem execucao"} />
              <MetricCard label="Ultima entrega" value={item.lastDelivery ? item.lastDelivery.status : "Sem entrega"} />
            </CardContent>
          </Card>

          {item.expression ? (
            <Card className="border-border/60 shadow-none">
              <CardHeader>
                <CardTitle>Expressao</CardTitle>
              </CardHeader>
              <CardContent>
                <CodeBlock code={item.expression} />
                {item.expressionPreview?.error ? <p className="mt-3 text-sm text-destructive">{item.expressionPreview.error}</p> : null}
              </CardContent>
            </Card>
          ) : null}

          {item.inputEnabled ? (
            <Card className="border-border/60 shadow-none">
              <CardHeader>
                <CardTitle>Recebimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock code={JSON.stringify(item.schema ?? {}, null, 2)} />
                <CodeBlock code={JSON.stringify(item.samplePayload ?? {}, null, 2)} />
                {item.snippets ? <CodeBlock code={item.snippets.send} /> : null}
                {item.snippets ? <CodeBlock code={item.snippets.generatedClient} /> : null}
              </CardContent>
            </Card>
          ) : null}

          {item.actionEnabled ? (
            <Card className="border-border/60 shadow-none">
              <CardHeader>
                <CardTitle>Saida e entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricCard label="Target" value={item.actionTarget ?? "Sem target"} />
                <MetricCard label="Live" value={item.actionLive ? "ativo" : "manual"} />
                <CodeBlock code={item.actionPayloadExpression ?? "result"} />
              </CardContent>
            </Card>
          ) : null}

          {item.materializedDataset ? (
            <Card className="border-border/60 shadow-none">
              <CardHeader>
                <CardTitle>Preview de dataset</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleTable columns={item.materializedDataset.columns.map((column) => column.label)} rows={item.materializedDataset.rows} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      );
    }

    if (item.mode === "capture") {
      return (
        <div className="space-y-4">
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Entrada tipada</CardTitle>
              <CardDescription>Contrato de ingestao e payload de referencia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CodeBlock code={JSON.stringify(item.schema ?? {}, null, 2)} />
              <CodeBlock code={JSON.stringify(item.samplePayload ?? {}, null, 2)} />
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Ultimos registros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(records?.records ?? []).map((record) => (
                <div key={record.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{record.id}</p>
                    <span className="text-xs text-muted-foreground">{formatRelative(record.ingestedAt)}</span>
                  </div>
                  <CodeBlock code={JSON.stringify(record.payload, null, 2)} compact />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Snippets SDK</CardTitle>
              <CardDescription>Destino: projeto + item + payload.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CodeBlock code={snippets?.bun ?? ""} />
              <CodeBlock code={snippets?.react ?? ""} />
              <CodeBlock code={snippets?.curl ?? ""} />
            </CardContent>
          </Card>
        </div>
      );
    }

    if (item.mode === "value") {
      return (
        <div className="space-y-4">
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Valor materializado</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Valor" value={item.materializedMetric?.formattedValue ?? "-"} />
              <MetricCard label="Delta" value={item.materializedMetric?.deltaLabel ?? "-"} />
              <MetricCard label="Trend" value={item.materializedMetric?.trend ?? "neutral"} />
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Serie curta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(item.materializedMetric?.series ?? []).map((point) => (
                <div key={point.label} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm">
                  <span>{point.label}</span>
                  <span className="font-medium text-foreground">{point.value.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>DSL</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={JSON.stringify(item.dsl ?? {}, null, 2)} />
            </CardContent>
          </Card>
        </div>
      );
    }

    if (item.mode === "list") {
      return (
        <div className="space-y-4">
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Lista materializada</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {(item.materializedDataset?.summary ?? []).map((summary) => (
                <MetricCard key={summary.label} label={summary.label} value={summary.value} />
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Preview de linhas</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleTable columns={item.materializedDataset?.columns.map((column) => column.label) ?? []} rows={item.materializedDataset?.rows ?? []} />
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>DSL</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={JSON.stringify(item.dsl ?? {}, null, 2)} />
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle>Preview publicado</CardTitle>
            <CardDescription>Leitura pronta para aparecer no canvas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-lg font-semibold text-foreground">{item.canvasPreview?.headline ?? "Sem preview"}</p>
            <p className="text-sm text-muted-foreground">{item.canvasPreview?.summary ?? item.description}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(item.canvasPreview?.metrics ?? []).map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (binding.kind === "plugin") {
    return renderPluginDataTab(binding.entityId as keyof typeof pluginManifestMap, data, roleId);
  }

  const agents = specialistAgentDefinitions.filter((agent) => agent.ownerRole === roleId);
  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader>
        <CardTitle>Agentes por cargo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {agents.map((agent) => (
          <div key={agent.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-foreground">{agent.name}</p>
              <Badge variant="outline">{agent.mode}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{agent.summary}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function renderConfigTab(input: {
  projectId: string;
  binding: WorkspaceNodeBinding;
  item?: TelemetryItemDefinition;
  data: WorkspaceDataSnapshot;
  focusSection?: WorkspaceItemEditorSection | null;
}) {
  const { projectId, binding, item, data, focusSection } = input;

  if (binding.kind === "item" && item) {
    if (item.mode === "custom") {
      return (
        <WorkspaceItemEditor
          projectId={projectId}
          item={item}
          items={data.items}
          systemMetrics={data.systemMetrics}
          focusSection={focusSection}
        />
      );
    }

    return (
      <Card className="border-border/60 shadow-none">
        <CardHeader>
          <CardTitle>Config do item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ConfigRow label="Slug" value={item.slug} />
          <ConfigRow label="Modo" value={item.mode} />
          <ConfigRow label="Entrada" value={item.acceptsInput ? "ativa" : "nao"} />
          <ConfigRow label="Calculo" value={item.hasLogic ? "ativo" : "nao"} />
          <ConfigRow label="Exibicao" value={item.hasDisplay ? item.presentation ?? "ativa" : "nao"} />
          <ConfigRow label="Fontes" value={item.sources.map((source) => source.kind + ":" + source.ref).join(", ") || "-"} />
          <ConfigRow label="Tags" value={item.tags.join(", ") || "-"} />
        </CardContent>
      </Card>
    );
  }

  if (binding.kind === "plugin") {
    const manifest = pluginManifestMap[binding.entityId as keyof typeof pluginManifestMap];
    return (
      <Card className="border-border/60 shadow-none">
        <CardHeader>
          <CardTitle>Template do sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ConfigRow label="Capacidade" value={manifest.capabilityLevel} />
          <ConfigRow label="Papeis" value={manifest.roleRelevance.join(", ")} />
          <ConfigRow label="Conexoes" value={manifest.connections.map((item) => item.source + " -> " + item.target).join(" | ") || "-"} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-none">
      <CardHeader>
        <CardTitle>Config do agent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <ConfigRow label="Binding" value={binding.entityId} />
      </CardContent>
    </Card>
  );
}

function renderPluginDataTab(
  pluginId: keyof typeof pluginManifestMap,
  data: WorkspaceDataSnapshot,
  roleId: TeamPersonaId,
) {
  switch (pluginId) {
    case "analytics": {
      const overview = data.overviewQuery.data;
      return (
        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle>Dados principais</CardTitle>
            <CardDescription>Produto em leitura rapida para {teamPersonaMap[roleId].shortLabel}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview?.topEvents.slice(0, 4).map((event) => (
              <div key={event.name} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm">
                <span>{event.name}</span>
                <span className="font-medium text-foreground">{event.count.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }
    case "revenue": {
      const metrics = data.revenueMetricsQuery.data;
      const customers = data.customersQuery.data?.customers ?? [];
      return (
        <div className="space-y-4">
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Saude financeira</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="MRR" value={formatMoney(metrics?.mrr)} />
              <MetricCard label="ARR" value={formatMoney(metrics?.arr)} />
              <MetricCard label="Churn" value={formatPercent(metrics?.churnRate)} />
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Clientes recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customers.map((customer) => (
                <div key={customer.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{customer.name ?? customer.email}</p>
                    <span className="text-sm font-semibold text-foreground">{formatMoney(customer.mrr)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{customer.plan ?? "Sem plano"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      );
    }
    case "engineering": {
      const overview = data.engineeringQuery.data;
      return (
        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle>Repositorios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview?.repositories.slice(0, 4).map((repository) => (
              <div key={repository.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{repository.name}</p>
                  <span className="text-sm text-muted-foreground">{repository.healthScore}%</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{repository.openPullRequests} PRs abertas</p>
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }
    case "observability": {
      const logs = data.logsQuery.data?.entries ?? [];
      const requests = data.requestsQuery.data?.requests ?? [];
      return (
        <div className="space-y-4">
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Logs recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{log.message}</p>
                    <Badge variant="outline">{log.level}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{formatRelative(log.timestamp)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {requests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm">
                  <span>{request.method} {request.url}</span>
                  <span className="font-medium text-foreground">{request.statusCode}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      );
    }
    case "insights": {
      const alerts = data.alertsQuery.data ?? [];
      const insights = data.insightsQuery.data?.insights ?? [];
      return (
        <div className="space-y-4">
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{alert.title}</p>
                    <Badge variant="outline">{alert.severity}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardHeader>
              <CardTitle>Insights sinteticos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.slice(0, 4).map((insight) => (
                <div key={insight.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                  <p className="font-medium text-foreground">{insight.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      );
    }
    case "agents": {
      const agents = specialistAgentDefinitions.filter((agent) => agent.ownerRole === roleId);
      return (
        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle>Agentes por cargo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agents.map((agent) => (
              <div key={agent.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{agent.name}</p>
                  <Badge variant="outline">{agent.mode}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{agent.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }
    default:
      return (
        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle>Dados do template</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Este template ancora fontes do sistema no canvas.</p>
          </CardContent>
        </Card>
      );
  }
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-foreground">{value}</p>
    </div>
  );
}

function CodeBlock({ code, compact = false }: { code: string; compact?: boolean }) {
  return (
    <pre className={`overflow-x-auto rounded-2xl border border-border/60 bg-background/60 p-3 font-mono text-xs text-muted-foreground ${compact ? "mt-3" : ""}`}>
      <code>{code}</code>
    </pre>
  );
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: Array<Record<string, unknown>> }) {
  if (!columns.length || !rows.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma linha materializada ainda.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60">
      <table className="min-w-full divide-y divide-border/60 text-sm">
        <thead className="bg-muted/20">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 text-left font-medium text-muted-foreground">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 bg-card">
          {rows.slice(0, 8).map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column} className="px-3 py-2 text-foreground">
                  {String(row[column] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}





