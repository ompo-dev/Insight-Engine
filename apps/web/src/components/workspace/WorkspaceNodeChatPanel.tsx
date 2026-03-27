 "use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Cable,
  Database,
  Send,
} from "lucide-react";
import {
  buildExpressionSuggestions,
  type TelemetryItemDefinition,
  type TelemetrySystemMetric,
} from "@/lib/telemetry/items";
import { ExpressionEditor, WorkspaceCodeEditor } from "@/components/workspace/WorkspaceItemEditor";
import { WorkspaceMarkdownPreview } from "@/components/workspace/WorkspaceMarkdownPreview";
import type {
  CanvasNode,
  WorkspaceItemEditorSection,
  WorkspaceNodeBinding,
  WorkspaceNodePresentation,
} from "@/lib/workspace/types";
import { useCustomItemStore } from "@/store/use-custom-item-store";
import { cn } from "@/lib/utils";

type NodeConfigTab = "receive" | "program" | "send";

const NODE_INPUT_CLASS =
  "h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-sky-300/26 focus:bg-white/[0.055]";
const NODE_TEXTAREA_CLASS =
  "w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-sky-300/26 focus:bg-white/[0.055]";
const NODE_SELECT_TRIGGER_CLASS =
  "h-11 w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-sky-300/26";

interface WorkspaceNodeChatPanelProps {
  projectId: string;
  node: CanvasNode | null;
  binding: WorkspaceNodeBinding | null;
  presentation: WorkspaceNodePresentation | null;
  item?: TelemetryItemDefinition;
  items: TelemetryItemDefinition[];
  referenceItems: TelemetryItemDefinition[];
  systemMetrics: TelemetrySystemMetric[];
  focusSection?: WorkspaceItemEditorSection | null;
  onAction: (actionId: string, binding: WorkspaceNodeBinding, nodeId: string) => void;
}

export function WorkspaceNodeChatPanel({
  projectId,
  node,
  binding,
  presentation,
  item,
  items,
  referenceItems,
  systemMetrics,
  focusSection,
}: WorkspaceNodeChatPanelProps) {
  const updateItem = useCustomItemStore((state) => state.updateItem);
  const [activeTab, setActiveTab] = useState<NodeConfigTab>("receive");
  const [schemaJson, setSchemaJson] = useState("{}");
  const [sampleJson, setSampleJson] = useState("{}");
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);

  const isEditableNode = binding?.kind === "item" && item?.mode === "custom";
  const snippetBundle = item?.receive?.snippets ?? item?.snippets;
  const suggestions = useMemo(
    () => buildExpressionSuggestions({ items: referenceItems, systemMetrics, currentItemId: item?.id }),
    [item?.id, referenceItems, systemMetrics],
  );
  const inboundEntries = useMemo(
    () => buildInboundEntries(binding, item, presentation),
    [binding, item, presentation],
  );
  const outboundEntries = useMemo(
    () => buildOutboundEntries(binding, item, items, presentation),
    [binding, item, items, presentation],
  );
  const outputPreview = resolveOutputPreview(item, presentation);
  const programBlocks = useMemo(
    () => buildProgramBlocks(item, presentation),
    [item, presentation],
  );
  const receiveEnabled =
    item?.receive?.enabled ?? item?.inputEnabled ?? item?.acceptsInput ?? false;
  const actionEnabled = item?.action?.enabled ?? item?.actionEnabled ?? false;
  const actionType = item?.action?.type ?? item?.actionType ?? "webhook";
  const actionMethod = item?.action?.method ?? item?.actionMethod ?? "POST";
  const actionTarget = item?.action?.target ?? item?.actionTarget ?? "";
  const actionLive = item?.action?.live ?? item?.actionLive ?? false;
  const actionPayloadExpression =
    item?.action?.payloadExpression ?? item?.actionPayloadExpression ?? "result";
  const expressionValue = item?.transform?.expression ?? item?.expression ?? "";
  const resultType = item?.transform?.resultType ?? item?.resultType ?? "auto";
  const programError =
    item?.transform?.preview?.error ??
    item?.expressionPreview?.error ??
    item?.result?.error ??
    null;

  useEffect(() => {
    setSchemaJson(JSON.stringify(item?.schema ?? {}, null, 2));
    setSampleJson(JSON.stringify(item?.samplePayload ?? {}, null, 2));
    setSchemaError(null);
    setSampleError(null);
  }, [item?.id, item?.samplePayload, item?.schema]);

  useEffect(() => {
    if (!focusSection) return;
    setActiveTab(normalizeNodeConfigTab(focusSection));
  }, [focusSection]);

  if (!node || !binding || !presentation) {
    return (
      <NodePanelShell>
        <div className="flex h-full items-center justify-center rounded-[28px] border border-white/8 bg-white/[0.03] text-sm text-white/48">
          Selecione um node para editar.
        </div>
      </NodePanelShell>
    );
  }

  const handlePatch = (patch: Partial<TelemetryItemDefinition>) => {
    if (!item || item.mode !== "custom") return;
    updateItem(projectId, item.id, patch as Partial<Parameters<typeof updateItem>[2]>);
  };

  const saveJsonField = (kind: "schema" | "sample") => {
    if (!item || item.mode !== "custom") return;
    try {
      const parsed = JSON.parse(kind === "schema" ? schemaJson : sampleJson) as Record<string, unknown>;
      if (kind === "schema") {
        handlePatch({ schema: parsed as unknown as typeof item.schema, status: "healthy" });
        setSchemaError(null);
        return;
      }
      handlePatch({ samplePayload: parsed, status: "healthy" });
      setSampleError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON invalido.";
      if (kind === "schema") setSchemaError(message);
      else setSampleError(message);
    }
  };

  const appendSuggestion = (value: string) => {
    if (!item || item.mode !== "custom") return;
    const nextExpression = item.expression?.trim() ? `${item.expression}\n${value}` : value;
    handlePatch({ expression: nextExpression });
  };

  return (
    <NodePanelShell>
      <div className="flex flex-wrap gap-2">
        {([
          ["receive", "Receive"],
          ["program", "Program"],
          ["send", "Send"],
        ] as const).map(([tabId, label]) => (
          <NodeTabsTrigger key={tabId} active={activeTab === tabId} onClick={() => setActiveTab(tabId)} label={label} />
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {activeTab === "receive" ? renderReceiveTab({
          binding,
          presentation,
          item,
          isEditableNode,
          receiveEnabled,
          inboundEntries,
          snippetBundle,
          schemaJson,
          sampleJson,
          schemaError,
          sampleError,
          handlePatch,
          saveJsonField,
          setSchemaJson,
          setSampleJson,
        }) : null}

        {activeTab === "program" ? renderProgramTab({
          binding,
          item,
          isEditableNode,
          outputPreview,
          presentation,
          resultType,
          expressionValue,
          programError,
          suggestions,
          handlePatch,
          appendSuggestion,
          programBlocks,
        }) : null}

        {activeTab === "send" ? renderSendTab({
          binding,
          presentation,
          item,
          isEditableNode,
          actionEnabled,
          actionType,
          actionMethod,
          actionTarget,
          actionLive,
          actionPayloadExpression,
          outboundEntries,
          outputPreview,
          handlePatch,
        }) : null}
      </div>
    </NodePanelShell>
  );
}

function NodePanelShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,20,28,0.96),rgba(10,14,21,0.98))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="h-full overflow-y-auto px-4 py-4">{children}</div>
    </div>
  );
}

