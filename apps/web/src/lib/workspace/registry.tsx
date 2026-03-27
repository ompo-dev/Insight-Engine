import {
  Activity,
  Blocks,
  BrainCircuit,
  Database,
  FileText,
  Flag,
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
  type LucideIcon,
} from "lucide-react";
import type {
  CanvasEdgeKind,
  PluginId,
  WorkspaceCatalogCategory,
  WorkspaceCatalogItem,
  WorkspaceNodeBinding,
} from "@/lib/workspace/types";
import {
  getTelemetryItemModeLabel,
  type TelemetryItemDefinition,
  type TelemetryItemMode,
} from "@/lib/telemetry/items";

export interface PluginConnectionRule {
  source: PluginId;
  target: PluginId;
  label: string;
  layer?: "map" | "flows";
  kind?: CanvasEdgeKind;
}

export interface PluginManifest {
  id: PluginId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  accentClassName: string;
  capabilityLevel: "core" | "advanced" | "beta";
  defaultSize: { w: number; h: number };
  connections: PluginConnectionRule[];
}

function createPluginManifest(input: Omit<PluginManifest, "connections">): PluginManifest {
  return { ...input, connections: [] };
}

export const pluginRegistry: PluginManifest[] = [
  createPluginManifest({
    id: "analytics",
    label: "Analytics",
    shortLabel: "Analytics",
    description: "Eventos, sessoes, funis de descoberta e sinais de produto prontos.",
    icon: Activity,
    accentClassName: "text-sky-400",
    capabilityLevel: "core",
    defaultSize: { w: 320, h: 184 },
  }),
  createPluginManifest({
    id: "funnels",
    label: "Funnels",
    shortLabel: "Funnels",
    description: "Conversao por etapa e gargalos da jornada do produto.",
    icon: Workflow,
    accentClassName: "text-violet-400",
    capabilityLevel: "core",
    defaultSize: { w: 320, h: 184 },
  }),
  createPluginManifest({
    id: "experiments",
    label: "Experiments",
    shortLabel: "Tests",
    description: "Hipoteses, testes A/B e aprendizado incremental.",
    icon: FlaskConical,
    accentClassName: "text-fuchsia-400",
    capabilityLevel: "advanced",
    defaultSize: { w: 320, h: 184 },
  }),
  createPluginManifest({
    id: "feature-flags",
    label: "Feature Flags",
    shortLabel: "Flags",
    description: "Rollouts, targeting e controle de entrega por segmento.",
    icon: Flag,
    accentClassName: "text-amber-400",
    capabilityLevel: "advanced",
    defaultSize: { w: 320, h: 184 },
  }),
  createPluginManifest({
    id: "revenue",
    label: "Revenue",
    shortLabel: "Revenue",
    description: "MRR, clientes, transacoes e saude financeira.",
    icon: ReceiptText,
    accentClassName: "text-emerald-400",
    capabilityLevel: "core",
    defaultSize: { w: 320, h: 184 },
  }),
  createPluginManifest({
    id: "engineering",
    label: "Engineering",
    shortLabel: "Code",
    description: "Repositorios, PRs, releases e impacto de codigo.",
    icon: GitBranch,
    accentClassName: "text-blue-400",
    capabilityLevel: "core",
    defaultSize: { w: 320, h: 184 },
  }),
  createPluginManifest({
    id: "observability",
    label: "Observability",
    shortLabel: "Observe",
    description: "Logs, requests e itens operacionais criticos.",
    icon: Database,
    accentClassName: "text-orange-400",
    capabilityLevel: "core",
    defaultSize: { w: 320, h: 184 },
  }),
  createPluginManifest({
    id: "insights",
    label: "Insights",
    shortLabel: "Insights",
    description: "Leitura sintetica, alertas e narrativa operacional do projeto.",
    icon: Sparkles,
    accentClassName: "text-cyan-300",
    capabilityLevel: "core",
    defaultSize: { w: 320, h: 184 },
  }),
];

