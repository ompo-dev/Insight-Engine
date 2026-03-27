import type { TelemetrySchemaField } from "@/lib/telemetry/types";
import {
  resolveTelemetryItem,
  type CreateCustomTelemetryItemInput,
  type SpecialTelemetryNodeKind,
  type TelemetryItemDefinition,
} from "@/lib/telemetry/items";
import {
  getWorkspaceFileExtension,
  resolveAssetViewerType,
  type WorkspaceFileAsset,
} from "@/lib/workspace/file-assets";
import type { CanvasEdge, CanvasNode } from "@/lib/workspace/types";

export function snapToGrid(value: number) {
  return Math.round(value / 24) * 24;
}

export function clampCanvasZoom(value: number) {
  return Math.max(0.1, Math.min(9.99, Number(value.toFixed(2))));
}

export function getViewportAnchor(viewport: { x: number; y: number; zoom: number }) {
  const viewportWidth = 960;
  const viewportHeight = 560;
  const sceneCenterX = (-viewport.x + viewportWidth * 0.5) / viewport.zoom;
  const sceneCenterY = (-viewport.y + viewportHeight * 0.5) / viewport.zoom;

  return {
    x: snapToGrid(sceneCenterX - 220),
    y: snapToGrid(sceneCenterY - 120),
  };
}

export function buildNodeReferenceItems(input: {
  node: CanvasNode | null;
  items: TelemetryItemDefinition[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}) {
  const { node, items, nodes, edges } = input;
  if (!node || node.binding.kind !== "item") {
    return items.filter(isGlobalReferenceItem);
  }

  const nodeById = new Map(nodes.map((entry) => [entry.id, entry]));
  const collected = new Map<string, TelemetryItemDefinition>();
  const currentEntityId = node.binding.entityId;

  const include = (item: TelemetryItemDefinition | undefined) => {
    if (!item) return;
    if (item.id === currentEntityId || item.slug === currentEntityId) return;
    collected.set(item.id, item);
  };

  items.filter(isGlobalReferenceItem).forEach(include);

  edges
    .filter((edge) => edge.target === node.id)
    .forEach((edge) => {
      const sourceNode = nodeById.get(edge.source);
      if (!sourceNode || sourceNode.binding.kind !== "item") return;
      include(resolveTelemetryItem(items, sourceNode.binding.entityId));
    });

  return Array.from(collected.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "pt-BR"),
  );
}

export function isGlobalReferenceItem(item: TelemetryItemDefinition) {
  const receiveEnabled = item.receive?.enabled ?? item.inputEnabled ?? item.acceptsInput ?? false;
  if (receiveEnabled || item.mode === "capture") return true;
  return item.sources.length === 0 || item.sources.every((source) => source.kind !== "item");
}

export function buildEditableItemSeed(item: TelemetryItemDefinition): CreateCustomTelemetryItemInput {
  return {
    label: item.label,
    slug: item.slug,
    description: item.description ?? undefined,
    tags: [...item.tags],
    expression: inferEditableExpression(item),
    inputEnabled: item.receive?.enabled ?? item.inputEnabled ?? item.acceptsInput,
    displayEnabled: (
      item.display?.enabled ??
      item.displayEnabled ??
      item.hasDisplay ??
      false
    ) || item.mode === "canvas" || item.mode === "list" || item.mode === "value",
    presentation: inferEditablePresentation(item),
    resultType: inferEditableResultType(item),
    schema: item.schema ?? inferEditableSchema(item),
    samplePayload: inferEditableSamplePayload(item),
    identityKeys: item.identityKeys.length ? [...item.identityKeys] : ["id"],
    timestampField: item.timestampField ?? "updatedAt",
    actionEnabled: item.action?.enabled ?? item.actionEnabled ?? false,
    actionType: item.action?.type ?? item.actionType ?? "webhook",
    actionTarget: item.action?.target ?? item.actionTarget ?? "https://api.exemplo.dev/hooks/lynx",
    actionMethod: item.action?.method ?? item.actionMethod ?? "POST",
    actionLive: item.action?.live ?? item.actionLive ?? false,
    actionPayloadExpression: item.action?.payloadExpression ?? item.actionPayloadExpression ?? "result",
    specialKind: item.specialKind ?? undefined,
    terminal: item.terminal,
    markdown: item.markdown,
    ai: item.ai,
    fileManager: item.fileManager,
    fileViewer: item.fileViewer,
    browser: item.browser,
  };
}

export function inferEditableExpression(item: TelemetryItemDefinition) {
  if (item.expression?.trim()) return item.expression;
  if (item.mode === "canvas") return item.sources[0]?.ref ?? item.slug;
  return item.slug;
}