function NodeTabsTrigger({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition", active ? "border-sky-300/20 bg-sky-400/[0.12] text-sky-100" : "border-white/8 bg-white/[0.03] text-white/58 hover:bg-white/[0.05]")}>
      {label}
    </button>
  );
}

function NodeSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-white/50">{description}</p>
      </div>
      {children}
    </section>
  );
}

function NodeField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] uppercase tracking-[0.2em] text-white/34">{label}</span>
      {children}
    </label>
  );
}

function NodeSwitchCard({
  title,
  description,
  checked,
  onChange,
  activeLabel,
  inactiveLabel,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[24px] border border-white/8 bg-[#0f141b] px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-white/48">{description}</p>
      </div>
      <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked} className={cn("inline-flex h-11 min-w-[132px] items-center justify-center rounded-full border px-4 text-sm font-medium transition", checked ? "border-emerald-300/18 bg-emerald-400/[0.12] text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/56 hover:bg-white/[0.06]")}>
        {checked ? activeLabel : inactiveLabel}
      </button>
    </div>
  );
}

function NodeInlineValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-[#0f141b] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/82">{value}</p>
    </div>
  );
}

function NodeCodeBlock({ label, children }: { label: string; children: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/34">{label}</p>
      <pre className="overflow-auto rounded-[22px] border border-white/8 bg-[#0d1219] p-4 text-[12px] leading-6 text-white/72">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function NodeContractEditor({
  label,
  description,
  value,
  language,
  editable,
  onChange,
  onBlur,
  error,
}: {
  label: string;
  description: string;
  value: string;
  language: string;
  editable: boolean;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0d1219]">
      <div className="border-b border-white/8 px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/34">{label}</p>
        <p className="mt-2 text-sm leading-6 text-white/52">{description}</p>
      </div>
      <WorkspaceCodeEditor
        value={value}
        onChange={editable ? onChange : undefined}
        onBlur={editable ? onBlur : undefined}
        language={language}
        readOnly={!editable}
        height={260}
        options={{
          lineNumbers: "on",
          bracketPairColorization: { enabled: editable },
        }}
      />
      {error ? (
        <div className="border-t border-white/8 px-4 py-3 text-xs text-rose-300">{error}</div>
      ) : null}
    </div>
  );
}

function NodeSpecialProgramPanel({
  item,
  editable,
  handlePatch,
}: {
  item: TelemetryItemDefinition;
  editable: boolean;
  handlePatch: (patch: Partial<TelemetryItemDefinition>) => void;
}) {
  if (item.specialKind === "terminal") {
    return (
      <TerminalProgramPanel
        item={item}
        editable={editable}
        handlePatch={handlePatch}
      />
    );
  }

  if (item.specialKind === "markdown") {
    return (
      <MarkdownProgramPanel
        item={item}
        editable={editable}
        handlePatch={handlePatch}
      />
    );
  }

  if (item.specialKind === "ai") {
    return (
      <AiProgramPanel
        item={item}
        editable={editable}
        handlePatch={handlePatch}
      />
    );
  }

  if (item.specialKind === "file-manager") {
    return (
      <FileManagerProgramPanel
        item={item}
        editable={editable}
        handlePatch={handlePatch}
      />
    );
  }

  if (item.specialKind === "file-viewer") {
    return (
      <FileViewerProgramPanel
        item={item}
        editable={editable}
        handlePatch={handlePatch}
      />
    );
  }

  if (item.specialKind === "browser") {
    return (
      <BrowserProgramPanel
        item={item}
        editable={editable}
        handlePatch={handlePatch}
      />
    );
  }

  return null;
}

function TerminalProgramPanel({
  item,
  editable,
  handlePatch,
}: {
  item: TelemetryItemDefinition;
  editable: boolean;
  handlePatch: (patch: Partial<TelemetryItemDefinition>) => void;
}) {
  const terminal = item.terminal ?? {
    shell: "bash",
    command: "claude --resume",
    workingDirectory: "/workspace",
    streamOutput: true,
    stdinExpression: "result",
    liveOutput: "",
  };

  const patchTerminal = (patch: Partial<typeof terminal>) =>
    handlePatch({ terminal: { ...terminal, ...patch } });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
        <NodeContractEditor
          label="Terminal command"
          description="Comando principal da sessao shell. Futuramente este node podera receber runtimes como Claude Code."
          value={terminal.command}
          language="shell"
          editable={editable}
          onChange={(value) => patchTerminal({ command: value })}
        />
        <div className="space-y-3">
          {editable ? (
            <>
              <NodeField label="Shell">
                <select
                  value={terminal.shell}
                  onChange={(event) =>
                    patchTerminal({
                      shell: event.target.value as NonNullable<typeof terminal.shell>,
                    })
                  }
                  className={NODE_SELECT_TRIGGER_CLASS}
                >
                  <option value="cmd">cmd</option>
                  <option value="bash">bash</option>
                  <option value="zsh">zsh</option>
                  <option value="powershell">powershell</option>
                </select>
              </NodeField>
              <NodeField label="Working directory">
                <input
                  value={terminal.workingDirectory}
                  onChange={(event) =>
                    patchTerminal({ workingDirectory: event.target.value })
                  }
                  className={NODE_INPUT_CLASS}
                  placeholder="/workspace"
                />
              </NodeField>
              <NodeSwitchCard
                title="Relay stdout"
                description="Quando ligado, o stdout da sessao vira o resultado vivo deste node para envio e chaining."
                checked={terminal.streamOutput}
                onChange={(checked) => patchTerminal({ streamOutput: checked })}
                activeLabel="Live relay"
                inactiveLabel="Manual relay"
              />
              <NodeInlineValue label="Session" value={terminal.sessionStatus ?? "disconnected"} />
              <NodeInlineValue
                label="Last exit"
                value={terminal.lastExitCode === null || terminal.lastExitCode === undefined ? "-" : String(terminal.lastExitCode)}
              />
            </>
          ) : (
            <>
              <NodeInlineValue label="Shell" value={terminal.shell} />
              <NodeInlineValue
                label="Working directory"
                value={terminal.workingDirectory}
              />
              <NodeInlineValue
                label="Relay stdout"
                value={terminal.streamOutput ? "live" : "manual"}
              />
              <NodeInlineValue label="Session" value={terminal.sessionStatus ?? "disconnected"} />
              <NodeInlineValue
                label="Last exit"
                value={terminal.lastExitCode === null || terminal.lastExitCode === undefined ? "-" : String(terminal.lastExitCode)}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <NodeContractEditor
          label="STDIN expression"
          description="Expressao que decide o que entra na sessao do terminal vindo dos nodes conectados."
          value={terminal.stdinExpression}
          language="javascript"
          editable={editable}
          onChange={(value) => patchTerminal({ stdinExpression: value })}
        />
        <NodeContractEditor
          label="Live output"
          description="Transcript atual da sessao. Este buffer pode ser retransmitido em tempo real para outros nodes."
          value={terminal.liveOutput}
          language="shell"
          editable={editable}
          onChange={(value) => patchTerminal({ liveOutput: value })}
        />
      </div>
    </div>
  );
}

function MarkdownProgramPanel({
  item,
  editable,
  handlePatch,
}: {
  item: TelemetryItemDefinition;
  editable: boolean;
  handlePatch: (patch: Partial<TelemetryItemDefinition>) => void;
}) {
  const markdown = item.markdown ?? {
    document: "# Markdown node",
    template: "report",
    autoPreview: true,
  };

  const patchMarkdown = (patch: Partial<typeof markdown>) =>
    handlePatch({ markdown: { ...markdown, ...patch } });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-2">
        <NodeContractEditor
          label="Markdown document"
          description="Documento principal do node. Ideal para relatorios gerados por IA, notas operacionais e sinteses executivas."
          value={markdown.document}
          language="markdown"
          editable={editable}
          onChange={(value) => patchMarkdown({ document: value })}
        />
        <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0d1219]">
          <div className="border-b border-white/8 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/34">
              Markdown preview
            </p>
            <p className="mt-2 text-sm leading-6 text-white/52">
              Preview imediato do documento que este node vai publicar ou enviar.
            </p>
          </div>
          <div className="max-h-[260px] overflow-auto px-4 py-4">
            <WorkspaceMarkdownPreview source={markdown.document} />
          </div>
        </div>
      </div>

      {editable ? (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <NodeField label="Template">
            <select
              value={markdown.template}
              onChange={(event) =>
                patchMarkdown({
                  template: event.target.value as NonNullable<typeof markdown.template>,
                })
              }
              className={NODE_SELECT_TRIGGER_CLASS}
            >
              <option value="report">report</option>
              <option value="notes">notes</option>
              <option value="freeform">freeform</option>
            </select>
          </NodeField>
          <NodeSwitchCard
            title="Auto preview"
            description="Renderiza a visualizacao automaticamente conforme o documento muda."
            checked={markdown.autoPreview}
            onChange={(checked) => patchMarkdown({ autoPreview: checked })}
            activeLabel="Preview on"
            inactiveLabel="Preview off"
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <NodeInlineValue label="Template" value={markdown.template} />
          <NodeInlineValue
            label="Auto preview"
            value={markdown.autoPreview ? "ativo" : "manual"}
          />
        </div>
      )}
    </div>
  );
}

