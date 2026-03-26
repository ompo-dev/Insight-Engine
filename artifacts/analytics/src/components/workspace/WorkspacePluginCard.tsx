import { type KeyboardEvent, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { WorkspaceNodeDataTable } from "@/components/workspace/WorkspaceNodeDataTable";
import { WorkspaceMarkdownPreview } from "@/components/workspace/WorkspaceMarkdownPreview";
import type { TelemetryItemDefinition } from "@/lib/telemetry/items";
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
    command: string;
    running: boolean;
    onCommandChange: (command: string) => void;
    onRun: () => void;
  };
}

const chartConfig = {
  value: {
    label: "Valor",
    color: "#73b8ff",
  },
} satisfies ChartConfig;

const statusToneClassMap = {
  healthy: "border-emerald-300/14 bg-emerald-400/[0.06] text-emerald-100",
  attention: "border-amber-300/14 bg-amber-400/[0.06] text-amber-100",
  inactive: "border-white/8 bg-white/[0.04] text-white/58",
  draft: "border-violet-300/14 bg-violet-400/[0.06] text-violet-100",
} as const;

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
}: WorkspacePluginCardProps) {
  const isSurfaceNode =
    presentation.displayVariant === "chart" ||
    presentation.displayVariant === "table" ||
    presentation.displayVariant === "terminal" ||
    presentation.displayVariant === "markdown";
  const metrics = presentation.metrics.slice(0, expanded ? 4 : 2);
  const shellClassName = cn(
    "relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border bg-[#10151b] text-white transition-[border-color,box-shadow,transform] duration-150",
    selected
      ? "border-sky-300/26 shadow-[0_0_0_1px_rgba(125,211,252,0.14),0_18px_36px_rgba(3,7,12,0.22)]"
      : "border-white/8",
    preview && "shadow-[0_12px_28px_rgba(3,7,12,0.16)]",
    coreOnly && "bg-[#0f141a]",
    className,
  );

  if (canvasMinimal && !isSurfaceNode) {
    return (
      <div className={shellClassName}>
        <MinimalNodeSurface presentation={presentation} />
      </div>
    );
  }

  if (isSurfaceNode) {
    return (
      <div className={shellClassName}>
        {renderDisplayVariant(presentation, metrics, true, item, terminalRuntime)}
      </div>
    );
  }

  const Icon = presentation.icon;

  return (
    <div className={shellClassName}>
      <header className="flex items-center justify-between gap-3 border-b border-white/6 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/8 bg-[#0b1015]">
            <Icon className={cn("h-4 w-4", presentation.accentClassName)} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-white">
              {presentation.title}
            </p>
            <p className="truncate text-[10px] text-white/36">
              {presentation.subtitle || presentation.kindLabel}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em]",
            statusToneClassMap[presentation.status],
          )}
        >
          {presentation.badgeLabel ?? presentation.status}
        </span>
      </header>

      <div className={cn("flex flex-1 flex-col", expanded ? "gap-4 p-4" : "gap-3 p-3")}>
        <div className="space-y-1.5">
          <p
            className={cn(
              "font-semibold leading-none tracking-tight text-white",
              expanded ? "text-[22px]" : "text-[16px]",
            )}
          >
            {presentation.headline}
          </p>
          <p
            className={cn(
              "text-white/46",
              expanded
                ? "text-sm leading-6"
                : "line-clamp-2 text-[11px] leading-4",
            )}
          >
            {presentation.summary}
          </p>
        </div>

        {presentation.formula && expanded ? (
          <div className="rounded-[18px] border border-white/8 bg-[#0b1015] px-3 py-3">
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
          <div className="overflow-hidden rounded-[20px] border border-white/8 bg-[#0b1015]">
            {renderDisplayVariant(presentation, metrics, true, item, terminalRuntime)}
          </div>
        ) : null}

        <div
          className={cn(
            "grid gap-2",
            metrics.length > 1 ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {metrics.map((metric) => (
            <NodeMetricTile key={metric.label} metric={metric} />
          ))}
        </div>

        {footerAction ? <div className="mt-auto">{footerAction}</div> : null}
      </div>
    </div>
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
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/8 bg-[#0b1015]">
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

      <span
        className={cn(
          "inline-flex shrink-0 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em]",
          statusToneClassMap[presentation.status],
        )}
      >
        {presentation.badgeLabel ?? presentation.status}
      </span>
    </div>
  );
}

function NodeMetricTile({ metric }: { metric: WorkspaceNodeMetric }) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-[#0b1015] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
        {metric.label}
      </p>
      <p className="mt-1 text-xs font-medium text-white/84">{metric.value}</p>
    </div>
  );
}

