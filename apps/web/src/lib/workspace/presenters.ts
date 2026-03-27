import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  BrainCircuit,
  Database,
  FileText,
  FlaskConical,
  FolderOpen,
  GitBranch,
  Globe,
  LayoutTemplate,
  ReceiptText,
  Sparkles,
  TableProperties,
  Terminal,
  Workflow,
} from "lucide-react";
import {
  getTelemetryItemModeLabel,
  resolveTelemetryItem,
  type TelemetryNodeIconKey,
  type TelemetryItemDefinition,
} from "@/lib/telemetry/items";
import { formatNodeResultText } from "@/lib/workspace/node-runtime";
import { pluginManifestMap } from "@/lib/workspace/registry";
import type {
  PluginId,
  WorkspaceNodeAction,
  WorkspaceNodeBinding,
  WorkspaceNodeMetric,
  WorkspaceNodePresentation,
} from "@/lib/workspace/types";
import type { useWorkspaceData } from "@/lib/workspace/use-workspace-data";
import { formatMoney, formatPercent, formatRelative } from "@/lib/utils";

type WorkspaceDataSnapshot = ReturnType<typeof useWorkspaceData>;

export function getBindingKey(binding: WorkspaceNodeBinding) {
  return `${binding.kind}:${binding.entityId}`;
}

function resolveDisplayVariant(item: TelemetryItemDefinition): WorkspaceNodePresentation["displayVariant"] {
  if (item.specialKind === "terminal") return "terminal";
  if (item.specialKind === "markdown") return "markdown";
  if (item.specialKind === "file-manager") return "file-manager";
  if (item.specialKind === "file-viewer") {
    return item.fileViewer?.viewerType === "table" ? "table" : "file-viewer";
  }
  if (item.specialKind === "browser") return "browser";
  if (item.specialKind === "ai") return "card";
  const presentation = item.presentation ?? "stat";
  if (presentation === "line") return "chart";
  if (presentation === "table") return "table";
  if (presentation === "comparison") return "comparison";
  if (presentation === "text") return "text";
  return "card";
}