function AiProgramPanel({
  item,
  editable,
  handlePatch,
}: {
  item: TelemetryItemDefinition;
  editable: boolean;
  handlePatch: (patch: Partial<TelemetryItemDefinition>) => void;
}) {
  const ai = item.ai ?? {
    provider: "openai",
    model: "gpt-5.4-mini",
    apiKey: "",
    systemPrompt: "",
    autoRun: false,
    temperature: 0.3,
    lastResponse: "",
  };

  const patchAi = (patch: Partial<typeof ai>) =>
    handlePatch({ ai: { ...ai, ...patch } });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
        <NodeContractEditor
          label="System prompt"
          description="Instrucao-base do modelo. O node usa os dados recebidos como contexto e envia a resposta para o fluxo."
          value={ai.systemPrompt}
          language="markdown"
          editable={editable}
          onChange={(value) => patchAi({ systemPrompt: value })}
        />
        <div className="space-y-3">
          {editable ? (
            <>
              <NodeField label="Provider">
                <select
                  value={ai.provider}
                  onChange={(event) =>
                    patchAi({
                      provider: event.target.value as NonNullable<typeof ai.provider>,
                    })
                  }
                  className={NODE_SELECT_TRIGGER_CLASS}
                >
                  <option value="openai">openai</option>
                  <option value="anthropic">anthropic</option>
                  <option value="google">google</option>
                  <option value="custom">custom</option>
                </select>
              </NodeField>
              <NodeField label="Model">
                <input
                  value={ai.model}
                  onChange={(event) => patchAi({ model: event.target.value })}
                  className={NODE_INPUT_CLASS}
                  placeholder="gpt-5.4-mini"
                />
              </NodeField>
              <NodeField label="API key">
                <input
                  type="password"
                  value={ai.apiKey}
                  onChange={(event) => patchAi({ apiKey: event.target.value })}
                  className={NODE_INPUT_CLASS}
                  placeholder="sk-..."
                />
              </NodeField>
            </>
          ) : (
            <>
              <NodeInlineValue label="Provider" value={ai.provider} />
              <NodeInlineValue label="Model" value={ai.model} />
              <NodeInlineValue
                label="API key"
                value={ai.apiKey ? "configurada" : "vazia"}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <NodeContractEditor
          label="Last response"
          description="Ultima resposta do modelo. Pode circular para markdown, terminal ou qualquer outro node seguinte."
          value={ai.lastResponse}
          language="markdown"
          editable={editable}
          onChange={(value) => patchAi({ lastResponse: value })}
        />
        <div className="space-y-3">
          {editable ? (
            <>
              <NodeField label="Temperature">
                <input
                  value={String(ai.temperature)}
                  onChange={(event) =>
                    patchAi({
                      temperature: Number.parseFloat(event.target.value) || 0,
                    })
                  }
                  className={NODE_INPUT_CLASS}
                  placeholder="0.3"
                />
              </NodeField>
              <NodeSwitchCard
                title="Auto run"
                description="Quando ligado, o node tenta executar o provider automaticamente ao receber contexto novo."
                checked={ai.autoRun}
                onChange={(checked) => patchAi({ autoRun: checked })}
                activeLabel="Auto"
                inactiveLabel="Manual"
              />
            </>
          ) : (
            <>
              <NodeInlineValue
                label="Temperature"
                value={String(ai.temperature)}
              />
              <NodeInlineValue
                label="Auto run"
                value={ai.autoRun ? "ativo" : "manual"}
              />
            </>
          )}

          <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0d1219]">
            <div className="border-b border-white/8 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/34">
                Response preview
              </p>
              <p className="mt-2 text-sm leading-6 text-white/52">
                Leitura rapida da resposta atual do modelo em markdown.
              </p>
            </div>
            <div className="max-h-[260px] overflow-auto px-4 py-4">
              <WorkspaceMarkdownPreview
                source={ai.lastResponse || "Aguardando resposta do modelo."}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileManagerProgramPanel({
  item,
  editable,
  handlePatch,
}: {
  item: TelemetryItemDefinition;
  editable: boolean;
  handlePatch: (patch: Partial<TelemetryItemDefinition>) => void;
}) {
  const fileManager = item.fileManager ?? {
    assetIds: [],
    sortBy: "recent",
    filter: "",
    selectedAssetId: null,
    viewMode: "list",
  };

  const patchFileManager = (patch: Partial<typeof fileManager>) =>
    handlePatch({ fileManager: { ...fileManager, ...patch } });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <NodeInlineValue label="Assets" value={String(fileManager.assetIds.length)} />
        <NodeInlineValue label="Selected asset" value={fileManager.selectedAssetId ?? "nenhum"} />
      </div>

      {editable ? (
        <div className="grid gap-3 xl:grid-cols-3">
          <NodeField label="Sort">
            <select
              value={fileManager.sortBy}
              onChange={(event) =>
                patchFileManager({
                  sortBy: event.target.value as NonNullable<typeof fileManager.sortBy>,
                })
              }
              className={NODE_SELECT_TRIGGER_CLASS}
            >
              <option value="recent">recent</option>
              <option value="name">name</option>
              <option value="size">size</option>
            </select>
          </NodeField>
          <NodeField label="View mode">
            <select
              value={fileManager.viewMode}
              onChange={(event) =>
                patchFileManager({
                  viewMode: event.target.value as NonNullable<typeof fileManager.viewMode>,
                })
              }
              className={NODE_SELECT_TRIGGER_CLASS}
            >
              <option value="list">list</option>
              <option value="grid">grid</option>
            </select>
          </NodeField>
          <NodeField label="Filter">
            <input
              value={fileManager.filter}
              onChange={(event) => patchFileManager({ filter: event.target.value })}
              className={NODE_INPUT_CLASS}
              placeholder="buscar por nome ou tipo"
            />
          </NodeField>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <NodeInlineValue label="Sort" value={fileManager.sortBy} />
          <NodeInlineValue label="View mode" value={fileManager.viewMode} />
          <NodeInlineValue label="Filter" value={fileManager.filter || "sem filtro"} />
        </div>
      )}

      <NodeCodeBlock label="Assets vinculados">
        {fileManager.assetIds.length ? fileManager.assetIds.join("\n") : "nenhum asset vinculado"}
      </NodeCodeBlock>
    </div>
  );
}

function FileViewerProgramPanel({
  item,
  editable,
  handlePatch,
}: {
  item: TelemetryItemDefinition;
  editable: boolean;
  handlePatch: (patch: Partial<TelemetryItemDefinition>) => void;
}) {
  const fileViewer = item.fileViewer ?? {
    assetId: null,
    viewerType: "document",
    previewState: "ready",
    activeSheet: null,
    currentPage: 1,
  };

  const patchFileViewer = (patch: Partial<typeof fileViewer>) =>
    handlePatch({ fileViewer: { ...fileViewer, ...patch } });

  return (
    <div className="space-y-3">
      {editable ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <NodeField label="Asset id">
            <input
              value={fileViewer.assetId ?? ""}
              onChange={(event) => patchFileViewer({ assetId: event.target.value || null })}
              className={NODE_INPUT_CLASS}
              placeholder="asset_xxx"
            />
          </NodeField>
          <NodeField label="Viewer type">
            <select
              value={fileViewer.viewerType}
              onChange={(event) =>
                patchFileViewer({
                  viewerType: event.target.value as NonNullable<typeof fileViewer.viewerType>,
                })
              }
              className={NODE_SELECT_TRIGGER_CLASS}
            >
              <option value="document">document</option>
              <option value="image">image</option>
              <option value="table">table</option>
              <option value="text">text</option>
            </select>
          </NodeField>
          <NodeField label="Preview state">
            <select
              value={fileViewer.previewState}
              onChange={(event) =>
                patchFileViewer({
                  previewState: event.target.value as NonNullable<typeof fileViewer.previewState>,
                })
              }
              className={NODE_SELECT_TRIGGER_CLASS}
            >
              <option value="ready">ready</option>
              <option value="processing">processing</option>
              <option value="error">error</option>
              <option value="missing">missing</option>
            </select>
          </NodeField>
          <NodeField label="Active sheet">
            <input
              value={fileViewer.activeSheet ?? ""}
              onChange={(event) => patchFileViewer({ activeSheet: event.target.value || null })}
              className={NODE_INPUT_CLASS}
              placeholder="Sheet1"
            />
          </NodeField>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <NodeInlineValue label="Asset id" value={fileViewer.assetId ?? "nenhum"} />
          <NodeInlineValue label="Viewer type" value={fileViewer.viewerType} />
          <NodeInlineValue label="Preview state" value={fileViewer.previewState} />
          <NodeInlineValue label="Active sheet" value={fileViewer.activeSheet ?? "-"} />
        </div>
      )}
    </div>
  );
}