export const pluginManifestMap = Object.fromEntries(
  pluginRegistry.map((plugin) => [plugin.id, plugin]),
) as Record<PluginId, PluginManifest>;

const defaultConnections: PluginConnectionRule[] = [
  { source: "analytics", target: "funnels", label: "journey", layer: "map", kind: "data" },
  { source: "funnels", target: "experiments", label: "optimize", layer: "map", kind: "transform" },
  { source: "experiments", target: "revenue", label: "revenue effect", layer: "map", kind: "display" },
  { source: "feature-flags", target: "engineering", label: "rollout", layer: "map", kind: "action" },
  { source: "engineering", target: "observability", label: "runtime", layer: "map", kind: "data" },
  { source: "observability", target: "insights", label: "signals", layer: "map", kind: "context" },
  { source: "revenue", target: "insights", label: "business readout", layer: "map", kind: "display" },
];

for (const rule of defaultConnections) {
  pluginManifestMap[rule.source].connections.push(rule);
}

function createCatalogItem(input: WorkspaceCatalogItem): WorkspaceCatalogItem {
  return input;
}

function getItemIcon(item: TelemetryItemDefinition) {
  if (item.mode === "custom") {
    if (item.specialKind === "terminal") return Terminal;
    if (item.specialKind === "markdown") return FileText;
    if (item.specialKind === "ai") return BrainCircuit;
    if (item.specialKind === "file-manager") return FolderOpen;
    if (item.specialKind === "file-viewer") return FileText;
    if (item.specialKind === "browser") return Globe;
    if (item.displayEnabled) {
      return item.presentation === "table" ? TableProperties : item.presentation === "line" ? Activity : LayoutTemplate;
    }
    if (item.inputEnabled) return Database;
    if (item.hasLogic) return Sparkles;
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
      return item.presentation === "line" ? Activity : item.presentation === "table" ? TableProperties : LayoutTemplate;
  }
}