function parseMetricValueAsNumber(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/R\$/g, "")
    .replace(/%/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildMetricTablePreview(metrics: WorkspaceNodeMetric[]) {
  return {
    columns: ["Campo", "Valor"],
    rows: metrics.map((metric) => [metric.label, metric.value]),
  };
}

function buildDatasetTablePreview(item: TelemetryItemDefinition) {
  if (!item.materializedDataset) return undefined;
  return {
    columns: item.materializedDataset.columns.map((column) => column.label),
    rows: item.materializedDataset.rows.slice(0, 24).map((row) =>
      item.materializedDataset!.columns.map((column) => String(row[column.key] ?? "-")),
    ),
  };
}

function buildSyntheticChartPoints(baseValue: number) {
  const baseline = Math.max(Math.abs(baseValue), 1);
  const labels = ["t-4", "t-3", "t-2", "t-1", "agora"];
  const deltas = [-0.14, -0.04, 0.08, -0.02, 0.12];

  return labels.map((label, index) => ({
    label,
    value: Math.max(0, Math.round((baseValue + baseline * deltas[index]) * 100) / 100),
  }));
}

function buildChartPoints(item: TelemetryItemDefinition, metrics: WorkspaceNodeMetric[]) {
  if (item.materializedMetric?.series.length) {
    return item.materializedMetric.series.slice(-8).map((point) => ({ label: point.label, value: point.value }));
  }

  const metricPoints = metrics
    .map((metric) => ({ label: metric.label, value: parseMetricValueAsNumber(metric.value) }))
    .filter((point): point is { label: string; value: number } => point.value !== null);

  if (metricPoints.length >= 2) return metricPoints;

  const fallbackValue =
    item.result?.raw && typeof item.result.raw === "number"
      ? item.result.raw
      : item.expressionPreview?.numericValue ??
        item.materializedMetric?.value ??
        parseMetricValueAsNumber(item.canvasPreview?.headline ?? "") ??
        (item.recordCount > 0 ? item.recordCount : null);

  return fallbackValue !== null && fallbackValue !== undefined ? buildSyntheticChartPoints(fallbackValue) : undefined;
}

const programIconMap: Record<TelemetryNodeIconKey, WorkspaceNodePresentation["icon"]> = {
  database: Database,
  sparkles: Sparkles,
  table: TableProperties,
  chart: Activity,
  layout: LayoutTemplate,
  workflow: Workflow,
  arrowUp: ArrowUpRight,
  arrowDown: ArrowDownRight,
  arrowRight: ArrowRight,
  receipt: ReceiptText,
  alert: AlertTriangle,
  blocks: Blocks,
  terminal: Terminal,
  markdown: FileText,
  brain: BrainCircuit,
  folder: FolderOpen,
  globe: Globe,
};

function getItemIcon(item: TelemetryItemDefinition) {
  const programIcon = item.programVisuals?.iconNode
    ? programIconMap[item.programVisuals.iconNode]
    : null;
  if (programIcon) return programIcon;

  if (item.specialKind === "terminal") return Terminal;
  if (item.specialKind === "markdown") return FileText;
  if (item.specialKind === "ai") return BrainCircuit;
  if (item.specialKind === "file-manager") return FolderOpen;
  if (item.specialKind === "file-viewer") {
    return item.fileViewer?.viewerType === "table" ? TableProperties : FileText;
  }
  if (item.specialKind === "browser") return Globe;

  if (item.mode === "custom") {
    if (item.actionEnabled) return Workflow;
    if (item.displayEnabled) {
      if (item.presentation === "table") return TableProperties;
      if (item.presentation === "line") return Activity;
      if (item.presentation === "comparison") return ReceiptText;
      if (item.presentation === "text") return LayoutTemplate;
      return LayoutTemplate;
    }
    if (item.inputEnabled) return Database;
    if (item.expression?.trim()) return Sparkles;
    return Blocks;
  }

  switch (item.mode) {
    case "capture":
      return Database;
    case "value":
      return Sparkles;
    case "list":
      return TableProperties;
    case "canvas":
      return item.presentation === "table" ? TableProperties : item.presentation === "line" ? Activity : LayoutTemplate;
  }
}

function getItemAccent(item: TelemetryItemDefinition) {
  if (item.specialKind === "terminal") return "text-emerald-300";
  if (item.specialKind === "markdown") return "text-amber-200";
  if (item.specialKind === "ai") return "text-indigo-200";
  if (item.specialKind === "file-manager") return "text-cyan-200";
  if (item.specialKind === "file-viewer") {
    return item.fileViewer?.viewerType === "table" ? "text-amber-200" : "text-slate-200";
  }
  if (item.specialKind === "browser") return "text-sky-200";

  if (item.mode === "custom") {
    if (item.actionEnabled && item.actionLive) return "text-fuchsia-300";
    if (item.displayEnabled) return "text-amber-300";
    if (item.inputEnabled) return "text-emerald-300";
    if (item.expression?.trim()) return "text-cyan-300";
    return "text-slate-300";
  }

  switch (item.mode) {
    case "capture":
      return "text-emerald-300";
    case "value":
      return "text-cyan-300";
    case "list":
      return "text-violet-300";
    case "canvas":
      return "text-amber-300";
  }
}

function normalizeTerminalPreviewLines(output: string) {
  return output
    .replace(/\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\u0000/g, "").trimEnd());
}