function BrowserProgramPanel({
  item,
  editable,
  handlePatch,
}: {
  item: TelemetryItemDefinition;
  editable: boolean;
  handlePatch: (patch: Partial<TelemetryItemDefinition>) => void;
}) {
  const browser = item.browser ?? {
    url: "https://example.com",
    history: ["https://example.com"],
    historyIndex: 0,
    title: "Browser Node",
    loading: false,
    lastHtmlText: "",
    lastError: null,
  };

  const patchBrowser = (patch: Partial<typeof browser>) =>
    handlePatch({ browser: { ...browser, ...patch } });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
        <NodeContractEditor
          label="Current URL"
          description="Endereco atual do browser node. Pode vir de outro node ou ser definido manualmente."
          value={browser.url}
          language="text"
          editable={editable}
          onChange={(value) => patchBrowser({ url: value })}
        />
        <div className="space-y-3">
          <NodeInlineValue label="Title" value={browser.title || "sem titulo"} />
          <NodeInlineValue label="Loading" value={browser.loading ? "ativo" : "idle"} />
          <NodeInlineValue label="History" value={String(browser.history.length)} />
        </div>
      </div>

      <NodeContractEditor
        label="Extracted text"
        description="Trecho textual materializado quando a pagina puder ser lida internamente pelo client."
        value={browser.lastHtmlText || browser.lastError || "Sem captura de texto ainda."}
        language="text"
        editable={editable}
        onChange={(value) => patchBrowser({ lastHtmlText: value })}
      />
    </div>
  );
}

function NodeEmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-white/48">
      {text}
    </div>
  );
}

type NodeFlowEntry = {
  kind: "external" | "node" | "system" | "canvas";
  direction: "in" | "out";
  label: string;
  description: string;
};

function NodeConnectionList({
  title,
  entries,
  emptyText,
}: {
  title: string;
  entries: NodeFlowEntry[];
  emptyText: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/34">{title}</p>
      {entries.length ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={`${entry.kind}:${entry.direction}:${entry.label}:${entry.description}`} className="flex items-start gap-3 rounded-[22px] border border-white/8 bg-[#0f141b] px-4 py-3">
              <div className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border", entry.kind === "external" && "border-emerald-300/18 bg-emerald-400/[0.08] text-emerald-100", entry.kind === "node" && "border-sky-300/18 bg-sky-400/[0.08] text-sky-100", entry.kind === "system" && "border-violet-300/18 bg-violet-400/[0.08] text-violet-100", entry.kind === "canvas" && "border-amber-300/18 bg-amber-400/[0.08] text-amber-100")}>
                {entry.kind === "external" ? entry.direction === "in" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" /> : entry.kind === "node" ? <Cable className="h-4 w-4" /> : entry.kind === "system" ? <Database className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{entry.label}</p>
                <p className="mt-1 text-sm leading-6 text-white/52">{entry.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <NodeEmptyState text={emptyText} />
      )}
    </div>
  );
}

function renderReceiveTab(input: {
  binding: WorkspaceNodeBinding | null;
  presentation: WorkspaceNodePresentation | null;
  item?: TelemetryItemDefinition;
  isEditableNode: boolean;
  receiveEnabled: boolean;
  inboundEntries: NodeFlowEntry[];
  snippetBundle?: { send: string; generatedClient: string };
  schemaJson: string;
  sampleJson: string;
  schemaError: string | null;
  sampleError: string | null;
  handlePatch: (patch: Partial<TelemetryItemDefinition>) => void;
  saveJsonField: (kind: "schema" | "sample") => void;
  setSchemaJson: (value: string) => void;
  setSampleJson: (value: string) => void;
}) {
  const {
    binding,
    presentation,
    item,
    isEditableNode,
    receiveEnabled,
    inboundEntries,
    snippetBundle,
    schemaJson,
    sampleJson,
    schemaError,
    sampleError,
    handlePatch,
    saveJsonField,
    setSchemaJson,
    setSampleJson,
  } = input;

  return (
    <>
      <NodeSection
        title="Receive"
        description="Defina como este node recebe payloads via SDK, API e outros nodes conectados."
      >
        {item ? (
          <>
            {isEditableNode ? (
              <>
                <NodeSwitchCard
                  title="Entrada externa"
                  description="Liga o recebimento direto por API, SDK ou runtime do cliente."
                  checked={receiveEnabled}
                  onChange={(checked) => handlePatch({ inputEnabled: checked })}
                  activeLabel="Receive on"
                  inactiveLabel="Receive off"
                />
              </>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <NodeInlineValue
                  label="Entrada externa"
                  value={receiveEnabled ? "ativa" : "desligada"}
                />
                <NodeInlineValue label="Slug de entrada" value={item.slug} />
                <NodeInlineValue
                  label="Identity keys"
                  value={item.identityKeys.length ? item.identityKeys.join(", ") : "nenhuma"}
                />
                <NodeInlineValue
                  label="Timestamp field"
                  value={item.timestampField ?? "nao definido"}
                />
              </div>
            )}

            <NodeConnectionList
              title="Quem envia dados para este node"
              entries={inboundEntries}
              emptyText="Nenhum payload chegando neste node ainda."
            />
          </>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <NodeInlineValue
              label="Entrada externa"
              value={resolveSyntheticReceiveState(binding)}
            />
            <NodeInlineValue
              label="Slug de entrada"
              value={resolveSyntheticReceiveSlug(binding, presentation)}
            />
            <NodeInlineValue
              label="Identity keys"
              value="runtime, nodeId"
            />
            <NodeInlineValue
              label="Timestamp field"
              value="receivedAt"
            />
          </div>
        )}
      </NodeSection>

      <NodeSection
        title="Input Contract"
        description="Contrato tecnico de ingestao. O runtime valida o schema, materializa um payload de referencia e gera o codigo de integracao do cliente."
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_280px]">
          <div className="rounded-[24px] border border-white/8 bg-[#0f141b] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/34">Runtime contract</p>
            <p className="mt-3 text-sm font-semibold text-white">Tudo o que entra neste node precisa obedecer este contrato antes de virar dado programavel.</p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Schema, payload de referencia e snippets ficam acoplados ao mesmo fluxo para o user integrar o codigo do cliente sem sair do canvas.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <NodeInlineValue
              label="Entrada"
              value={receiveEnabled ? "sdk, api e fluxo interno" : "somente fluxo interno"}
            />
            <NodeInlineValue
              label="Conexoes de entrada"
              value={formatConnectionCount(inboundEntries.length)}
            />
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <NodeContractEditor
            label="Schema validado"
            description="Defina exatamente os campos que este node aceita receber do cliente ou de outros nodes."
            value={isEditableNode ? schemaJson : resolveReceiveSchemaJson(item, binding, presentation)}
            language="json"
            editable={isEditableNode}
            onChange={setSchemaJson}
            onBlur={() => saveJsonField("schema")}
            error={schemaError}
          />
          <NodeContractEditor
            label="Payload de exemplo"
            description="Exemplo real do dado que sera materializado e armazenado dentro deste node."
            value={isEditableNode ? sampleJson : resolveReceiveSampleJson(item, binding, presentation)}
            language="json"
            editable={isEditableNode}
            onChange={setSampleJson}
            onBlur={() => saveJsonField("sample")}
            error={sampleError}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <NodeContractEditor
            label="SDK snippet"
            description="Trecho pronto para o dev disparar este contrato a partir do codigo do cliente."
            value={resolveReceiveSnippet(snippetBundle?.send, binding, presentation)}
            language="typescript"
            editable={false}
          />
          <NodeContractEditor
            label="Client gerado"
            description="Helper gerado pelo runtime para simplificar o envio direto para este node."
            value={resolveGeneratedClientSnippet(snippetBundle?.generatedClient, binding, presentation)}
            language="typescript"
            editable={false}
          />
        </div>
      </NodeSection>
    </>
  );
}

