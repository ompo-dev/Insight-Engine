import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  FileWarning,
  Globe,
  Loader2,
  Upload,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { WorkspaceFilePreview } from "@/components/workspace/WorkspaceFilePreview";
import { WorkspaceNodeDataTable } from "@/components/workspace/WorkspaceNodeDataTable";
import { WorkspaceMarkdownPreview } from "@/components/workspace/WorkspaceMarkdownPreview";
import { WorkspaceTerminal } from "@/components/workspace/WorkspaceTerminal";
import type { TelemetryItemDefinition } from "@/lib/telemetry/items";
import type { WorkspaceFileAsset } from "@/lib/workspace/file-assets";
import type {
  WorkspaceNodeMetric,
  WorkspaceNodePresentation,
} from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

interface WorkspacePluginCardProps {
  presentation: WorkspaceNodePresentation;
  item?: TelemetryItemDefinition;
  selected?: boolean;
  expanded?: boolean;
  className?: string;
  footerAction?: ReactNode;
  preview?: boolean;
  coreOnly?: boolean;
  canvasMinimal?: boolean;
  terminalRuntime?: {
    projectId: string;
    terminal: NonNullable<TelemetryItemDefinition["terminal"]>;
    onSync: (
      patch: Partial<NonNullable<TelemetryItemDefinition["terminal"]>>,
    ) => void;
    onActivate?: () => void;
  };
  fileManagerRuntime?: {
    assets: WorkspaceFileAsset[];
    selectedAssetId?: string | null;
    onSelectAsset: (assetId: string) => void;
    onRenameAsset: (assetId: string, name: string) => void;
    onDeleteAsset: (assetId: string) => void;
    onOpenAssetAsNode: (assetId: string) => void;
    onUploadFiles: (files: File[]) => void;
  };
  fileViewerRuntime?: {
    asset?: WorkspaceFileAsset | null;
    activeSheet?: string | null;
    onSelectSheet?: (sheetName: string) => void;
  };
  browserRuntime?: {
    url: string;
    title: string;
    loading: boolean;
    history: string[];
    historyIndex: number;
    lastError?: string | null;
    onNavigate: (url: string, mode?: "push" | "replace") => void;
    onBack: () => void;
    onForward: () => void;
    onRefresh: () => void;
    onSnapshot: (patch: {
      title?: string;
      lastHtmlText?: string;
      lastError?: string | null;
      loading?: boolean;
    }) => void;
  };
}

const chartConfig = {
  value: {
    label: "Valor",
    color: "#73b8ff",
  },
} satisfies ChartConfig;

const statusToneClassMap = {
  healthy: "border-emerald-300/16 bg-emerald-400/[0.08] text-emerald-100",
  attention: "border-amber-300/16 bg-amber-400/[0.08] text-amber-100",
  inactive: "border-white/10 bg-white/[0.05] text-white/58",
  draft: "border-sky-300/16 bg-sky-400/[0.08] text-sky-100",
} as const;

const NODE_PANEL_MUTED_CLASS =
  "rounded-[18px] border border-white/8 bg-[#10141a]";
const NODE_PANEL_INSET_CLASS =
  "rounded-[18px] border border-white/8 bg-[#0f141b]";
const NODE_CONTROL_CLASS =
  "border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]";
const NODE_INPUT_CLASS =
  "border-white/10 bg-[#111111] text-white placeholder:text-white/32";
const NODE_PILL_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/62";
const WINDOW_DOT_CLASS = "h-2.5 w-2.5 rounded-full bg-white/18";
const BROWSER_VIEWPORT = { width: 1920, height: 1080 } as const;