function getItemAccentClass(item: TelemetryItemDefinition) {
  if (item.mode === "custom") {
    if (item.specialKind === "terminal") return "text-emerald-300";
    if (item.specialKind === "markdown") return "text-amber-200";
    if (item.specialKind === "ai") return "text-indigo-200";
    if (item.specialKind === "file-manager") return "text-cyan-200";
    if (item.specialKind === "file-viewer") return "text-slate-200";
    if (item.specialKind === "browser") return "text-sky-200";
    if (item.displayEnabled) return "text-amber-300";
    if (item.inputEnabled) return "text-emerald-300";
    if (item.hasLogic) return "text-cyan-300";
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

function getItemDefaultSize(mode: TelemetryItemMode, item?: TelemetryItemDefinition) {
  switch (mode) {
    case "capture":
      return { w: 352, h: 208 };
    case "value":
      return { w: 332, h: 196 };
    case "list":
      return { w: 388, h: 228 };
    case "canvas":
      return { w: 360, h: 212 };
    case "custom":
      if (item?.specialKind === "terminal") return { w: 1040, h: 720 };
      if (item?.specialKind === "markdown") return { w: 520, h: 344 };
      if (item?.specialKind === "ai") return { w: 420, h: 272 };
      if (item?.specialKind === "file-manager") return { w: 560, h: 380 };
      if (item?.specialKind === "file-viewer") return { w: 760, h: 520 };
      if (item?.specialKind === "browser") return { w: 760, h: 520 };
      return { w: 372, h: 236 };
  }
}

export function getDefaultNodeSize(binding: WorkspaceNodeBinding, item?: TelemetryItemDefinition) {
  if (binding.kind === "plugin") {
    return pluginManifestMap[binding.entityId as PluginId].defaultSize;
  }

  if (binding.kind === "item") {
    return getItemDefaultSize(item?.mode ?? "custom", item);
  }

  return { w: 320, h: 184 };
}

export function buildWorkspaceCatalog(options: {
  items: TelemetryItemDefinition[];
}): WorkspaceCatalogItem[] {
  const { items } = options;

  const builderItems: WorkspaceCatalogItem[] = [
    createCatalogItem({
      id: "builder_item",
      kind: "builder",
      category: "builders",
      label: "Novo no",
      description: "Cria um no vazio no canvas. Depois configure recebimento, transformacao, exibicao e acao no inspector.",
      icon: Blocks,
      accentClassName: "text-emerald-300",
      tags: ["input", "formula", "canvas"],
      defaultSize: { w: 340, h: 196 },
    }),
    createCatalogItem({
      id: "builder_terminal",
      kind: "builder",
      category: "builders",
      label: "Terminal",
      description: "Node especial de terminal para runtime, stream de output e relay para outros nodes.",
      icon: Terminal,
      accentClassName: "text-emerald-300",
      tags: ["terminal", "shell", "runtime"],
      defaultSize: { w: 1040, h: 720 },
    }),
    createCatalogItem({
      id: "builder_markdown",
      kind: "builder",
      category: "builders",
      label: "Markdown",
      description: "Node especial para relatorios, documentos e preview markdown dentro do canvas.",
      icon: FileText,
      accentClassName: "text-amber-200",
      tags: ["markdown", "report", "document"],
      defaultSize: { w: 520, h: 344 },
    }),
    createCatalogItem({
      id: "builder_ai",
      kind: "builder",
      category: "builders",
      label: "AI Node",
      description: "Node especial de IA com provider, modelo, chave e output autonomo para o fluxo.",
      icon: BrainCircuit,
      accentClassName: "text-indigo-200",
      tags: ["ai", "llm", "automation"],
      defaultSize: { w: 420, h: 272 },
    }),
    createCatalogItem({
      id: "builder_file_manager",
      kind: "builder",
      category: "builders",
      label: "File Manager",
      description: "Node de arquivos com upload local, preview e abertura de arquivos como nodes.",
      icon: FolderOpen,
      accentClassName: "text-cyan-200",
      tags: ["files", "upload", "preview"],
      defaultSize: { w: 560, h: 380 },
    }),
    createCatalogItem({
      id: "builder_browser",
      kind: "builder",
      category: "builders",
      label: "Browser Node",
      description: "Browser simples embutido no canvas com URL, historico e leitura basica.",
      icon: Globe,
      accentClassName: "text-sky-200",
      tags: ["browser", "web", "navigation"],
      defaultSize: { w: 760, h: 520 },
    }),
  ];

  const templateItems = pluginRegistry.map((plugin) =>
    createCatalogItem({
      id: `plugin_${plugin.id}`,
      kind: "plugin",
      category: "templates",
      label: plugin.label,
      description: plugin.description,
      icon: plugin.icon,
      accentClassName: plugin.accentClassName,
      tags: [plugin.capabilityLevel, "template"],
      defaultSize: plugin.defaultSize,
      binding: { kind: "plugin", entityId: plugin.id },
    }),
  );

  const itemEntries = items.map((item) =>
    createCatalogItem({
      id: item.id,
      kind: "item",
      category: "items",
      label: item.label,
      description: item.description ?? (item.mode === "custom" ? "No dinamico do workspace." : `${getTelemetryItemModeLabel(item.mode)} pronto para o workspace.`),
      icon: getItemIcon(item),
      accentClassName: getItemAccentClass(item),
      tags: [...item.tags, item.mode],
      defaultSize: getDefaultNodeSize({ kind: "item", entityId: item.id }, item),
      binding: { kind: "item", entityId: item.id },
    }),
  );

  return [...builderItems, ...templateItems, ...itemEntries];
}

export const workspaceCatalogCategories: WorkspaceCatalogCategory[] = [
  "builders",
  "templates",
  "items",
];