function renderDisplayVariant(
  presentation: WorkspaceNodePresentation,
  metrics: WorkspaceNodePresentation["metrics"],
  expanded: boolean,
  item?: TelemetryItemDefinition,
  terminalRuntime?: WorkspacePluginCardProps["terminalRuntime"],
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
        preview={
          presentation.tablePreview ?? buildFallbackTablePreview(presentation)
        }
      />
    );
  }

  if (displayVariant === "terminal") {
    return <TerminalSurface presentation={presentation} item={item} terminalRuntime={terminalRuntime} />;
  }

  if (displayVariant === "markdown") {
    return <MarkdownSurface presentation={presentation} />;
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
    <StatSurface presentation={presentation} metrics={metrics} expanded={expanded} />
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
  const command = terminalRuntime?.command ?? preview?.command ?? "";
  const allowInlineRuntime = Boolean(terminalRuntime && item?.specialKind === "terminal");

  return (
    <div className="flex h-full flex-col gap-3 p-3.5">
      <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-[#0b1015] px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
          </div>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/40">
            {preview?.shell ?? "bash"} terminal
          </p>
        </div>
        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/54">
          {preview?.streamOutput ? "live" : "manual"}
        </span>
      </div>

      <div className="flex-1 overflow-hidden rounded-[20px] border border-white/8 bg-[#0b1015]">
        <div className="border-b border-white/8 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/34">
          {preview?.workingDirectory ?? "/workspace"}
        </div>
        <div
          data-workspace-surface="true"
          className="h-full overflow-auto px-3 py-3 font-mono text-[12px] leading-6 text-emerald-100/86"
        >
          {(preview?.lines.length ? preview.lines : ["ready"]).map((line, index) => (
            <p key={`${line}:${index}`} className="truncate">
              {line}
            </p>
          ))}
        </div>
      </div>

      {allowInlineRuntime ? (
        <form
          data-workspace-control="true"
          className="flex items-center gap-2 rounded-[18px] border border-white/8 bg-white/[0.03] px-2.5 py-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            terminalRuntime?.onRun();
          }}
        >
          <span className="shrink-0 font-mono text-[12px] text-emerald-200/72">$</span>
          <input
            data-workspace-control="true"
            value={command}
            onChange={(event) => terminalRuntime?.onCommandChange(event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                terminalRuntime?.onRun();
              }
            }}
            className="h-8 flex-1 border-0 bg-transparent font-mono text-[12px] text-white outline-none placeholder:text-white/28"
            placeholder="Digite um comando"
            spellCheck={false}
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="h-8 rounded-xl border-white/10 bg-white/[0.04] px-3 text-white hover:bg-white/[0.08]"
            disabled={terminalRuntime?.running || !command.trim()}
            data-workspace-control="true"
          >
            {terminalRuntime?.running ? "Rodando" : "Run"}
          </Button>
        </form>
      ) : (
        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
            Command
          </p>
          <p className="mt-2 truncate font-mono text-[12px] text-white/76">
            {preview?.command ?? "claude --resume"}
          </p>
        </div>
      )}
    </div>
  );
}