export function WorkspacePluginCard({
  presentation,
  item,
  selected = false,
  expanded = false,
  className,
  footerAction,
  preview = false,
  coreOnly = false,
  canvasMinimal = false,
  terminalRuntime,
  fileManagerRuntime,
  fileViewerRuntime,
  browserRuntime,
}: WorkspacePluginCardProps) {
  const isSurfaceNode =
    presentation.displayVariant === "chart" ||
    presentation.displayVariant === "table" ||
    presentation.displayVariant === "terminal" ||
    presentation.displayVariant === "markdown" ||
    presentation.displayVariant === "file-manager" ||
    presentation.displayVariant === "file-viewer" ||
    presentation.displayVariant === "browser";
  const metrics = presentation.metrics.slice(0, expanded ? 4 : 2);
  const shellClassName = cn(
    "relative flex h-full w-full flex-col overflow-hidden rounded-[22px] border bg-[#16181d] text-white transition-[border-color,box-shadow,transform] duration-150",
    selected
      ? "border-sky-300/28 shadow-[0_0_0_1px_rgba(125,211,252,0.16)]"
      : "border-white/8",
    coreOnly && "bg-[#16181d]",
    className,
  );
  const primaryMetric = metrics[0] ?? presentation.metrics[0] ?? null;
  const renderShell = (children: ReactNode) => (
    <div className={shellClassName}>
      <div className="flex h-full min-h-0 flex-col">{children}</div>
    </div>
  );

  if (canvasMinimal && !isSurfaceNode) {
    return renderShell(<MinimalNodeSurface presentation={presentation} />);
  }

  if (isSurfaceNode) {
    return renderShell(
      renderDisplayVariant(
        presentation,
        metrics,
        true,
        item,
        terminalRuntime,
        fileManagerRuntime,
        fileViewerRuntime,
        browserRuntime,
      ),
    );
  }

  return renderShell(
    <>
      <NodeChromeHeader presentation={presentation} metric={primaryMetric} />

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          expanded ? "gap-4 p-4" : "gap-3 p-3.5",
        )}
      >
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">
            {presentation.subtitle || presentation.kindLabel}
          </p>
          <p
            className={cn(
              "font-semibold tracking-tight text-white",
              expanded
                ? "text-[22px] leading-[1.1]"
                : "text-[17px] leading-[1.15]",
            )}
          >
            {presentation.headline}
          </p>
          <p
            className={cn(
              "text-white/50",
              expanded ? "text-sm leading-6" : "text-[12px] leading-5",
            )}
          >
            {presentation.summary}
          </p>
        </div>

        {presentation.formula && expanded ? (
          <div className={cn(NODE_PANEL_INSET_CLASS, "px-4 py-4")}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
              Node Program
            </p>
            <code className="mt-2 block whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-white/76">
              {presentation.formula}
            </code>
          </div>
        ) : null}

        {expanded &&
        presentation.displayVariant &&
        presentation.displayVariant !== "card" ? (
          <div className={cn(NODE_PANEL_MUTED_CLASS, "overflow-hidden")}>
            <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                Surface
              </p>
              <NodeStatusBadge presentation={presentation} compact />
            </div>
            <div className="overflow-hidden bg-[#0c0c0c]">
              {renderDisplayVariant(
                presentation,
                metrics,
                true,
                item,
                terminalRuntime,
                fileManagerRuntime,
                fileViewerRuntime,
                browserRuntime,
              )}
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "grid gap-2.5",
            metrics.length > 1 ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {metrics.map((metric) => (
            <NodeMetricTile key={metric.label} metric={metric} />
          ))}
        </div>

        {footerAction ? <div className="mt-auto">{footerAction}</div> : null}
      </div>
    </>,
  );
}

function MinimalNodeSurface({
  presentation,
}: {
  presentation: WorkspaceNodePresentation;
}) {
  const Icon = presentation.icon;

  return (
    <div className="flex h-full items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/8 bg-[#111317]">
          <Icon className={cn("h-4 w-4", presentation.accentClassName)} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-white">
            {presentation.title}
          </p>
          <p className="truncate text-[11px] text-white/42">
            {presentation.subtitle || presentation.kindLabel}
          </p>
        </div>
      </div>

      <div className="shrink-0">
        <NodeStatusBadge presentation={presentation} compact />
      </div>
    </div>
  );
}

function NodeMetricTile({ metric }: { metric: WorkspaceNodeMetric }) {
  const toneClassName =
    metric.tone === "positive"
      ? "bg-emerald-300"
      : metric.tone === "warning"
        ? "bg-amber-300"
        : metric.tone === "negative"
          ? "bg-rose-300"
          : "bg-sky-300";

  return (
    <div className={cn(NODE_PANEL_INSET_CLASS, "px-3 py-2.5")}>
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", toneClassName)} />
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/32">
          {metric.label}
        </p>
      </div>
      <p className="mt-2 text-sm font-medium text-white/86">{metric.value}</p>
    </div>
  );
}