export function inferEditablePresentation(
  item: TelemetryItemDefinition,
): NonNullable<CreateCustomTelemetryItemInput["presentation"]> {
  if (item.presentation) return item.presentation;
  if (item.mode === "list") return "table";
  if (item.mode === "canvas") return "text";
  return "stat";
}

export function inferEditableResultType(
  item: TelemetryItemDefinition,
): NonNullable<CreateCustomTelemetryItemInput["resultType"]> {
  if (item.resultType) return item.resultType;
  if (item.format) return item.format;
  if (item.outputShape === "dataset" || item.outputShape === "records") return "dataset";
  if (item.mode === "canvas" && item.presentation === "text") return "text";
  return "auto";
}

export function inferEditableSamplePayload(item: TelemetryItemDefinition) {
  if (item.samplePayload) return item.samplePayload;
  if (item.materializedDataset?.rows?.length) {
    return { rows: item.materializedDataset.rows.slice(0, 3) };
  }
  if (typeof item.materializedMetric?.value === "number") {
    return {
      value: item.materializedMetric.value,
      formattedValue: item.materializedMetric.formattedValue,
      updatedAt: item.materializedMetric.updatedAt,
    };
  }
  if (item.canvasPreview) {
    return {
      headline: item.canvasPreview.headline,
      summary: item.canvasPreview.summary,
      metrics: item.canvasPreview.metrics,
    };
  }
  return {
    id: `${item.slug}_001`,
    updatedAt: item.updatedAt,
  };
}

export function inferEditableSchema(item: TelemetryItemDefinition): TelemetrySchemaField {
  if (item.outputShape === "dataset" || item.outputShape === "records") {
    const sampleRecord =
      (Array.isArray(item.materializedDataset?.rows) ? item.materializedDataset?.rows[0] : undefined) ??
      item.samplePayload;

    if (sampleRecord && typeof sampleRecord === "object" && !Array.isArray(sampleRecord)) {
      return {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(sampleRecord).map(([key, value]) => [
            key,
            {
              type: (
                typeof value === "number"
                  ? "number"
                  : typeof value === "boolean"
                    ? "boolean"
                    : key.toLowerCase().includes("at")
                      ? "date-time"
                      : "string"
              ) as TelemetrySchemaField["type"],
            },
          ]),
        ),
      };
    }
  }

  return {
    type: "object",
    properties: {
      value: {
        type: item.outputShape === "value" ? "number" : "string",
      },
      updatedAt: {
        type: "date-time",
      },
    },
  };
}

export function inferNodeSeedFromPrompt(prompt: string): CreateCustomTelemetryItemInput {
  const normalized = prompt.trim().toLowerCase();
  const compactLabel = prompt
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 5)
    .join(" ");
  const label =
    compactLabel.length > 0
      ? compactLabel.charAt(0).toUpperCase() + compactLabel.slice(1)
      : "Novo node";
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const tags = Array.from(
    new Set(
      tokens.filter((token) =>
        [
          "input",
          "entrada",
          "trigger",
          "webhook",
          "api",
          "transform",
          "logic",
          "metric",
          "card",
          "grafico",
          "chart",
          "tabela",
          "table",
          "acao",
          "action",
          "agent",
          "terminal",
          "shell",
          "markdown",
          "report",
          "ai",
          "llm",
        ].includes(token),
      ),
    ),
  ).slice(0, 4);

  const inputEnabled = /(input|entrada|receive|receber|captura|source|trigger|webhook|ingest)/.test(normalized);
  const actionEnabled = /(acao|action|enviar|send|post|patch|webhook|integrat|alerta|notific)/.test(normalized);
  const wantsTerminal = /(terminal|shell|bash|powershell|cli|claude code|claude)/.test(normalized);
  const wantsMarkdown = /(markdown|relatorio|report|document|nota|docs)/.test(normalized);
  const wantsAi = /(^|\W)(ia|ai|llm|openai|anthropic|gemini|modelo)(\W|$)/.test(normalized);
  const wantsFileManager = /(arquivo|arquivos|file manager|upload|pdf|docx|pptx|xlsx|csv|file)/.test(normalized);
  const wantsBrowser = /(browser|navegador|site|url|pagina|web)/.test(normalized);
  const wantsTable = /(tabela|table|dataset|lista|grid)/.test(normalized);
  const wantsChart = /(grafico|chart|serie|trend|timeline)/.test(normalized);
  const wantsComparison = /(compar|versus|vs\b|delta)/.test(normalized);
  const wantsText = /(texto|summary|resumo|narrativa|insight)/.test(normalized);
  const displayEnabled =
    wantsTable ||
    wantsChart ||
    wantsComparison ||
    wantsText ||
    /(card|visual|display|widget|painel|dashboard)/.test(normalized);

  const specialKind = wantsTerminal
    ? "terminal"
    : wantsMarkdown
      ? "markdown"
      : wantsAi
        ? "ai"
        : wantsFileManager
          ? "file-manager"
          : wantsBrowser
            ? "browser"
            : undefined;

  const presentation = wantsTable
    ? "table"
    : wantsChart
      ? "line"
      : wantsComparison
        ? "comparison"
        : wantsText
          ? "text"
          : "stat";
  const resultType = wantsTable ? "dataset" : wantsText ? "text" : "auto";
  const expression = /(transform|logic|formula|dsl|deriva|agrega|filtra|manipula|calcula)/.test(normalized)
    ? "// pipeline\nreturn input;"
    : inputEnabled
      ? ""
      : "0";

  return {
    label,
    description: prompt.trim(),
    tags,
    inputEnabled: specialKind ? true : inputEnabled,
    displayEnabled: specialKind ? true : displayEnabled,
    presentation: specialKind ? "text" : presentation,
    resultType: specialKind ? "text" : resultType,
    expression,
    actionEnabled: specialKind === "ai" ? true : actionEnabled,
    specialKind,
  };
}