function isTerminalPromptOnlyLine(shell: NonNullable<TelemetryItemDefinition["terminal"]>["shell"], line: string) {
  if (!line) return false;

  if (shell === "cmd") {
    return /^[A-Za-z]:\\[^<>|"?*\r\n]*>$/.test(line);
  }

  if (shell === "powershell") {
    return /^PS\s+.+>$/.test(line);
  }

  if (shell === "bash" || shell === "zsh") {
    return /^.+[$#]$/.test(line);
  }

  return false;
}

function buildTerminalPreview(item: TelemetryItemDefinition) {
  const shell = item.terminal?.shell ?? "cmd";
  const liveOutput = item.terminal?.liveOutput ?? "";
  const lines = liveOutput
    ? normalizeTerminalPreviewLines(liveOutput).filter((line) => !isTerminalPromptOnlyLine(shell, line))
    : [];

  return {
    shell,
    command: item.terminal?.command ?? "dir",
    workingDirectory: item.terminal?.workingDirectory ?? ".",
    streamOutput: item.terminal?.streamOutput ?? false,
    lines: lines.slice(-120),
    sessionStatus: item.terminal?.sessionStatus ?? "disconnected",
    lastExitCode: item.terminal?.lastExitCode ?? null,
  };
}

function buildMarkdownPreview(item: TelemetryItemDefinition) {
  return {
    body: item.markdown?.document?.trim() || "# Markdown node\n\nAguardando conteudo.",
    template: item.markdown?.template ?? "report",
    autoPreview: item.markdown?.autoPreview ?? true,
  };
}

function buildAiPreview(item: TelemetryItemDefinition) {
  return {
    provider: item.ai?.provider ?? "openai",
    model: item.ai?.model ?? "gpt-5.4-mini",
    autoRun: item.ai?.autoRun ?? false,
    response: item.ai?.lastResponse?.trim() || "Aguardando contexto de entrada.",
    systemPrompt: item.ai?.systemPrompt?.trim() || "Leia os dados recebidos e gere uma resposta acionavel.",
  };
}

function buildFileManagerPreview(item: TelemetryItemDefinition) {
  return {
    assetIds: item.fileManager?.assetIds ?? [],
    selectedAssetId: item.fileManager?.selectedAssetId ?? null,
    sortBy: item.fileManager?.sortBy ?? "recent",
    filter: item.fileManager?.filter ?? "",
    viewMode: item.fileManager?.viewMode ?? "list",
  };
}

function buildFileViewerPreview(item: TelemetryItemDefinition) {
  return {
    assetId: item.fileViewer?.assetId ?? null,
    viewerType: item.fileViewer?.viewerType ?? "document",
    previewState: item.fileViewer?.previewState ?? "ready",
    activeSheet: item.fileViewer?.activeSheet ?? null,
    currentPage: item.fileViewer?.currentPage ?? 1,
  };
}

function buildBrowserPreview(item: TelemetryItemDefinition) {
  return {
    url: item.browser?.url ?? "https://example.com",
    history: item.browser?.history ?? ["https://example.com"],
    historyIndex: item.browser?.historyIndex ?? 0,
    title: item.browser?.title ?? item.label,
    loading: item.browser?.loading ?? false,
    lastHtmlText: item.browser?.lastHtmlText ?? "",
    lastError: item.browser?.lastError ?? null,
  };
}

function getPluginPresentation(pluginId: PluginId, projectId: string, data: WorkspaceDataSnapshot): WorkspaceNodePresentation {
  const manifest = pluginManifestMap[pluginId];
  const overview = data.overviewQuery.data;
  const revenue = data.revenueMetricsQuery.data;
  const experiments = data.experimentsQuery.data ?? [];
  const funnels = data.funnelsQuery.data ?? [];
  const flags = data.featureFlagsQuery.data ?? [];
  const logs = data.logsQuery.data?.entries ?? [];
  const requests = data.requestsQuery.data?.requests ?? [];
  const insights = data.insightsQuery.data?.insights ?? [];
  const alerts = data.alertsQuery.data ?? [];
  const engineering = data.engineeringQuery.data;

  switch (pluginId) {
    case "analytics":
      return {
        icon: manifest.icon,
        accentClassName: manifest.accentClassName,
        status: overview ? "healthy" : "inactive",
        kindLabel: "Template",
        categoryLabel: "Entrada",
        title: manifest.label,
        subtitle: manifest.capabilityLevel,
        headline: overview ? `${overview.uniqueUsers.toLocaleString("pt-BR")} usuarios ativos` : "Sem leitura ativa",
        summary: overview ? `${overview.totalSessions.toLocaleString("pt-BR")} sessoes e ${overview.totalEvents.toLocaleString("pt-BR")} eventos no periodo.` : manifest.description,
        metrics: [
          { label: "Usuarios", value: overview?.uniqueUsers.toLocaleString("pt-BR") ?? "-" },
          { label: "Sessoes", value: overview?.totalSessions.toLocaleString("pt-BR") ?? "-" },
          { label: "Bounce", value: formatPercent(overview?.bounceRate), tone: "warning" },
        ],
        tags: [manifest.capabilityLevel, "template"],
      };
    case "revenue":
      return {
        icon: manifest.icon,
        accentClassName: manifest.accentClassName,
        status: revenue ? "healthy" : "inactive",
        kindLabel: "Template",
        categoryLabel: "Revenue",
        title: manifest.label,
        subtitle: manifest.capabilityLevel,
        headline: revenue ? formatMoney(revenue.mrr) : "Sem leitura financeira",
        summary: revenue ? `${revenue.activeCustomers.toLocaleString("pt-BR")} clientes ativos e churn de ${formatPercent(revenue.churnRate)}.` : manifest.description,
        metrics: [
          { label: "MRR", value: formatMoney(revenue?.mrr), tone: "positive" },
          { label: "Clientes", value: revenue?.activeCustomers.toLocaleString("pt-BR") ?? "-" },
          { label: "Churn", value: formatPercent(revenue?.churnRate), tone: "warning" },
        ],
        tags: [manifest.capabilityLevel, "template"],
      };
    case "experiments": {
      const running = experiments.filter((entry) => entry.status === "running").length;
      return {
        icon: manifest.icon,
        accentClassName: manifest.accentClassName,
        status: experiments.length ? "healthy" : "attention",
        kindLabel: "Template",
        categoryLabel: "Experimentation",
        title: manifest.label,
        subtitle: manifest.capabilityLevel,
        headline: running ? `${running} testes rodando` : "Sem teste em execucao",
        summary: experiments[0]?.name ? `Experimento em foco: ${experiments[0].name}` : manifest.description,
        metrics: [
          { label: "Rodando", value: running.toString(), tone: running ? "positive" : "warning" },
          { label: "Total", value: experiments.length.toString() },
          { label: "Ultimo", value: experiments[0]?.name ?? "-" },
        ],
        tags: [manifest.capabilityLevel, "template"],
      };
    }
    case "funnels":
      return {
        icon: manifest.icon,
        accentClassName: manifest.accentClassName,
        status: funnels.length ? "healthy" : "attention",
        kindLabel: "Template",
        categoryLabel: "Journey",
        title: manifest.label,
        subtitle: manifest.capabilityLevel,
        headline: funnels.length ? `${funnels.length} funis ativos` : "Nenhum funil configurado",
        summary: funnels[0]?.name ? `Funil em foco: ${funnels[0].name}` : manifest.description,
        metrics: [
          { label: "Funis", value: funnels.length.toString() },
          { label: "Primeiro", value: funnels[0]?.name ?? "-" },
          { label: "Etapas", value: funnels[0]?.steps.length.toString() ?? "0" },
        ],
        tags: [manifest.capabilityLevel, "template"],
      };
    case "feature-flags": {
      const enabled = flags.filter((flag) => flag.enabled).length;
      return {
        icon: manifest.icon,
        accentClassName: manifest.accentClassName,
        status: flags.length ? "healthy" : "attention",
        kindLabel: "Template",
        categoryLabel: "Delivery",
        title: manifest.label,
        subtitle: manifest.capabilityLevel,
        headline: flags.length ? `${enabled}/${flags.length} flags ligadas` : "Nenhuma flag configurada",
        summary: flags[0]?.name ? `Ultima flag: ${flags[0].name}` : manifest.description,
        metrics: [
          { label: "Ativas", value: enabled.toString() },
          { label: "Total", value: flags.length.toString() },
          { label: "Primeira", value: flags[0]?.key ?? "-" },
        ],
        tags: [manifest.capabilityLevel, "template"],
      };
    }
    case "engineering":
      return {
        icon: manifest.icon,
        accentClassName: manifest.accentClassName,
        status: engineering ? "healthy" : "attention",
        kindLabel: "Template",
        categoryLabel: "Delivery",
        title: manifest.label,
        subtitle: manifest.capabilityLevel,
        headline: engineering ? `${engineering.summary.releaseHealthScore}% release health` : "Sem telemetria tecnica",
        summary: engineering ? `${engineering.summary.openPullRequests} PRs abertas e ${engineering.summary.openIssues} issues.` : manifest.description,
        metrics: [
          { label: "Deploys", value: engineering?.summary.deploysLast30d.toString() ?? "-" },
          { label: "PRs", value: engineering?.summary.openPullRequests.toString() ?? "-" },
          { label: "Issues", value: engineering?.summary.openIssues.toString() ?? "-" },
        ],
        tags: [manifest.capabilityLevel, "template"],
      };
    case "observability": {
      const errorRequests = requests.filter((request) => request.statusCode >= 500).length;
      return {
        icon: manifest.icon,
        accentClassName: manifest.accentClassName,
        status: errorRequests > 0 ? "attention" : "healthy",
        kindLabel: "Template",
        categoryLabel: "Operations",
        title: manifest.label,
        subtitle: manifest.capabilityLevel,
        headline: errorRequests ? `${errorRequests} requests com erro` : "Operacao estavel",
        summary: `${logs.length} logs recentes e ${requests.length} requests monitoradas.`,
        metrics: [
          { label: "Logs", value: logs.length.toString() },
          { label: "5xx", value: errorRequests.toString(), tone: errorRequests ? "warning" : "positive" },
          { label: "Requests", value: requests.length.toString() },
        ],
        tags: [manifest.capabilityLevel, "template"],
      };
    }
    case "insights": {
      const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
      return {
        icon: manifest.icon,
        accentClassName: manifest.accentClassName,
        status: criticalAlerts > 0 ? "attention" : "healthy",
        kindLabel: "Template",
        categoryLabel: "Intelligence",
        title: manifest.label,
        subtitle: manifest.capabilityLevel,
        headline: criticalAlerts ? `${criticalAlerts} alertas criticos` : "Leitura sintetica pronta",
        summary: insights[0]?.title ?? manifest.description,
        metrics: [
          { label: "Insights", value: insights.length.toString() },
          { label: "Alertas", value: alerts.length.toString() },
          { label: "Criticos", value: criticalAlerts.toString(), tone: criticalAlerts ? "warning" : "positive" },
        ],
        tags: [manifest.capabilityLevel, "template"],
      };
    }
    default:
      return {
        icon: manifest.icon,
        accentClassName: manifest.accentClassName,
        status: "healthy",
        kindLabel: "Template",
        categoryLabel: "Workspace",
        title: manifest.label,
        subtitle: manifest.capabilityLevel,
        headline: manifest.label,
        summary: manifest.description,
        metrics: [
          { label: "Projeto", value: projectId },
          { label: "Nivel", value: manifest.capabilityLevel },
        ],
        tags: [manifest.capabilityLevel, "template"],
      };
  }
}

function getItemPresentation(item: TelemetryItemDefinition): WorkspaceNodePresentation {
  const icon = getItemIcon(item);
  const accentClassName = getItemAccent(item);
  const displayVariant = resolveDisplayVariant(item);

  if (item.mode === "custom") {
    const specialNodeKind = item.specialKind ?? null;
    const terminalPreview = specialNodeKind === "terminal" ? buildTerminalPreview(item) : undefined;
    const markdownPreview = specialNodeKind === "markdown" ? buildMarkdownPreview(item) : undefined;
    const aiPreview = specialNodeKind === "ai" ? buildAiPreview(item) : undefined;
    const fileManagerPreview = specialNodeKind === "file-manager" ? buildFileManagerPreview(item) : undefined;
    const fileViewerPreview = specialNodeKind === "file-viewer" ? buildFileViewerPreview(item) : undefined;
    const browserPreview = specialNodeKind === "browser" ? buildBrowserPreview(item) : undefined;
    const metrics: WorkspaceNodeMetric[] = specialNodeKind === "terminal"
      ? [
          { label: "Shell", value: terminalPreview?.shell ?? "bash" },
          { label: "Cwd", value: terminalPreview?.workingDirectory ?? "/workspace" },
          { label: "Stream", value: terminalPreview?.streamOutput ? "live" : "manual" },
        ]
      : specialNodeKind === "markdown"
        ? [
            { label: "Template", value: markdownPreview?.template ?? "report" },
            { label: "Preview", value: markdownPreview?.autoPreview ? "auto" : "manual" },
            { label: "Linhas", value: markdownPreview ? markdownPreview.body.split("\n").length.toString() : "0" },
          ]
        : specialNodeKind === "ai"
          ? [
              { label: "Provider", value: aiPreview?.provider ?? "openai" },
              { label: "Modelo", value: aiPreview?.model ?? "gpt-5.4-mini" },
              { label: "Run", value: aiPreview?.autoRun ? "auto" : "manual" },
            ]
          : specialNodeKind === "file-manager"
            ? [
                { label: "Arquivos", value: String(fileManagerPreview?.assetIds.length ?? 0) },
                { label: "Modo", value: fileManagerPreview?.viewMode ?? "list" },
                { label: "Sort", value: fileManagerPreview?.sortBy ?? "recent" },
              ]
            : specialNodeKind === "file-viewer"
              ? [
                  { label: "Viewer", value: fileViewerPreview?.viewerType ?? "document" },
                  { label: "State", value: fileViewerPreview?.previewState ?? "ready" },
                  { label: "Sheet", value: fileViewerPreview?.activeSheet ?? "-" },
                ]
              : specialNodeKind === "browser"
                ? [
                    { label: "URL", value: browserPreview?.url ?? "https://example.com" },
                    { label: "State", value: browserPreview?.loading ? "loading" : "idle" },
                    { label: "History", value: String(browserPreview?.history.length ?? 1) },
                  ]
          : [
              { label: "Receive", value: item.inputEnabled ? item.slug : "off" },
              { label: "Program", value: item.expression?.trim() ? item.resultType ?? "auto" : "off" },
              { label: "Send", value: item.actionEnabled ? `${item.actionMethod ?? "POST"} ${item.actionType ?? "webhook"}` : "off" },
            ];
    const dynamicTitle =
      item.programVisuals?.titleNode?.trim() ||
      (specialNodeKind === "ai" ? item.label || "Assistente IA" : item.label);
    const dynamicSubtitle =
      item.programVisuals?.subTitleNode?.trim() ||
      (specialNodeKind === "terminal"
        ? `runtime ${terminalPreview?.shell ?? "bash"}`
        : specialNodeKind === "markdown"
          ? "documento markdown"
          : specialNodeKind === "ai"
            ? "analise e automacao conectada"
            : specialNodeKind === "file-manager"
              ? "arquivos locais no projeto"
              : specialNodeKind === "file-viewer"
                ? fileViewerPreview?.viewerType ?? "documento"
                : specialNodeKind === "browser"
                  ? "navegacao web embutida"
            : item.slug);
    const dynamicBadge =
      item.programVisuals?.badgeNode?.trim() ||
      (specialNodeKind === "terminal"
        ? terminalPreview?.shell ?? item.status
        : specialNodeKind === "markdown"
          ? markdownPreview?.template ?? item.status
          : specialNodeKind === "ai"
            ? aiPreview?.model ?? item.status
            : specialNodeKind === "file-manager"
              ? `${fileManagerPreview?.assetIds.length ?? 0} assets`
              : specialNodeKind === "file-viewer"
                ? fileViewerPreview?.previewState ?? item.status
                : specialNodeKind === "browser"
                  ? browserPreview?.title || "browser"
            : item.status);

    return {
      icon,
      accentClassName,
      status: item.status,
      badgeLabel: dynamicBadge,
      kindLabel: "No",
      categoryLabel: "Node-first",
      title: dynamicTitle,
      subtitle: dynamicSubtitle,
      headline: specialNodeKind === "terminal"
        ? terminalPreview?.lines.at(-1) ?? formatNodeResultText(item)
        : specialNodeKind === "markdown"
          ? markdownPreview?.body.split("\n").find((line) => line.trim().length > 0)?.replace(/^#+\s*/, "") ?? formatNodeResultText(item)
          : specialNodeKind === "ai"
            ? aiPreview?.response ?? formatNodeResultText(item)
            : specialNodeKind === "file-manager"
              ? `${fileManagerPreview?.assetIds.length ?? 0} arquivo(s)`
              : specialNodeKind === "file-viewer"
                ? fileViewerPreview?.assetId ?? "Nenhum arquivo"
                : specialNodeKind === "browser"
                  ? browserPreview?.title || browserPreview?.url || formatNodeResultText(item)
            : formatNodeResultText(item),
      summary: specialNodeKind === "terminal"
        ? `Sessao ${terminalPreview?.shell ?? "bash"} pronta para receber dados, gerar stdout e repassar o stream.`
        : specialNodeKind === "markdown"
          ? "Documento markdown com preview no canvas para relatorios, notas e respostas geradas por IA."
          : specialNodeKind === "ai"
            ? "Node autonomo de IA com provider, modelo, chave e resposta encadeada para o fluxo."
            : specialNodeKind === "file-manager"
              ? "Inventario browser-only para upload, preview, abertura e exclusao de arquivos dentro do canvas."
              : specialNodeKind === "file-viewer"
                ? "Visualizador interno para documentos, imagens, tabelas e textos vindos do File Manager."
                : specialNodeKind === "browser"
                  ? "Browser simples embutido no canvas para navegar URLs e repassar contexto para outros nodes."
            : item.description ?? item.expression ?? "No pronto para receber dados, programar o payload e enviar o resultado.",
      metrics,
      tags: item.tags,
      capabilities: [
        item.inputEnabled ? "receive" : null,
        item.expression?.trim() ? "program" : null,
        item.actionEnabled ? "send" : null,
      ].filter((value): value is string => Boolean(value)),
      formula: item.expression?.trim() || null,
      signal: item.lastDelivery?.error ?? item.result?.error ?? (item.lastRun ? `Ultimo run em ${item.lastRun.latencyMs}ms.` : "No em draft."),
      displayVariant: item.displayEnabled || specialNodeKind ? displayVariant : undefined,
      specialNodeKind,
      displaySurfaceOnly:
        item.displayEnabled || specialNodeKind
          ? displayVariant === "chart" ||
            displayVariant === "table" ||
            specialNodeKind === "terminal" ||
            specialNodeKind === "markdown" ||
            specialNodeKind === "file-manager" ||
            specialNodeKind === "file-viewer" ||
            specialNodeKind === "browser"
          : false,
      chartPoints: item.displayEnabled && displayVariant === "chart" ? buildChartPoints(item, metrics) : undefined,
      tablePreview: item.displayEnabled && displayVariant === "table" ? buildDatasetTablePreview(item) ?? buildMetricTablePreview(metrics) : undefined,
      terminalPreview,
      markdownPreview,
      aiPreview,
      fileManagerPreview,
      fileViewerPreview,
      browserPreview,
      textPreview: item.displayEnabled && displayVariant === "text"
        ? {
            eyebrow: item.resultType ?? "text",
            body: formatNodeResultText(item),
            footer: item.lastDelivery ? `${item.lastDelivery.status} via ${item.lastDelivery.method}` : item.lastRun ? `${item.lastRun.latencyMs}ms` : undefined,
          }
        : undefined,
    };
  }

  if (item.mode === "capture") {
    const metrics: WorkspaceNodeMetric[] = [
      { label: "Registros", value: item.recordCount.toLocaleString("pt-BR") },
      { label: "Keys", value: item.identityKeys.length.toString() },
      { label: "Ultimo", value: item.lastIngestedAt ? formatRelative(item.lastIngestedAt) : "nunca" },
    ];

    return {
      icon,
      accentClassName,
      status: item.status,
      kindLabel: "No",
      categoryLabel: getTelemetryItemModeLabel(item.mode),
      title: item.label,
      subtitle: item.slug,
      headline: `${item.recordCount.toLocaleString("pt-BR")} registros`,
      summary: item.description ?? "Recebe payloads tipados e os deixa prontos para programacao e novos fluxos.",
      metrics,
      tags: item.tags,
      signal: "Schema estrito para ingestao em tempo real.",
      tablePreview: item.samplePayload
        ? {
            columns: ["Campo", "Exemplo"],
            rows: Object.entries(item.samplePayload).slice(0, 5).map(([key, value]) => [key, String(value)]),
          }
        : undefined,
    };
  }

  if (item.mode === "value") {
    const metrics: WorkspaceNodeMetric[] = [
      { label: "Trend", value: item.materializedMetric?.trend ?? "neutral" },
      { label: "Delta", value: item.materializedMetric?.deltaLabel ?? "-" },
      { label: "Fontes", value: item.sources.length.toString() },
    ];

    return {
      icon,
      accentClassName,
      status: item.status,
      kindLabel: "No",
      categoryLabel: getTelemetryItemModeLabel(item.mode),
      title: item.label,
      subtitle: item.slug,
      headline: item.materializedMetric?.formattedValue ?? "Sem materializacao",
      summary: item.description ?? "Programa dados vindos de outros nodes e metricas para gerar um valor reutilizavel.",
      metrics,
      tags: item.tags,
      displayVariant: "comparison",
      chartPoints: buildChartPoints(item, metrics),
      tablePreview: buildMetricTablePreview(metrics),
      signal: item.dsl ? `DSL v${item.dsl.version} pronta para recalculo.` : undefined,
    };
  }

  if (item.mode === "list") {
    const metrics: WorkspaceNodeMetric[] = [
      { label: "Linhas", value: item.materializedDataset?.rows.length.toString() ?? "0" },
      { label: "Colunas", value: item.materializedDataset?.columns.length.toString() ?? "0" },
      { label: "Fontes", value: item.sources.length.toString() },
    ];

    return {
      icon,
      accentClassName,
      status: item.status,
      kindLabel: "No",
      categoryLabel: getTelemetryItemModeLabel(item.mode),
      title: item.label,
      subtitle: item.slug,
      headline: item.materializedDataset ? `${item.materializedDataset.rows.length.toLocaleString("pt-BR")} linhas` : "Sem dataset materializado",
      summary: item.description ?? "Organiza os dados recebidos em dataset para novos envios e leituras.",
      metrics,
      tags: item.tags,
      displayVariant: "table",
      tablePreview: buildDatasetTablePreview(item) ?? buildMetricTablePreview(metrics),
    };
  }

  const metrics = item.canvasPreview?.metrics ?? [
    { label: "Tipo", value: item.presentation ?? "-" },
    { label: "Fonte", value: item.sources[0]?.label ?? "-" },
  ];

  return {
    icon,
    accentClassName,
    status: item.status,
    kindLabel: "No",
    categoryLabel: getTelemetryItemModeLabel(item.mode),
    title: item.label,
    subtitle: item.slug,
    headline: item.canvasPreview?.headline ?? "Sem preview",
    summary: item.canvasPreview?.summary ?? item.description ?? "Materializa um resultado pronto para circular pelo canvas e pelos proximos nodes.",
    metrics,
    tags: item.tags,
    displayVariant,
    displaySurfaceOnly: displayVariant === "chart" || displayVariant === "table",
    chartPoints: displayVariant === "chart" ? buildChartPoints(item, metrics) : undefined,
    tablePreview: displayVariant === "table" ? buildMetricTablePreview(metrics) : undefined,
    textPreview: displayVariant === "text" ? { body: item.canvasPreview?.headline ?? item.label } : undefined,
    signal: item.sources[0] ? `${item.presentation} conectada a ${item.sources[0].label}.` : undefined,
  };
}

export function getWorkspaceNodePresentation(
  binding: WorkspaceNodeBinding,
  projectId: string,
  data: WorkspaceDataSnapshot,
): WorkspaceNodePresentation {
  if (binding.kind === "plugin") {
    return getPluginPresentation(binding.entityId as PluginId, projectId, data);
  }

  if (binding.kind === "item") {
    const item = resolveTelemetryItem(data.items, binding.entityId);
    if (!item) {
      return {
        icon: Database,
        accentClassName: "text-muted-foreground",
        status: "inactive",
        kindLabel: "No",
        categoryLabel: "Indisponivel",
        title: binding.entityId,
        subtitle: binding.entityId,
        headline: "No nao encontrado",
        summary: "O binding do canvas aponta para um no que nao esta disponivel no projeto.",
        metrics: [],
        tags: [],
      };
    }

    return getItemPresentation(item);
  }

  return {
    icon: BrainCircuit,
    accentClassName: "text-indigo-300",
    status: "inactive",
    kindLabel: "Node",
    categoryLabel: "Legacy",
    title: binding.entityId,
    subtitle: binding.entityId,
    headline: "Bloco legado",
    summary: "Este binding antigo nao faz mais parte do fluxo atual baseado apenas em workspaces.",
    metrics: [
      { label: "Projeto", value: projectId },
    ],
    tags: ["legacy"],
  };
}

export function getWorkspaceNodeActions(binding: WorkspaceNodeBinding, item?: TelemetryItemDefinition): WorkspaceNodeAction[] {
  if (binding.kind === "item") {
    const actions: WorkspaceNodeAction[] = [
      {
        id: "configure-receive",
        label: "Abrir recebimento",
        description: "Veja entradas, schema e payloads que alimentam este node.",
        kind: "primary",
      },
      {
        id: "configure-program",
        label: "Abrir programacao",
        description: "Manipule os dados recebidos na linguagem dinamica do workspace.",
        kind: "secondary",
      },
      {
        id: "configure-send",
        label: "Abrir envio",
        description: "Veja o que este node entrega para outros nodes e APIs.",
        kind: "secondary",
      },
    ];

    actions.push({
      id: "new-item",
      label: "Criar no conectado",
      description: "Cria outro no puxando este como ponto de partida.",
      kind: "primary",
    });

    if ((item?.sources.length ?? 0) > 0) {
      actions.push({
        id: "focus-source",
        label: "Ir para no fonte",
        description: "Foca no primeiro no que alimenta este bloco.",
        kind: "secondary",
      });
    }

    actions.push({
      id: "remove-node",
      label: "Remover do workspace",
      description: "Remove apenas desta aba atual.",
      kind: "danger",
    });

    return actions;
  }

  return [
    { id: "remove-node", label: "Remover do workspace", description: "Remove apenas desta aba atual.", kind: "danger" },
  ];
}