function renderProgramTab(input: {
  binding: WorkspaceNodeBinding | null;
  item?: TelemetryItemDefinition;
  isEditableNode: boolean;
  outputPreview: string;
  presentation: WorkspaceNodePresentation | null;
  resultType: string;
  expressionValue: string;
  programError: string | null;
  suggestions: ReturnType<typeof buildExpressionSuggestions>;
  handlePatch: (patch: Partial<TelemetryItemDefinition>) => void;
  appendSuggestion: (value: string) => void;
  programBlocks: Array<{ label: string; code: string }>;
}) {
  const {
    binding,
    item,
    isEditableNode,
    outputPreview,
    presentation,
    resultType,
    expressionValue,
    programError,
    suggestions,
    handlePatch,
    appendSuggestion,
    programBlocks,
  } = input;

  return (
    <>
      <NodeSection
        title="Program"
        description='Manipule os dados recebidos para somar, concatenar, filtrar e gerar resultados como `(carrinho.total + mrr) + " total..."`.'
      >
        {item ? (
          isEditableNode ? (
            <div className="space-y-4">
              {item.specialKind ? (
                <NodeSpecialProgramPanel
                  item={item}
                  editable
                  handlePatch={handlePatch}
                />
              ) : null}
              <ExpressionEditor
                value={expressionValue}
                onChange={(nextValue) => handlePatch({ expression: nextValue })}
                suggestions={suggestions}
                previewText={outputPreview}
                previewError={programError}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {item.specialKind ? (
                <NodeSpecialProgramPanel
                  item={item}
                  editable={false}
                  handlePatch={handlePatch}
                />
              ) : null}
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-3">
                  {programBlocks.length ? (
                    <div className="space-y-3">
                      {programBlocks.map((block) => (
                        <NodeCodeBlock key={block.label} label={block.label}>
                          {block.code}
                        </NodeCodeBlock>
                      ))}
                    </div>
                  ) : (
                    <NodeEmptyState text="Este node ainda nao materializou uma formula ou expressao nesta camada." />
                  )}
                </div>

                <div className="space-y-3">
                  <NodeInlineValue label="Result type" value={formatResultType(resultType)} />
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/34">Output preview</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{outputPreview}</p>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      {presentation?.summary ?? "Resultado atual do node no fluxo."}
                    </p>
                    {programError ? <p className="mt-3 text-xs text-rose-300">{programError}</p> : null}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <NodeCodeBlock label="Node program">
              {resolveSyntheticProgram(binding, presentation, outputPreview)}
            </NodeCodeBlock>
            <div className="space-y-3">
              <NodeInlineValue label="Result type" value={formatResultType(resultType)} />
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/34">Output preview</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{outputPreview}</p>
                <p className="mt-2 text-sm leading-6 text-white/52">
                  {presentation?.summary ?? "Resultado atual do node no fluxo."}
                </p>
              </div>
            </div>
          </div>
        )}
      </NodeSection>

      <NodeSection
        title="References"
        description="Campos, nodes e metricas disponiveis para alimentar a programacao dinamica."
      >
        {suggestions.length ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 20).map((suggestion) => (
              <button
                key={`${suggestion.category}:${suggestion.value}`}
                type="button"
                onClick={() => appendSuggestion(suggestion.value)}
                disabled={!isEditableNode}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition",
                  isEditableNode
                    ? "border-white/8 bg-white/[0.03] text-white/72 hover:border-sky-300/22 hover:bg-sky-400/[0.08]"
                    : "cursor-default border-white/8 bg-white/[0.02] text-white/48",
                )}
              >
                <span className="font-mono">{suggestion.value}</span>
                <span className="text-white/34">{suggestion.category}</span>
              </button>
            ))}
          </div>
        ) : (
          <NodeEmptyState text="Nenhuma referencia extra disponivel para este node ainda." />
        )}
      </NodeSection>
    </>
  );
}