function MarkdownSurface({
  presentation,
}: {
  presentation: WorkspaceNodePresentation;
}) {
  const preview = presentation.markdownPreview;

  return (
    <div className="flex h-full flex-col gap-3 p-3.5">
      <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-[#0b1015] px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
            Markdown
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {preview?.template ?? "report"}
          </p>
        </div>
        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/54">
          {preview?.autoPreview ? "preview" : "manual"}
        </span>
      </div>

      <div className="flex-1 overflow-auto rounded-[20px] border border-white/8 bg-[#0b1015] px-4 py-4">
        <WorkspaceMarkdownPreview
          source={preview?.body ?? "# Markdown node\n\nAguardando conteudo."}
        />
      </div>
    </div>
  );
}

function AiSurface({
  presentation,
}: {
  presentation: WorkspaceNodePresentation;
}) {
  const preview = presentation.aiPreview;

  return (
    <div className="flex h-full flex-col gap-3 p-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-white/8 bg-[#0b1015] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
            Provider
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {preview?.provider ?? "openai"}
          </p>
          <p className="mt-1 text-xs text-white/46">{preview?.model ?? "gpt-5.4-mini"}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-[#0b1015] px-3 py-3">
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

      <div className="rounded-[20px] border border-white/8 bg-[#0b1015] px-4 py-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
          System prompt
        </p>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/66">
          {preview?.systemPrompt ?? "Leia os dados recebidos e responda de forma acionavel."}
        </p>
      </div>

      <div className="flex-1 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">
          Last response
        </p>
        <p className="mt-3 text-sm leading-6 text-white/76">
          {preview?.response ?? "Aguardando contexto de entrada."}
        </p>
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
    <div className="rounded-[18px] border border-white/8 bg-[#0b1015] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "font-semibold tracking-tight text-white",
              expanded ? "text-[30px] leading-none" : "text-[24px] leading-none",
            )}
          >
            {presentation.headline}
          </p>
          <p className="mt-2 text-xs leading-5 text-white/50">
            {presentation.summary}
          </p>
        </div>
        <div className="rounded-full border border-white/8 bg-white/[0.03] p-2 text-white/48">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {metrics.slice(0, 2).map((metric) => (
          <Badge
            key={metric.label}
            variant="outline"
            className="border-white/8 bg-white/[0.03] text-[10px] text-white/54"
          >
            {metric.label}: {metric.value}
          </Badge>
        ))}
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
    primary?.tone === "warning" || primary?.tone === "negative"
      ? "down"
      : "up";

  return (
    <div className="rounded-[18px] border border-white/8 bg-[#0b1015] p-3.5">
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
      <div className="mt-3 grid grid-cols-2 gap-2">
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
      : textPreview?.body ?? presentation.headline;

  return (
    <div className="rounded-[18px] border border-white/8 bg-[#0b1015] p-4">
      <p className="text-lg font-semibold tracking-tight text-white">
        {headline}
      </p>
      <p className="mt-3 text-xs leading-5 text-white/52">
        {presentation.summary}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {metrics.slice(0, 2).map((metric) => (
          <Badge
            key={metric.label}
            variant="outline"
            className="border-white/8 bg-white/[0.03] text-[10px] text-white/54"
          >
            {metric.label}: {metric.value}
          </Badge>
        ))}
      </div>
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
  const points = presentation.chartPoints ?? buildFallbackChartPoints(presentation);
  const gradientId = `workspace-node-${sanitizeToken(
    `${presentation.title}-${presentation.headline}`,
  )}`;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[22px] bg-[#0b1015] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {presentation.title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/48">
            {presentation.summary}
          </p>
        </div>
        {metrics[0] ? (
          <Badge
            variant="outline"
            className="border-white/8 bg-white/[0.03] text-[10px] text-white/54"
          >
            {metrics[0].value}
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 min-h-0 flex-1 rounded-[16px] border border-white/8 bg-[#0a0e13] p-2">
        <ChartContainer
          config={chartConfig}
          className={cn("w-full", expanded ? "h-[220px]" : "h-[170px]")}
        >
          <AreaChart
            data={points}
            margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
              fill={`url(#${gradientId})`}
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
}: {
  presentation: WorkspaceNodePresentation;
  preview: NonNullable<WorkspaceNodePresentation["tablePreview"]>;
}) {
  return (
    <WorkspaceNodeDataTable title={presentation.title} preview={preview} />
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

function sanitizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