function NodeChromeHeader({
  presentation,
  metric,
}: {
  presentation: WorkspaceNodePresentation;
  metric?: WorkspaceNodeMetric | null;
}) {
  const Icon = presentation.icon;

  return (
    <header className="flex items-center justify-between gap-3 border-b border-white/8 bg-[#1f1f1f] px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className={WINDOW_DOT_CLASS} />
          <span className={WINDOW_DOT_CLASS} />
          <span className={WINDOW_DOT_CLASS} />
        </div>

        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] border border-white/8 bg-[#111317]">
            <Icon className={cn("h-4 w-4", presentation.accentClassName)} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-[0.18em] text-white/32">
              {presentation.kindLabel}
            </p>
            <p className="truncate text-sm font-medium text-white">
              {presentation.title}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {metric ? <NodeMetricPill metric={metric} compact /> : null}
        <NodeStatusBadge presentation={presentation} />
      </div>
    </header>
  );
}

function NodeMetricPill({
  metric,
  compact = false,
}: {
  metric: WorkspaceNodeMetric;
  compact?: boolean;
}) {
  const toneClassName =
    metric.tone === "positive"
      ? "bg-emerald-300"
      : metric.tone === "warning"
        ? "bg-amber-300"
        : metric.tone === "negative"
          ? "bg-rose-300"
          : "bg-sky-300";

  return (
    <span
      className={cn(
        NODE_PILL_CLASS,
        compact ? "px-2.5 py-1 text-[9px]" : "px-3 py-1 text-[10px]",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", toneClassName)} />
      <span className="text-white/42">{metric.label}</span>
      <span className="text-white/82">{metric.value}</span>
    </span>
  );
}

function NodeMetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[9px] uppercase tracking-[0.18em] text-white/32">
        {label}
      </p>
      <p className="mt-1 text-[11px] font-medium text-white/80">{value}</p>
    </div>
  );
}

function NodeStatusBadge({
  presentation,
  compact = false,
}: {
  presentation: Pick<WorkspaceNodePresentation, "status" | "badgeLabel">;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full border uppercase tracking-[0.14em]",
        compact ? "px-2 py-1 text-[9px]" : "px-2.5 py-1 text-[10px]",
        statusToneClassMap[presentation.status],
      )}
    >
      {presentation.badgeLabel ?? presentation.status}
    </span>
  );
}

function renderDisplayVariant(
  presentation: WorkspaceNodePresentation,
  metrics: WorkspaceNodePresentation["metrics"],
  expanded: boolean,
  item?: TelemetryItemDefinition,
  terminalRuntime?: WorkspacePluginCardProps["terminalRuntime"],
  fileManagerRuntime?: WorkspacePluginCardProps["fileManagerRuntime"],
  fileViewerRuntime?: WorkspacePluginCardProps["fileViewerRuntime"],
  browserRuntime?: WorkspacePluginCardProps["browserRuntime"],
) {
  const displayVariant = presentation.displayVariant ?? "card";

  if (displayVariant === "chart") {
    return (
      <ChartSurface
        presentation={presentation}
        metrics={metrics}
        expanded={expanded}
      />
    );
  }

  if (displayVariant === "table") {
    return (
      <TableSurface
        presentation={presentation}
        item={item}
        runtime={fileViewerRuntime}
        preview={
          presentation.tablePreview ?? buildFallbackTablePreview(presentation)
        }
      />
    );
  }

  if (displayVariant === "terminal") {
    return (
      <TerminalSurface
        presentation={presentation}
        item={item}
        terminalRuntime={terminalRuntime}
      />
    );
  }

  if (displayVariant === "markdown") {
    return <MarkdownSurface presentation={presentation} />;
  }

  if (displayVariant === "file-manager") {
    return (
      <FileManagerSurface
        presentation={presentation}
        runtime={fileManagerRuntime}
      />
    );
  }

  if (displayVariant === "file-viewer") {
    return (
      <FileViewerSurface
        presentation={presentation}
        runtime={fileViewerRuntime}
      />
    );
  }

  if (displayVariant === "browser") {
    return (
      <BrowserSurface presentation={presentation} runtime={browserRuntime} />
    );
  }

  if (displayVariant === "ai") {
    return <AiSurface presentation={presentation} />;
  }

  if (displayVariant === "comparison") {
    return <ComparisonSurface presentation={presentation} metrics={metrics} />;
  }

  if (displayVariant === "text") {
    return <TextSurface presentation={presentation} metrics={metrics} />;
  }

  return (
    <StatSurface
      presentation={presentation}
      metrics={metrics}
      expanded={expanded}
    />
  );
}