function renderSendTab(input: {
  binding: WorkspaceNodeBinding | null;
  presentation: WorkspaceNodePresentation | null;
  item?: TelemetryItemDefinition;
  isEditableNode: boolean;
  actionEnabled: boolean;
  actionType: string;
  actionMethod: string;
  actionTarget: string;
  actionLive: boolean;
  actionPayloadExpression: string;
  outboundEntries: NodeFlowEntry[];
  outputPreview: string;
  handlePatch: (patch: Partial<TelemetryItemDefinition>) => void;
}) {
  const {
    binding,
    presentation,
    item,
    isEditableNode,
    actionEnabled,
    actionType,
    actionMethod,
    actionTarget,
    actionLive,
    actionPayloadExpression,
    outboundEntries,
    outputPreview,
    handlePatch,
  } = input;

  return (
    <>
      <NodeSection
        title="Send"
        description="Escolha o que este node entrega para outros nodes do canvas ou para APIs externas."
      >
        {item ? (
          <>
            {isEditableNode ? (
              <>
                <NodeSwitchCard
                  title="Envio externo"
                  description="Liga a entrega do resultado para webhook, integracao ou runtime externo."
                  checked={actionEnabled}
                  onChange={(checked) => handlePatch({ actionEnabled: checked })}
                  activeLabel="Send on"
                  inactiveLabel="Send off"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <NodeField label="Tipo de envio">
                    <select
                      value={actionType}
                      onChange={(event) =>
                        handlePatch({
                          actionType: event.target.value as TelemetryItemDefinition["actionType"],
                        })
                      }
                      className={NODE_SELECT_TRIGGER_CLASS}
                    >
                      <option value="webhook">Webhook</option>
                      <option value="dataset-export">Export dataset</option>
                      <option value="integration">Integracao</option>
                      <option value="ai-trigger">IA trigger</option>
                    </select>
                  </NodeField>
                  <NodeField label="Metodo">
                    <select
                      value={actionMethod}
                      onChange={(event) =>
                        handlePatch({
                          actionMethod: event.target.value as TelemetryItemDefinition["actionMethod"],
                        })
                      }
                      className={NODE_SELECT_TRIGGER_CLASS}
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </NodeField>
                </div>
                <NodeField label="API target">
                  <input
                    value={actionTarget}
                    onChange={(event) => handlePatch({ actionTarget: event.target.value })}
                    className={NODE_INPUT_CLASS}
                    placeholder="https://api.seuapp.com/hooks/carrinho"
                  />
                </NodeField>
                <NodeSwitchCard
                  title="Live mode"
                  description="Entrega automaticamente o resultado sempre que o node recalcula."
                  checked={actionLive}
                  onChange={(checked) => handlePatch({ actionLive: checked })}
                  activeLabel="Live"
                  inactiveLabel="Manual"
                />
                <NodeField label="Payload expression">
                  <textarea
                    rows={5}
                    value={actionPayloadExpression}
                    onChange={(event) =>
                      handlePatch({ actionPayloadExpression: event.target.value })
                    }
                    className={cn(NODE_TEXTAREA_CLASS, "font-mono text-[12px] leading-6")}
                    placeholder="result"
                  />
                </NodeField>
              </>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <NodeInlineValue label="Formato de saida" value={formatOutputShape(item)} />
                <NodeInlineValue label="Envio externo" value={actionEnabled ? "ativo" : "desligado"} />
                <NodeInlineValue label="API target" value={actionTarget || "somente fluxo interno"} />
                <NodeInlineValue
                  label="Payload"
                  value={actionEnabled ? `${actionMethod} ${actionType}` : "resultado interno do node"}
                />
              </div>
            )}

            <NodeConnectionList
              title="Quem recebe dados deste node"
              entries={outboundEntries}
              emptyText="Nenhum destino conectado ainda."
            />
          </>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <NodeInlineValue label="Formato de saida" value={formatOutputShape(item)} />
            <NodeInlineValue label="Envio externo" value={resolveSyntheticSendState(binding)} />
            <NodeInlineValue label="API target" value={resolveSyntheticSendTarget(binding, presentation)} />
            <NodeInlineValue label="Payload" value={resolveSyntheticSendPayload(binding, outputPreview)} />
          </div>
        )}
      </NodeSection>

      <NodeSection
        title="Output Payload"
        description="Resumo do resultado atual e do payload que sai deste node para o fluxo."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <NodeInlineValue label="Output atual" value={outputPreview} />
          <NodeInlineValue label="Shape" value={formatOutputShape(item)} />
          {item?.lastRun ? <NodeInlineValue label="Ultimo run" value={`${item.lastRun.status} em ${item.lastRun.latencyMs}ms`} /> : null}
          {item?.lastDelivery ? <NodeInlineValue label="Ultima entrega" value={item.lastDelivery.status} /> : null}
        </div>
        {actionPayloadExpression ? (
          <NodeCodeBlock label="Payload expression">{actionPayloadExpression}</NodeCodeBlock>
        ) : null}
      </NodeSection>
    </>
  );
}

function buildInboundEntries(binding: WorkspaceNodeBinding | null, item: TelemetryItemDefinition | undefined, presentation: WorkspaceNodePresentation | null) {
  const entries: NodeFlowEntry[] = [];
  if (item) {
    const receiveEnabled = item.receive?.enabled ?? item.inputEnabled ?? item.acceptsInput;
    if (receiveEnabled) {
      entries.push({ kind: "external", direction: "in", label: "API / SDK", description: `Payloads externos entram por "${item.slug}" e ficam disponiveis para a programacao deste node.` });
    }
    item.sources.forEach((source) => {
      if (source.kind === "item") {
        entries.push({ kind: "node", direction: "in", label: source.label, description: "Node anterior conectado como fonte de dados para este fluxo." });
      } else {
        entries.push({ kind: "system", direction: "in", label: source.label, description: "Metrica de sistema disponivel como entrada da programacao." });
      }
    });
  } else if (binding?.kind === "plugin") {
    entries.push({ kind: "system", direction: "in", label: "Workspace core", description: presentation?.summary ?? "Este node recebe sinais internos do workspace." });
  } else if (binding?.kind === "agent") {
    entries.push({ kind: "system", direction: "in", label: "Signals do workspace", description: "O agente recebe contexto do canvas, alertas e dados operacionais." });
  }
  return dedupeFlowEntries(entries);
}

function buildOutboundEntries(binding: WorkspaceNodeBinding | null, item: TelemetryItemDefinition | undefined, items: TelemetryItemDefinition[], presentation: WorkspaceNodePresentation | null) {
  const entries: NodeFlowEntry[] = [];
  if (item) {
    const refs = new Set([item.id, item.slug, binding?.entityId].filter(Boolean));
    items.filter((candidate) => candidate.id !== item.id).forEach((candidate) => {
      if (!candidate.sources.some((source) => source.kind === "item" && refs.has(source.ref))) return;
      entries.push({ kind: "node", direction: "out", label: candidate.label, description: "Consome o resultado deste node como entrada do proprio fluxo." });
    });
    const actionEnabled = item.action?.enabled ?? item.actionEnabled ?? false;
    const actionMethod = item.action?.method ?? item.actionMethod ?? "POST";
    const actionType = item.action?.type ?? item.actionType ?? "webhook";
    const actionTarget = item.action?.target ?? item.actionTarget;
    const actionLive = item.action?.live ?? item.actionLive ?? false;
    if (actionEnabled) {
      entries.push({ kind: "external", direction: "out", label: actionTarget ?? "API externa", description: `${actionMethod} ${actionType}${actionLive ? " em tempo real" : ""}.` });
    }
  } else if (binding?.kind === "plugin") {
    entries.push({ kind: "node", direction: "out", label: "Nodes do canvas", description: presentation?.summary ?? "Este node publica sinais consumidos por outros nodes do workspace." });
  } else if (binding?.kind === "agent") {
    entries.push({ kind: "external", direction: "out", label: "Acoes do agente", description: "O agente usa os sinais do node para responder ou disparar automacoes." });
  }
  return dedupeFlowEntries(entries);
}

function buildProgramBlocks(item: TelemetryItemDefinition | undefined, presentation: WorkspaceNodePresentation | null) {
  const blocks: Array<{ label: string; code: string }> = [];
  if (!item) {
    if (presentation?.formula) blocks.push({ label: "Node program", code: presentation.formula });
    return blocks;
  }
  const transformExpression = item.transform?.expression ?? item.expression;
  if (transformExpression?.trim()) blocks.push({ label: "Expression", code: transformExpression });
  if (item.dsl) blocks.push({ label: "DSL", code: JSON.stringify(item.dsl, null, 2) });
  if (!blocks.length && presentation?.formula) blocks.push({ label: "Node program", code: presentation.formula });
  return blocks;
}