export function createSpecialNodeSeed(kind: SpecialTelemetryNodeKind): CreateCustomTelemetryItemInput {
  if (kind === "terminal") {
    return {
      label: "Terminal Node",
      description: "Sessao shell conectada ao canvas para receber contexto, transmitir stdout e encadear comandos.",
      tags: ["terminal", "shell", "runtime"],
      specialKind: "terminal",
    };
  }

  if (kind === "markdown") {
    return {
      label: "Markdown Report",
      description: "Documento markdown com preview integrado para relatorios, resumos e entregas geradas por IA.",
      tags: ["markdown", "report", "document"],
      specialKind: "markdown",
    };
  }

  if (kind === "file-manager") {
    return {
      label: "File Manager",
      description: "Inventario local de arquivos com upload, preview, abertura como node e exclusao controlada.",
      tags: ["files", "upload", "preview"],
      specialKind: "file-manager",
    };
  }

  if (kind === "file-viewer") {
    return {
      label: "File Viewer",
      description: "Visualizador interno de documentos, imagens, tabelas e arquivos locais do projeto.",
      tags: ["files", "viewer", "preview"],
      specialKind: "file-viewer",
    };
  }

  if (kind === "browser") {
    return {
      label: "Browser Node",
      description: "Browser simples embutido no canvas com URL, historico e leitura basica do conteudo.",
      tags: ["browser", "web", "navigation"],
      specialKind: "browser",
    };
  }

  return {
    label: "Assistente IA",
    description: "Node de IA conectado ao fluxo para leitura, analise e automacao com modelo configuravel.",
    tags: ["ai", "llm", "automation"],
    specialKind: "ai",
    actionEnabled: true,
    actionType: "ai-trigger",
  };
}

export function normalizeBrowserUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "https://example.com";
  if (/^(blob:|data:|https?:\/\/|file:\/\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getFileBaseName(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

export function createAssetNodeSeed(asset: WorkspaceFileAsset): CreateCustomTelemetryItemInput {
  const baseName = getFileBaseName(asset.name);
  const extension = getWorkspaceFileExtension(asset.name);
  const viewerType = resolveAssetViewerType(asset);

  if (extension === "md" || extension === "txt") {
    return {
      label: baseName,
      description: `Documento ${asset.name} aberto a partir do File Manager.`,
      tags: ["file", extension === "md" ? "markdown" : "text"],
      specialKind: "markdown",
      markdown: {
        document: asset.preview?.text ?? "",
        template: "freeform",
        autoPreview: true,
      },
      samplePayload: {
        assetId: asset.id,
        name: asset.name,
        mimeType: asset.mimeType,
      },
    };
  }

  return {
    label: baseName,
    description: `Arquivo ${asset.name} aberto a partir do File Manager.`,
    tags: ["file", extension || "asset"],
    specialKind: "file-viewer",
    displayEnabled: true,
    presentation: viewerType === "table" ? "table" : "text",
    resultType: viewerType === "table" ? "dataset" : "text",
    fileViewer: {
      assetId: asset.id,
      viewerType,
      previewState: asset.status,
      activeSheet: asset.preview?.kind === "table" ? asset.preview.sheets?.[0]?.name ?? null : null,
      currentPage: 1,
    },
    samplePayload: {
      assetId: asset.id,
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
    },
  };
}