function TerminalSurface({
  presentation,
  item,
  terminalRuntime,
}: {
  presentation: WorkspaceNodePresentation;
  item?: TelemetryItemDefinition;
  terminalRuntime?: WorkspacePluginCardProps["terminalRuntime"];
}) {
  const preview = presentation.terminalPreview;
  const allowInlineRuntime = Boolean(terminalRuntime && item?.specialKind === "terminal");

  if (allowInlineRuntime && terminalRuntime) {
    return (
      <WorkspaceTerminal
        projectId={terminalRuntime.projectId}
        terminal={terminalRuntime.terminal}
        onSync={terminalRuntime.onSync}
        onActivate={terminalRuntime.onActivate}
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 bg-[#0c0c0c] p-0 text-[#f2f2f2]">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-[#1f1f1f] px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
          </div>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/72">
            {getTerminalWindowTitle(
              preview?.shell ?? "cmd",
              preview?.workingDirectory ?? ".",
            )}
          </p>
        </div>
        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/62">
          {preview?.sessionStatus ??
            (preview?.streamOutput ? "live" : "manual")}
        </span>
      </div>

      <div
        data-workspace-surface="true"
        className="flex-1 overflow-hidden bg-[#0c0c0c]"
      >
        <div
          className="h-full overflow-auto px-3 py-3 font-mono text-[13px] leading-[1.18] text-[#f2f2f2]"
        >
          <div className="space-y-0.5">
            {(preview?.lines ?? []).map((line, index) => (
              <p
                key={`${line}:${index}`}
                className="whitespace-pre-wrap break-words"
              >
                {line || " "}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className={cn(NODE_PANEL_MUTED_CLASS, "px-3 py-3")}>
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
          Command
        </p>
        <p className="mt-2 truncate font-mono text-[12px] text-white/76">
          {preview?.command ?? "dir"}
        </p>
      </div>
    </div>
  );
}

function getTerminalWindowTitle(shell: string, workingDirectory: string) {
  if (shell === "cmd") {
    return `cmd.exe - ${workingDirectory}`;
  }

  if (shell === "powershell") {
    return `Windows PowerShell - ${workingDirectory}`;
  }

  return `${shell} - ${workingDirectory}`;
}

function MarkdownSurface({
  presentation,
}: {
  presentation: WorkspaceNodePresentation;
}) {
  const preview = presentation.markdownPreview;

  return (
    <div className="flex h-full min-h-0 flex-col p-3.5">
      <div
        className={cn(
          NODE_PANEL_INSET_CLASS,
          "min-h-0 flex-1 overflow-auto px-4 py-4",
        )}
      >
        <WorkspaceMarkdownPreview
          source={preview?.body ?? "# Markdown node\n\nAguardando conteudo."}
        />
      </div>
    </div>
  );
}

function FileManagerSurface({
  presentation: _presentation,
  runtime,
}: {
  presentation: WorkspaceNodePresentation;
  runtime?: WorkspacePluginCardProps["fileManagerRuntime"];
}) {
  const assets = runtime?.assets ?? [];
  const selectedAsset = runtime?.selectedAssetId
    ? (assets.find((asset) => asset.id === runtime.selectedAssetId) ?? null)
    : null;
  const [renameValue, setRenameValue] = useState(selectedAsset?.name ?? "");
  const [draggingFiles, setDraggingFiles] = useState(false);

  useEffect(() => {
    setRenameValue(selectedAsset?.name ?? "");
  }, [selectedAsset?.id, selectedAsset?.name]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-3 p-3.5",
        draggingFiles &&
          "rounded-[18px] border border-sky-300/20 bg-white/[0.05]",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDraggingFiles(true);
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setDraggingFiles(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        const nextTarget = event.relatedTarget as Node | null;
        if (nextTarget && event.currentTarget.contains(nextTarget)) return;
        setDraggingFiles(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDraggingFiles(false);
        const files = Array.from(event.dataTransfer.files ?? []);
        if (files.length) runtime?.onUploadFiles(files);
      }}
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
            File manager
          </p>
          <p className="mt-1 text-[13px] font-medium text-white">
            {assets.length} arquivo(s)
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/[0.08]">
          <Upload className="h-3.5 w-3.5" />
          Upload
          <input
            type="file"
            multiple
            className="hidden"
            data-workspace-control="true"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length) runtime?.onUploadFiles(files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3",
          selectedAsset ? "xl:grid-cols-[280px_minmax(0,1fr)]" : "grid-cols-1",
        )}
      >
        <div
          className={cn(NODE_PANEL_MUTED_CLASS, "min-h-0 overflow-auto p-2")}
        >
          <div className="space-y-2">
            {assets.length ? (
              assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  data-workspace-control="true"
                  onClick={() => runtime?.onSelectAsset(asset.id)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-[14px] border px-3 py-3 text-left transition",
                    selectedAsset?.id === asset.id
                      ? "border-white/10 bg-[#16181d] shadow-[0_0_0_1px_rgba(125,211,252,0.12)]"
                      : "border-white/8 bg-[#0f141b] hover:bg-[#131820]",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {asset.name}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-white/40">
                      {asset.mimeType || asset.extension || "arquivo"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/8 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/52">
                    {asset.extension || "file"}
                  </span>
                </button>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-[#0f141b] px-4 py-8 text-center text-sm text-white/44">
                Arraste ou envie arquivos para este node.
              </div>
            )}
          </div>
        </div>

        {selectedAsset ? (
          <div className="flex min-h-0 flex-col gap-3">
            <div
              className={cn(
                NODE_PANEL_MUTED_CLASS,
                "grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto]",
              )}
            >
              <Input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onBlur={() => {
                  if (
                    selectedAsset &&
                    renameValue.trim() &&
                    renameValue.trim() !== selectedAsset.name
                  ) {
                    runtime?.onRenameAsset(
                      selectedAsset.id,
                      renameValue.trim(),
                    );
                  }
                }}
                className={NODE_INPUT_CLASS}
                placeholder="Nome do arquivo"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={NODE_CONTROL_CLASS}
                  onClick={() =>
                    selectedAsset &&
                    runtime?.onOpenAssetAsNode(selectedAsset.id)
                  }
                >
                  Abrir como node
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={NODE_CONTROL_CLASS}
                  onClick={() =>
                    selectedAsset && runtime?.onDeleteAsset(selectedAsset.id)
                  }
                >
                  Excluir
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <WorkspaceFilePreview
                asset={selectedAsset}
                compact
                className="h-full"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FileViewerSurface({
  presentation: _presentation,
  runtime,
}: {
  presentation: WorkspaceNodePresentation;
  runtime?: WorkspacePluginCardProps["fileViewerRuntime"];
}) {
  const asset = runtime?.asset;

  return (
    <div className="flex h-full min-h-0 flex-col p-3.5">
      <div className="min-h-0 flex-1">
        <WorkspaceFilePreview
          asset={asset}
          activeSheet={runtime?.activeSheet}
          onSelectSheet={runtime?.onSelectSheet}
          className="h-full"
        />
      </div>
    </div>
  );
}

function buildAssetTablePreview(
  asset: WorkspaceFileAsset | null | undefined,
  activeSheet?: string | null,
  fallback?: NonNullable<WorkspaceNodePresentation["tablePreview"]> | null,
) {
  const preview = asset?.preview;
  if (preview?.kind !== "table") {
    return fallback ?? null;
  }

  const selectedSheet =
    preview.sheets?.find((sheet) => sheet.name === activeSheet) ??
    preview.sheets?.[0] ??
    null;

  if (!selectedSheet) {
    return fallback ?? null;
  }

  return {
    columns: selectedSheet.columns,
    rows: selectedSheet.rows,
    sheetNames: preview.sheets?.map((sheet) => sheet.name) ?? [],
    activeSheet: selectedSheet.name,
  } satisfies NonNullable<WorkspaceNodePresentation["tablePreview"]>;
}

function BrowserSurface({
  presentation,
  runtime,
}: {
  presentation: WorkspaceNodePresentation;
  runtime?: WorkspacePluginCardProps["browserRuntime"];
}) {
  const [draftUrl, setDraftUrl] = useState(
    runtime?.url ?? presentation.browserPreview?.url ?? "https://example.com",
  );
  const [frameNonce, setFrameNonce] = useState(0);
  const resolvedUrl =
    runtime?.url ?? presentation.browserPreview?.url ?? "https://example.com";
  const snapshot = runtime?.onSnapshot;
  const snapshotRef = useRef(snapshot);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const viewportFrameRef = useRef<HTMLDivElement | null>(null);
  const lastMetadataUrlRef = useRef<string | null>(null);
  const [viewportScale, setViewportScale] = useState(1);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    setDraftUrl(resolvedUrl);
  }, [resolvedUrl]);

  useEffect(() => {
    setFrameNonce((current) => current + 1);
  }, [resolvedUrl]);

  useEffect(() => {
    if (!snapshotRef.current || !resolvedUrl) return;
    if (lastMetadataUrlRef.current === resolvedUrl) return;
    if (!isInspectableBrowserUrl(resolvedUrl)) return;

    lastMetadataUrlRef.current = resolvedUrl;
    let cancelled = false;

    const capture = async () => {
      try {
        const response = await fetch(resolvedUrl);
        const text = await response.text();
        if (cancelled) return;
        const title =
          text.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() || resolvedUrl;
        const plainText = text
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);

        snapshotRef.current?.({
          title,
          lastHtmlText: plainText,
          lastError: null,
        });
      } catch (error) {
        if (cancelled) return;
        lastMetadataUrlRef.current = null;
      }
    };

    void capture();

    return () => {
      cancelled = true;
    };
  }, [resolvedUrl]);

  useEffect(() => {
    const frame = viewportFrameRef.current;
    if (!frame) return;

    const measure = () => {
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      if (!width || !height) return;

      const nextScale = Math.min(
        width / BROWSER_VIEWPORT.width,
        height / BROWSER_VIEWPORT.height,
      );
      const scale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;

      setViewportScale(scale);
      setViewportOffset({
        x: Math.max((width - BROWSER_VIEWPORT.width * scale) / 2, 0),
        y: Math.max((height - BROWSER_VIEWPORT.height * scale) / 2, 0),
      });
    };

    measure();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => measure())
        : null;

    observer?.observe(frame);
    window.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const handleFrameLoad = () => {
    const frame = iframeRef.current;
    if (!frame) {
      snapshotRef.current?.({ loading: false });
      return;
    }

    let title = resolvedUrl;
    let lastHtmlText = runtime?.lastError ? "" : undefined;

    try {
      const doc = frame.contentWindow?.document;
      const bodyText = doc?.body?.innerText?.replace(/\s+/g, " ").trim() ?? "";
      title = doc?.title?.trim() || resolvedUrl;
      lastHtmlText = bodyText
        ? bodyText.slice(0, 4000)
        : runtime?.lastError
          ? ""
          : undefined;
    } catch {
      title = runtime?.title || resolvedUrl;
    }

    snapshotRef.current?.({
      title,
      lastHtmlText,
      lastError: null,
      loading: false,
    });
  };

  const handleFrameError = () => {
    snapshotRef.current?.({
      title: resolvedUrl,
      lastError: "Nao foi possivel carregar esta pagina no browser node.",
      loading: false,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3.5">
      <form
        className={cn(
          NODE_PANEL_MUTED_CLASS,
          "flex items-center gap-2 px-2.5 py-2.5",
        )}
        onSubmit={(event) => {
          event.preventDefault();
          runtime?.onNavigate(draftUrl.trim() || resolvedUrl, "push");
        }}
      >
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn("h-8 w-8", NODE_CONTROL_CLASS)}
          onClick={() => runtime?.onBack()}
          disabled={!runtime || runtime.historyIndex <= 0}
        >
          <ArrowDownRight className="h-3.5 w-3.5 rotate-90" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn("h-8 w-8", NODE_CONTROL_CLASS)}
          onClick={() => runtime?.onForward()}
          disabled={
            !runtime || runtime.historyIndex >= runtime.history.length - 1
          }
        >
          <ArrowUpRight className="h-3.5 w-3.5 rotate-90" />
        </Button>
        <Input
          value={draftUrl}
          onChange={(event) => setDraftUrl(event.target.value)}
          className={cn("h-8", NODE_INPUT_CLASS)}
          placeholder="https://example.com"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn("h-8 w-8", NODE_CONTROL_CLASS)}
          onClick={() => {
            setFrameNonce((current) => current + 1);
            runtime?.onRefresh();
          }}
        >
          {runtime?.loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Globe className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn("h-8 w-8", NODE_CONTROL_CLASS)}
          onClick={() =>
            window.open(resolvedUrl, "_blank", "noopener,noreferrer")
          }
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </form>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[18px] border border-white/8 bg-[#0c0c0c]">
        <div
          ref={viewportFrameRef}
          className="relative h-full w-full overflow-hidden bg-[#111111]"
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: BROWSER_VIEWPORT.width,
              height: BROWSER_VIEWPORT.height,
              transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px) scale(${viewportScale})`,
              transformOrigin: "top left",
            }}
          >
            <iframe
              key={`${resolvedUrl}:${frameNonce}`}
              ref={iframeRef}
              data-workspace-control="true"
              title={runtime?.title || presentation.title}
              src={resolvedUrl}
              className="block bg-white"
              style={{
                width: BROWSER_VIEWPORT.width,
                height: BROWSER_VIEWPORT.height,
              }}
              onLoad={handleFrameLoad}
              onError={handleFrameError}
            />
          </div>
          {runtime?.lastError ? (
            <div className="pointer-events-none absolute inset-x-4 top-4 rounded-[18px] border border-amber-300/18 bg-[#1a1410] px-4 py-3 text-left">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-amber-200">
                  <FileWarning className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    Leitura limitada desta pagina
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/58">
                    {runtime.lastError}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isInspectableBrowserUrl(value: string) {
  if (/^(blob:|data:)/i.test(value)) return true;
  try {
    const url = new URL(value, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

function AiSurface({
  presentation,
}: {
  presentation: WorkspaceNodePresentation;
}) {
  const preview = presentation.aiPreview;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3.5">
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className={cn(NODE_PANEL_MUTED_CLASS, "px-3.5 py-3")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={cn(NODE_PANEL_INSET_CLASS, "px-3 py-3")}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
                  Provider
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {preview?.provider ?? "openai"}
                </p>
                <p className="mt-1 text-xs text-white/46">
                  {preview?.model ?? "gpt-5.4-mini"}
                </p>
              </div>
              <div className={cn(NODE_PANEL_INSET_CLASS, "px-3 py-3")}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
                  Runtime
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {preview?.autoRun ? "auto" : "manual"}
                </p>
                <p className="mt-1 text-xs text-white/46">
                  pronto para ler os nodes conectados
                </p>
              </div>
            </div>
          </div>

          <div className={cn(NODE_PANEL_MUTED_CLASS, "px-4 py-4")}>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
              System prompt
            </p>
            <p className="mt-2 line-clamp-4 text-sm leading-6 text-white/66">
              {preview?.systemPrompt ??
                "Leia os dados recebidos e responda de forma acionavel."}
            </p>
          </div>
        </div>

        <div
          className={cn(
            NODE_PANEL_INSET_CLASS,
            "min-h-0 overflow-auto px-4 py-4",
          )}
        >
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
            Last response
          </p>
          <p className="mt-3 text-sm leading-6 text-white/76">
            {preview?.response ?? "Aguardando contexto de entrada."}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatSurface({
  presentation,
  metrics,
  expanded,
}: {
  presentation: WorkspaceNodePresentation;
  metrics: WorkspaceNodePresentation["metrics"];
  expanded: boolean;
}) {
  return (
    <div className={cn(NODE_PANEL_MUTED_CLASS, "p-3.5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
            Snapshot
          </p>
          <p
            className={cn(
              "mt-2 font-semibold tracking-tight text-white",
              expanded
                ? "text-[30px] leading-none"
                : "text-[24px] leading-none",
            )}
          >
            {presentation.headline}
          </p>
          <p className="mt-2 text-xs leading-5 text-white/50">
            {presentation.summary}
          </p>
        </div>
        <div className="rounded-full border border-white/8 bg-white/[0.05] p-2 text-white/48">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}

function ComparisonSurface({
  presentation,
  metrics,
}: {
  presentation: WorkspaceNodePresentation;
  metrics: WorkspaceNodePresentation["metrics"];
}) {
  const primary = metrics[0];
  const tone =
    primary?.tone === "warning" || primary?.tone === "negative" ? "down" : "up";

  return (
    <div className={cn(NODE_PANEL_MUTED_CLASS, "p-3.5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
            Comparison
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-white">
            {presentation.headline}
          </p>
          <p className="mt-1 text-xs leading-5 text-white/50">
            {presentation.summary}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]",
            tone === "down"
              ? "border-amber-300/16 bg-amber-400/[0.08] text-amber-100"
              : "border-emerald-300/16 bg-emerald-400/[0.08] text-emerald-100",
          )}
        >
          {tone === "down" ? (
            <ArrowDownRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5" />
          )}
          {primary?.value ?? presentation.status}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {metrics.slice(0, 4).map((metric) => (
          <NodeMetricTile key={metric.label} metric={metric} />
        ))}
      </div>
    </div>
  );
}

function TextSurface({
  presentation,
  metrics,
}: {
  presentation: WorkspaceNodePresentation;
  metrics: WorkspaceNodePresentation["metrics"];
}) {
  const textPreview = presentation.textPreview;
  const headline =
    typeof textPreview === "string"
      ? textPreview
      : (textPreview?.body ?? presentation.headline);

  return (
    <div className={cn(NODE_PANEL_MUTED_CLASS, "p-4")}>
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
        Narrative
      </p>
      <p className="text-lg font-semibold tracking-tight text-white">
        {headline}
      </p>
      <p className="mt-3 text-xs leading-5 text-white/52">
        {presentation.summary}
      </p>
    </div>
  );
}

function ChartSurface({
  presentation,
  metrics,
  expanded,
}: {
  presentation: WorkspaceNodePresentation;
  metrics: WorkspaceNodePresentation["metrics"];
  expanded: boolean;
}) {
  const points =
    presentation.chartPoints ?? buildFallbackChartPoints(presentation);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3.5">
      <div className={cn(NODE_PANEL_INSET_CLASS, "min-h-0 flex-1 p-3")}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-white">
              {presentation.headline}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/48">
              {presentation.summary}
            </p>
          </div>
          {metrics[1] ? (
            <NodeMetaPill label={metrics[1].label} value={metrics[1].value} />
          ) : null}
        </div>

        <ChartContainer
          config={chartConfig}
          className={cn("w-full", expanded ? "h-[220px]" : "h-[170px]")}
        >
          <AreaChart
            data={points}
            margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 11 }}
              tickFormatter={(value) =>
                String(value).slice(0, expanded ? 6 : 3)
              }
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              fill="var(--color-value)"
              fillOpacity={0.12}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function TableSurface({
  presentation,
  preview,
  item,
  runtime,
}: {
  presentation: WorkspaceNodePresentation;
  preview: NonNullable<WorkspaceNodePresentation["tablePreview"]>;
  item?: TelemetryItemDefinition;
  runtime?: WorkspacePluginCardProps["fileViewerRuntime"];
}) {
  const resolvedPreview =
    item?.specialKind === "file-viewer"
      ? (buildAssetTablePreview(
          runtime?.asset,
          runtime?.activeSheet,
          preview,
        ) ?? preview)
      : preview;

  return (
    <WorkspaceNodeDataTable
      title={presentation.title}
      preview={resolvedPreview}
      sheetNames={resolvedPreview.sheetNames}
      activeSheet={resolvedPreview.activeSheet}
      onSelectSheet={runtime?.onSelectSheet}
    />
  );
}

function parseNumericMetric(value: string) {
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

function buildFallbackChartPoints(presentation: WorkspaceNodePresentation) {
  const firstNumericMetric = presentation.metrics
    .map((metric) => parseNumericMetric(metric.value))
    .find((value): value is number => value !== null);
  const baseValue = firstNumericMetric ?? 24;
  const baseline = Math.max(Math.abs(baseValue), 1);
  const labels = ["t-4", "t-3", "t-2", "t-1", "agora"];
  const deltas = [-0.16, -0.05, 0.07, -0.01, 0.13];

  return labels.map((label, index) => ({
    label,
    value: Math.max(
      0,
      Math.round((baseValue + baseline * deltas[index]) * 100) / 100,
    ),
  }));
}

function buildFallbackTablePreview(presentation: WorkspaceNodePresentation) {
  return {
    columns: ["Campo", "Valor"],
    rows: presentation.metrics.map((metric) => [metric.label, metric.value]),
  };
}