function resolveOutputPreview(item: TelemetryItemDefinition | undefined, presentation: WorkspaceNodePresentation | null) {
  if (!item) return presentation?.headline ?? "Sem output";
  if (item.result?.text) return item.result.text;
  if (item.expressionPreview?.text) return item.expressionPreview.text;
  if (item.materializedMetric?.formattedValue) return item.materializedMetric.formattedValue;
  if (item.materializedDataset) return `${item.materializedDataset.rows.length.toLocaleString("pt-BR")} linhas`;
  if (item.canvasPreview?.headline) return item.canvasPreview.headline;
  return presentation?.headline ?? item.label;
}

function normalizeNodeConfigTab(section: WorkspaceItemEditorSection): NodeConfigTab {
  if (section === "receive") return "receive";
  if (section === "send" || section === "display" || section === "action") return "send";
  return "program";
}

function dedupeFlowEntries(entries: NodeFlowEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.kind}:${entry.direction}:${entry.label}:${entry.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseTags(value: string) {
  return value.split(",").map((token) => token.trim()).filter(Boolean);
}

function formatResultType(value?: string | null) {
  switch (value) {
    case "number":
      return "numero";
    case "currency":
      return "moeda";
    case "percentage":
      return "percentual";
    case "text":
      return "texto";
    case "dataset":
      return "dataset";
    default:
      return "auto";
  }
}

function formatOutputShape(item?: TelemetryItemDefinition) {
  const value = item?.resultType ?? item?.outputShape ?? "text";
  switch (value) {
    case "records":
      return "registros";
    case "value":
      return "valor";
    case "dataset":
      return "dataset";
    case "number":
      return "numero";
    case "currency":
      return "moeda";
    case "percentage":
      return "percentual";
    default:
      return String(value);
  }
}

function formatConnectionCount(count: number) {
  if (count === 0) return "nenhuma ligada";
  if (count === 1) return "1 origem ligada";
  return `${count.toLocaleString("pt-BR")} origens ligadas`;
}

function resolveReceiveSchemaJson(
  item: TelemetryItemDefinition | undefined,
  binding: WorkspaceNodeBinding | null,
  presentation: WorkspaceNodePresentation | null,
) {
  if (item?.schema) {
    return JSON.stringify(item.schema, null, 2);
  }

  return JSON.stringify(
    {
      type: "object",
      properties: {
        nodeId: { type: "string", example: binding?.entityId ?? "node" },
        source: { type: "string", example: binding?.kind ?? "workspace" },
        signal: { type: "string", example: presentation?.title ?? "workspace_signal" },
        receivedAt: { type: "date-time" },
      },
    },
    null,
    2,
  );
}

function resolveReceiveSampleJson(
  item: TelemetryItemDefinition | undefined,
  binding: WorkspaceNodeBinding | null,
  presentation: WorkspaceNodePresentation | null,
) {
  if (item?.samplePayload) {
    return JSON.stringify(item.samplePayload, null, 2);
  }

  return JSON.stringify(
    {
      nodeId: binding?.entityId ?? "node",
      source: binding?.kind ?? "workspace",
      signal: presentation?.headline ?? presentation?.title ?? "workspace_signal",
      receivedAt: new Date("2026-03-26T12:00:00.000Z").toISOString(),
    },
    null,
    2,
  );
}

function resolveReceiveSnippet(
  snippet: string | undefined,
  binding: WorkspaceNodeBinding | null,
  presentation: WorkspaceNodePresentation | null,
) {
  if (snippet) return snippet;

  return [
    "const payload = {",
    `  nodeId: "${binding?.entityId ?? "node"}",`,
    `  signal: "${presentation?.title ?? "workspace_signal"}",`,
    "  receivedAt: new Date().toISOString(),",
    "};",
    "",
    `await lynx.send("${resolveSyntheticReceiveSlug(binding, presentation)}", payload);`,
  ].join("\n");
}

function resolveGeneratedClientSnippet(
  snippet: string | undefined,
  binding: WorkspaceNodeBinding | null,
  presentation: WorkspaceNodePresentation | null,
) {
  if (snippet) return snippet;
  return `await lynx.nodes["${resolveSyntheticReceiveSlug(binding, presentation)}"].send(payload);`;
}

function resolveSyntheticProgram(
  binding: WorkspaceNodeBinding | null,
  presentation: WorkspaceNodePresentation | null,
  outputPreview: string,
) {
  if (binding?.kind === "plugin") {
    return [
      "// workspace template program",
      `input = workspace["${binding.entityId}"]`,
      `output = input ?? "${outputPreview}"`,
      "return output",
    ].join("\n");
  }

  if (binding?.kind === "agent") {
    return [
      "// agent program",
      "context = signals",
      `output = context.summary ?? "${outputPreview}"`,
      "return output",
    ].join("\n");
  }

  return [
    "// node program",
    "input = payload",
    `output = input ?? "${outputPreview}"`,
    "return output",
  ].join("\n");
}

function resolveSyntheticReceiveState(binding: WorkspaceNodeBinding | null) {
  if (binding?.kind === "agent") return "ativa via sinais do workspace";
  if (binding?.kind === "plugin") return "ativa via runtime do workspace";
  return "ativa";
}

function resolveSyntheticReceiveSlug(
  binding: WorkspaceNodeBinding | null,
  presentation: WorkspaceNodePresentation | null,
) {
  return presentation?.title
    ? presentation.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")
    : binding?.entityId ?? "workspace_node";
}

function resolveSyntheticSendState(binding: WorkspaceNodeBinding | null) {
  if (binding?.kind === "agent") return "ativo";
  if (binding?.kind === "plugin") return "ativo";
  return "ativo";
}

function resolveSyntheticSendTarget(
  binding: WorkspaceNodeBinding | null,
  presentation: WorkspaceNodePresentation | null,
) {
  if (binding?.kind === "agent") return "agent://actions";
  if (binding?.kind === "plugin") return `workspace://${binding.entityId}`;
  return presentation?.title ?? "canvas://next-node";
}

function resolveSyntheticSendPayload(
  binding: WorkspaceNodeBinding | null,
  outputPreview: string,
) {
  if (binding?.kind === "agent") return `signals -> action (${outputPreview})`;
  if (binding?.kind === "plugin") return `workspace signal -> next node (${outputPreview})`;
  return `result -> next node (${outputPreview})`;
}

