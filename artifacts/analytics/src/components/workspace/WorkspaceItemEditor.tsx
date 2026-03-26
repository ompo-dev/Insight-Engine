import { forwardRef, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monacoEditor from "monaco-editor";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Command, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspaceDataTable } from "@/components/workspace/WorkspaceDataTable";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  buildExpressionSuggestions,
  type TelemetryExpressionSuggestion,
  type TelemetryItemDefinition,
  type TelemetrySystemMetric,
} from "@/lib/telemetry/items";
import type { WorkspaceItemEditorSection } from "@/lib/workspace/types";
import { useCustomItemStore } from "@/store/use-custom-item-store";
import { cn } from "@/lib/utils";

loader.config({ monaco: monacoEditor });

const EXPRESSION_LANGUAGE_ID = "lynx-expression";
const THEME_DARK = "lynx-workspace-dark";
const THEME_LIGHT = "lynx-workspace-light";
const EXAMPLE_FORMULAS = [
  {
    label: "Titulo e badge dinamicos",
    expression: `result = carrinho.total\ntitleNode = "Carrinho " + carrinho.total\nsubTitleNode = "Receita recuperavel agora"\nbadgeNode = "Pico " + carrinho.time.hours\niconNode = icon.sparkles`,
  },
  {
    label: "Comparacao com ontem",
    expression: `result = carrinho.total.hoje\nif (carrinho.total.hoje < carrinho.total.ontem) {\n  subTitleNode = "Vendas cairam " + round(pct(carrinho.total.ontem - carrinho.total.hoje, carrinho.total.ontem), 1) + "%"\n  iconNode = icon.arrowDown\n  badgeNode = "Abaixo de ontem"\n} else {\n  subTitleNode = "Vendas subiram " + round(pct(carrinho.total.hoje - carrinho.total.ontem, carrinho.total.ontem), 1) + "%"\n  iconNode = icon.arrowUp\n  badgeNode = "Acima de ontem"\n}\ntitleNode = "Carrinho " + carrinho.total.hoje`,
  },
  {
    label: "Narrativa executiva",
    expression: `result = "Hoje poderiamos estar em " + (mrr + abandoned_cart_value)\ntitleNode = "MRR potencial"\nsubTitleNode = "Se vendessemos todos os carrinhos"\nbadgeNode = "Executivo"\niconNode = icon.arrowUp`,
  },
 ] as const;
const DISPLAY_OPTIONS: Array<{
  value: NonNullable<TelemetryItemDefinition["presentation"]>;
  label: string;
  description: string;
}> = [
  { value: "stat", label: "Card simples", description: "Numero principal com leitura curta e contexto." },
  { value: "line", label: "Grafico", description: "Serie de tendencia para leitura temporal." },
  { value: "table", label: "Tabela", description: "Linhas operacionais para fila, lista e detalhe." },
  { value: "comparison", label: "Comparacao", description: "Valor principal contra referencia e status." },
  { value: "text", label: "Texto", description: "Narrativa dinamica para explicar o resultado em linguagem natural." },
];
const editorChartConfig = {
  value: {
    label: "Valor",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;
const DISPLAY_PREVIEW_POINTS = [
  { label: "Seg", value: 420 },
  { label: "Ter", value: 560 },
  { label: "Qua", value: 510 },
  { label: "Qui", value: 690 },
  { label: "Sex", value: 740 },
];
let languageRegistered = false;

interface WorkspaceItemEditorProps {
  projectId: string;
  item: TelemetryItemDefinition;
  items: TelemetryItemDefinition[];
  systemMetrics: TelemetrySystemMetric[];
  focusSection?: WorkspaceItemEditorSection | null;
}

export function WorkspaceItemEditor({
  projectId,
  item,
  items,
  systemMetrics,
  focusSection,
}: WorkspaceItemEditorProps) {
  const updateItem = useCustomItemStore((state) => state.updateItem);
  const [schemaJson, setSchemaJson] = useState(JSON.stringify(item.schema ?? {}, null, 2));
  const [sampleJson, setSampleJson] = useState(JSON.stringify(item.samplePayload ?? {}, null, 2));
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);

  const receiveRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef<HTMLDivElement | null>(null);
  const displayRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSchemaJson(JSON.stringify(item.schema ?? {}, null, 2));
    setSampleJson(JSON.stringify(item.samplePayload ?? {}, null, 2));
  }, [item.id, item.samplePayload, item.schema]);

  useEffect(() => {
    const target = focusSection === "receive"
      ? receiveRef.current
      : focusSection === "transform"
        ? transformRef.current
        : focusSection === "display"
          ? displayRef.current
          : focusSection === "action"
            ? actionRef.current
            : null;

    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusSection]);

  const suggestions = useMemo(
    () => buildExpressionSuggestions({ items, systemMetrics, currentItemId: item.id }),
    [item.id, items, systemMetrics],
  );

  const saveJsonField = (kind: "schema" | "sample") => {
    try {
      const parsed = JSON.parse(kind === "schema" ? schemaJson : sampleJson) as Record<string, unknown>;
      if (kind === "schema") {
        updateItem(projectId, item.id, { schema: parsed as unknown as typeof item.schema, status: "healthy" });
        setSchemaError(null);
        return;
      }

      updateItem(projectId, item.id, { samplePayload: parsed, status: "healthy" });
      setSampleError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON invalido.";
      if (kind === "schema") {
        setSchemaError(message);
        return;
      }
      setSampleError(message);
    }
  };

  const snippetBundle = item.receive?.snippets ?? item.snippets;
  const resultText = item.result?.text ?? item.expressionPreview?.text ?? item.label;
  const actionEnabled = item.actionEnabled ?? false;
  const actionLive = item.actionLive ?? false;
  const displayEnabled = item.displayEnabled ?? false;

  return (
    <div className="space-y-4">
      <SectionBlock
        ref={receiveRef}
        title="Receber"
        description="Configure schema, payload de exemplo e snippets plug and play para esse no receber dados da aplicacao do usuario."
        active={focusSection === "receive"}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Label">
            <Input value={item.label} onChange={(event) => updateItem(projectId, item.id, { label: event.target.value })} />
          </Field>
          <Field label="Slug">
            <Input value={item.slug} onChange={(event) => updateItem(projectId, item.id, { slug: event.target.value })} />
          </Field>
        </div>

        <Field label="Descricao">
          <Textarea rows={3} value={item.description ?? ""} onChange={(event) => updateItem(projectId, item.id, { description: event.target.value })} placeholder="Explique o papel do no em uma frase." />
        </Field>

        <Field label="Tags">
          <Input value={item.tags.join(", ")} onChange={(event) => updateItem(projectId, item.id, { tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="ab_test, landing, revenue" />
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Receber payloads via SDK</p>
            <p className="text-xs text-muted-foreground">Ative para transformar o no em destino de ingestao em tempo real.</p>
          </div>
          <Switch checked={item.inputEnabled ?? false} onCheckedChange={(checked) => updateItem(projectId, item.id, { inputEnabled: checked })} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Identity keys">
            <Input value={item.identityKeys.join(", ")} onChange={(event) => updateItem(projectId, item.id, { identityKeys: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} placeholder="id, sessionId" />
          </Field>
          <Field label="Timestamp field">
            <Input value={item.timestampField ?? ""} onChange={(event) => updateItem(projectId, item.id, { timestampField: event.target.value })} placeholder="createdAt" />
          </Field>
        </div>

        <Field label="Schema JSON">
          <Textarea rows={10} value={schemaJson} onChange={(event) => setSchemaJson(event.target.value)} onBlur={() => saveJsonField("schema")} className="font-mono text-xs" />
          {schemaError ? <p className="text-xs text-destructive">{schemaError}</p> : null}
        </Field>

        <Field label="Payload de exemplo">
          <Textarea rows={8} value={sampleJson} onChange={(event) => setSampleJson(event.target.value)} onBlur={() => saveJsonField("sample")} className="font-mono text-xs" />
          {sampleError ? <p className="text-xs text-destructive">{sampleError}</p> : null}
        </Field>

        {snippetBundle ? (
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Send</p>
              <pre className="mt-2 overflow-auto rounded-xl border border-border/70 bg-card p-3 text-xs text-muted-foreground"><code>{snippetBundle.send}</code></pre>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Client gerado</p>
              <pre className="mt-2 overflow-auto rounded-xl border border-border/70 bg-card p-3 text-xs text-muted-foreground"><code>{snippetBundle.generatedClient}</code></pre>
            </div>
          </div>
        ) : null}
      </SectionBlock>

      <SectionBlock
        ref={transformRef}
        title="Transformar"
        description="Combine outros nos, campos e metricas com a linguagem do workspace. O preview responde na hora."
        active={focusSection === "transform"}
      >
        <ExpressionEditor
          value={item.expression ?? ""}
          suggestions={suggestions}
          previewText={resultText}
          previewError={item.expressionPreview?.error ?? null}
          onChange={(nextValue) => updateItem(projectId, item.id, { expression: nextValue })}
        />
      </SectionBlock>

      <SectionBlock
        ref={displayRef}
        title="Mostrar"
        description="Escolha a superficie final desse no no workspace: card, grafico, tabela, comparacao ou texto."
        active={focusSection === "display"}
      >
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Exibir no canvas</p>
            <p className="text-xs text-muted-foreground">Quando ativo, o conteudo define a borda e a leitura visual do no.</p>
          </div>
          <Switch checked={displayEnabled} onCheckedChange={(checked) => updateItem(projectId, item.id, { displayEnabled: checked })} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {DISPLAY_OPTIONS.map((option) => {
            const active = (item.presentation ?? "stat") === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateItem(projectId, item.id, { presentation: option.value, displayEnabled: true })}
                className={cn(
                  "overflow-hidden rounded-[22px] border text-left transition-all",
                  active ? "border-primary/55 bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]" : "border-border/70 bg-card hover:border-primary/30",
                )}
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{option.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    {active ? <Badge variant="outline">ativo</Badge> : null}
                  </div>
                </div>
                <div className="p-3">
                  <DisplayPreviewCard variant={option.value} previewText={resultText} />
                </div>
              </button>
            );
          })}
        </div>
      </SectionBlock>

      <SectionBlock
        ref={actionRef}
        title="Agir"
        description="Dispare webhook, export, integracao ou agente com log de entrega, payload final e toggle live/manual."
        active={focusSection === "action"}
      >
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Habilitar acao</p>
            <p className="text-xs text-muted-foreground">A saida do no pode virar automacao sem sair do workspace.</p>
          </div>
          <Switch checked={actionEnabled} onCheckedChange={(checked) => updateItem(projectId, item.id, { actionEnabled: checked })} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tipo">
            <Select value={item.actionType ?? "webhook"} onValueChange={(value) => updateItem(projectId, item.id, { actionType: value as TelemetryItemDefinition["actionType"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="dataset-export">Export dataset</SelectItem>
                <SelectItem value="integration">Integracao</SelectItem>
                <SelectItem value="ai-trigger">Agent / IA</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Metodo">
            <Select value={item.actionMethod ?? "POST"} onValueChange={(value) => updateItem(projectId, item.id, { actionMethod: value as TelemetryItemDefinition["actionMethod"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Target">
          <Input value={item.actionTarget ?? ""} onChange={(event) => updateItem(projectId, item.id, { actionTarget: event.target.value })} placeholder="https://api.seuapp.com/hooks/lynx" />
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Live mode</p>
            <p className="text-xs text-muted-foreground">Se ativo, cada run bem-sucedido tenta entregar a acao automaticamente.</p>
          </div>
          <Switch checked={actionLive} onCheckedChange={(checked) => updateItem(projectId, item.id, { actionLive: checked })} />
        </div>

        <Field label="Payload expression">
          <Textarea rows={4} value={item.actionPayloadExpression ?? "result"} onChange={(event) => updateItem(projectId, item.id, { actionPayloadExpression: event.target.value })} className="font-mono text-xs" placeholder="result" />
        </Field>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ultimo run</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{item.lastRun ? `${item.lastRun.status} em ${item.lastRun.latencyMs}ms` : "Sem execucao"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.lastRun ? item.lastRun.origin.join(", ") || "manual" : "O runtime encadeado aparece aqui."}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ultima entrega</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{item.lastDelivery ? item.lastDelivery.status : "Sem entrega"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.lastDelivery ? `${item.lastDelivery.method} ${item.lastDelivery.target}` : "Ative uma acao para registrar entregas."}</p>
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}
export function ExpressionEditor({
  value,
  onChange,
  suggestions,
  previewText,
  previewError,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: TelemetryExpressionSuggestion[];
  previewText: string;
  previewError: string | null;
}) {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const completionProviderRef = useRef<monacoEditor.IDisposable | null>(null);
  const suggestionsRef = useRef<TelemetryExpressionSuggestion[]>(suggestions);
  const valueRef = useRef(value);
  const [activeCategory, setActiveCategory] = useState<"all" | TelemetryExpressionSuggestion["category"]>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  suggestionsRef.current = suggestions;
  valueRef.current = value;

  useEffect(() => () => completionProviderRef.current?.dispose(), []);

  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return suggestions.filter((suggestion) => {
      if (activeCategory !== "all" && suggestion.category !== activeCategory) return false;
      if (!normalizedQuery) return true;
      return (
        suggestion.value.toLowerCase().includes(normalizedQuery) ||
        suggestion.label.toLowerCase().includes(normalizedQuery) ||
        suggestion.description.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [activeCategory, deferredQuery, suggestions]);

  const groupedSuggestions = useMemo(() => ({
    item: filteredSuggestions.filter((suggestion) => suggestion.category === "item"),
    field: filteredSuggestions.filter((suggestion) => suggestion.category === "field"),
    system: filteredSuggestions.filter((suggestion) => suggestion.category === "system"),
  }), [filteredSuggestions]);

  const totalByCategory = useMemo(
    () => ({
      all: suggestions.length,
      item: suggestions.filter((suggestion) => suggestion.category === "item").length,
      field: suggestions.filter((suggestion) => suggestion.category === "field").length,
      system: suggestions.filter((suggestion) => suggestion.category === "system").length,
    }),
    [suggestions],
  );

  const insertSuggestion = useCallback((insertText: string) => {
    const editor = editorRef.current;
    if (!editor) {
      onChange(valueRef.current ? `${valueRef.current} ${insertText}` : insertText);
      return;
    }

    const selection = editor.getSelection();
    if (!selection) return;

    editor.executeEdits("lynx-suggestion", [{ range: selection, text: insertText, forceMoveMarkers: true }]);
    editor.focus();
  }, [onChange]);

  const replaceWithExample = useCallback((expression: string) => {
    const editor = editorRef.current;
    if (!editor) {
      onChange(expression);
      return;
    }

    editor.setValue(expression);
    editor.focus();
  }, [onChange]);

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    ensureExpressionLanguage(monacoInstance);

    completionProviderRef.current?.dispose();
    completionProviderRef.current = monacoInstance.languages.registerCompletionItemProvider(EXPRESSION_LANGUAGE_ID, {
      triggerCharacters: [".", "_", "(", ",", " "],
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = new monacoInstance.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
        const beforeCursor = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        const token = beforeCursor.match(/[A-Za-z_][A-Za-z0-9_.]*$/)?.[0]?.toLowerCase() ?? "";
        const matches = suggestionsRef.current
          .filter((suggestion) => !token || suggestion.value.toLowerCase().includes(token) || suggestion.label.toLowerCase().includes(token))
          .slice(0, 25);

        return {
          suggestions: matches.map((suggestion, index) => ({
            label: suggestion.value,
            kind: getCompletionKind(monacoInstance, suggestion.category),
            insertText: suggestion.value,
            detail: suggestion.label,
            documentation: suggestion.description,
            range,
            sortText: index.toString().padStart(2, "0"),
          })),
        };
      },
    });

    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Space, () => {
      editor.trigger("keyboard", "editor.action.triggerSuggest", {});
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[26px] border border-border/70 bg-card shadow-[0_16px_40px_hsl(var(--foreground)/0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/55 px-4 py-3">
          <div className="text-xs text-muted-foreground">Ctrl/Cmd + Space para autocomplete</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl px-3"
              onClick={() => editorRef.current?.trigger("manual", "editor.action.triggerSuggest", {})}
            >
              <Command className="h-3.5 w-3.5" />
              Autocomplete
            </Button>
          </div>
        </div>

        <WorkspaceCodeEditor
          height={360}
          language={EXPRESSION_LANGUAGE_ID}
          value={value}
          onChange={onChange}
          onMount={handleEditorMount}
          options={{
            quickSuggestions: { other: true, strings: true, comments: false },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "smart",
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>

      <div className="space-y-4">
        <div className="rounded-[26px] border border-border/70 bg-card/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Preview da formula</p>
              <p className="mt-1 text-xs text-muted-foreground">O resultado acompanha a expressao atual do no.</p>
            </div>
            <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
          </div>
          <div className="mt-4 rounded-[20px] border border-border/70 bg-background/55 p-4">
            <p className="text-2xl font-semibold tracking-tight text-foreground">{previewText}</p>
            {previewError ? <p className="mt-2 text-xs text-destructive">{previewError}</p> : null}
          </div>
        </div>

        <div className="rounded-[26px] border border-border/70 bg-card/70 p-4">
          <p className="text-sm font-semibold text-foreground">Exemplos rapidos</p>          <div className="mt-3 space-y-2">
            {EXAMPLE_FORMULAS.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => replaceWithExample(example.expression)}
                className="w-full rounded-2xl border border-border/70 bg-background/45 px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-card"
              >
                <p className="text-sm font-medium text-foreground">{example.label}</p>
                <p className="mt-1 line-clamp-2 font-mono text-[11px] text-muted-foreground">{example.expression}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-border/70 bg-card/70">
        <div className="border-b border-border/70 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Referencias</p>
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
              {filteredSuggestions.length} resultados
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {([
              ["all", "Tudo"],
              ["item", "Nos"],
              ["field", "Campos"],
              ["system", "Sistema"],
            ] as const).map(([nextValue, label]) => (
              <button
                key={nextValue}
                type="button"
                onClick={() => setActiveCategory(nextValue)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeCategory === nextValue
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/70 bg-background/45 text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{label}</span>
                <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px]">
                  {totalByCategory[nextValue]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nos, campos ou metricas..."
              className="h-10 rounded-2xl pl-9"
            />
          </div>
        </div>

        <ScrollArea className="h-[320px]">
          <div className="space-y-5 p-4">
            <ReferenceGroup title="Nos" suggestions={groupedSuggestions.item} onInsert={insertSuggestion} />
            <ReferenceGroup title="Campos" suggestions={groupedSuggestions.field} onInsert={insertSuggestion} />
            <ReferenceGroup title="Sistema" suggestions={groupedSuggestions.system} onInsert={insertSuggestion} compact />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export function WorkspaceCodeEditor({
  value,
  onChange,
  onBlur,
  onMount,
  language = "json",
  height = 320,
  readOnly = false,
  className,
  options,
}: {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onMount?: OnMount;
  language?: string;
  height?: number | string;
  readOnly?: boolean;
  className?: string;
  options?: monacoEditor.editor.IStandaloneEditorConstructionOptions;
}) {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const blurListenerRef = useRef<monacoEditor.IDisposable | null>(null);
  const appearance = useEditorAppearance();

  useEffect(() => () => blurListenerRef.current?.dispose(), []);

  const handleMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    ensureExpressionLanguage(monacoInstance);
    monacoInstance.editor.setTheme(appearance === "dark" ? THEME_DARK : THEME_LIGHT);

    blurListenerRef.current?.dispose();
    if (onBlur) {
      blurListenerRef.current = editor.onDidBlurEditorText(() => onBlur());
    }

    onMount?.(editor, monacoInstance);
  };

  useEffect(() => {
    if (!editorRef.current) return;
    monacoEditor.editor.setTheme(appearance === "dark" ? THEME_DARK : THEME_LIGHT);
  }, [appearance]);

  return (
    <div className={className}>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(nextValue) => onChange?.(nextValue ?? "")}
        onMount={handleMount}
        theme={appearance === "dark" ? THEME_DARK : THEME_LIGHT}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: false,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          insertSpaces: true,
          quickSuggestions: readOnly ? false : { other: true, strings: true, comments: false },
          suggestOnTriggerCharacters: !readOnly,
          acceptSuggestionOnEnter: "smart",
          padding: { top: 16, bottom: 16 },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          renderLineHighlight: "gutter",
          roundedSelection: true,
          bracketPairColorization: { enabled: true },
          guides: { indentation: false },
          readOnly,
          ...options,
        }}
      />
    </div>
  );
}

function DisplayPreviewCard({
  variant,
  previewText,
}: {
  variant: NonNullable<TelemetryItemDefinition["presentation"]>;
  previewText: string;
}) {
  if (variant === "line") {
    return (
      <Card className="border-border/70 shadow-none">
        <CardHeader className="space-y-1 pb-0">
          <CardTitle className="text-sm">Serie de receita</CardTitle>
          <CardDescription className="text-xs">Leitura temporal no canvas</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <ChartContainer config={editorChartConfig} className="h-[140px] w-full">
            <AreaChart data={DISPLAY_PREVIEW_POINTS} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="displayPreviewArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Area type="monotone" dataKey="value" stroke="var(--color-value)" fill="url(#displayPreviewArea)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  if (variant === "table") {
    return (
      <WorkspaceDataTable
        columns={["Carrinho", "Total", "Status", "Target", "Limit", "Reviewer"]}
        rows={[
          ["cart_214", "R$ 490", "Done", "490", "30m", "Assign reviewer"],
          ["cart_891", "R$ 260", "In Progress", "260", "18m", "Assign reviewer"],
          ["cart_317", "R$ 610", "Done", "610", "42m", "Eddie Lake"],
        ]}
        fitContent
        className="h-auto w-max min-w-[1260px]"
      />
    );
  }

  if (variant === "text") {
    return (
      <Card className="border-border/70 shadow-none">
        <CardHeader className="space-y-1 pb-0">
          <CardTitle className="text-sm">Narrativa do no</CardTitle>
          <CardDescription className="text-xs">Resumo dinamico em linguagem natural</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
            <p className="text-sm font-semibold text-foreground">{previewText}</p>
            <p className="mt-2 text-xs text-muted-foreground">Use esse modo para explicar resultado, insight ou decisao direto no canvas.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "comparison") {
    return (
      <Card className="border-border/70 shadow-none">
        <CardHeader className="space-y-1 pb-0">
          <CardTitle className="text-sm">MRR potencial</CardTitle>
          <CardDescription className="text-xs">Comparacao direta no canvas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Atual</p>
              <p className="mt-1 text-lg font-semibold text-foreground">R$ 3.2k</p>
            </div>
            <Badge variant="outline">+18%</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border/70 bg-background/55 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Carrinhos</p>
              <p className="mt-1 text-xs font-semibold text-foreground">R$ 860</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/55 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Projetado</p>
              <p className="mt-1 text-xs font-semibold text-foreground">R$ 4.0k</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader>
        <CardDescription>Resumo principal do no</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{previewText}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/55 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-foreground">Crescimento mensal</p>
            <p className="text-xs text-muted-foreground">Ultimos 30 dias</p>
          </div>
          <Badge variant="outline">+12.5%</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
function ReferenceGroup({
  title,
  suggestions,
  onInsert,
  compact = false,
}: {
  title: string;
  suggestions: TelemetryExpressionSuggestion[];
  onInsert: (value: string) => void;
  compact?: boolean;
}) {
  if (!suggestions.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Badge variant="outline">{suggestions.length}</Badge>
      </div>
      <div className="space-y-2">
        {suggestions.slice(0, compact ? 10 : 14).map((suggestion) => (
          <button
            key={`${title}:${suggestion.value}`}
            type="button"
            onClick={() => onInsert(suggestion.value)}
            className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/45 px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-card"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[12px] text-foreground">{suggestion.value}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{suggestion.description}</p>
            </div>
            <span className="rounded-full border border-border/70 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              inserir
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ensureExpressionLanguage(monacoInstance: typeof monacoEditor) {
  if (languageRegistered) return;

  monacoInstance.languages.register({ id: EXPRESSION_LANGUAGE_ID });
  monacoInstance.languages.setLanguageConfiguration(EXPRESSION_LANGUAGE_ID, {
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

  monacoInstance.languages.setMonarchTokensProvider(EXPRESSION_LANGUAGE_ID, {
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\b(true|false|null|undefined)\b/, "keyword"],
        [/\b(if|else|const|let|var|return)\b/, "keyword"],
        [/\b(titleNode|subTitleNode|badgeNode|iconNode|result|output)\b/, "type.identifier"],
        [/[A-Za-z_][\w.]*/, "identifier"],
        [/\d+(\.\d+)?/, "number"],
        [/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/, "string"],
        [/[+\-*/%=<>!]+/, "operator"],
        [/[()\[\]{},]/, "delimiter"],
      ],
    },
  });

  monacoInstance.editor.defineTheme(THEME_DARK, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "64748B" },
      { token: "identifier", foreground: "E5E7EB" },
      { token: "type.identifier", foreground: "FDE68A" },
      { token: "number", foreground: "7DD3FC" },
      { token: "string", foreground: "86EFAC" },
      { token: "operator", foreground: "F9A8D4" },
      { token: "keyword", foreground: "C4B5FD" },
      { token: "delimiter", foreground: "94A3B8" },
    ],
    colors: {
      "editor.background": "#111318",
      "editor.lineHighlightBackground": "#171A20",
      "editorLineNumber.foreground": "#5B6472",
      "editorLineNumber.activeForeground": "#CBD5E1",
      "editorCursor.foreground": "#F8FAFC",
      "editor.selectionBackground": "#22304A",
      "editor.inactiveSelectionBackground": "#1B2434",
      "editorSuggestWidget.background": "#111318",
      "editorSuggestWidget.border": "#2A3140",
    },
  });

  monacoInstance.editor.defineTheme(THEME_LIGHT, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "94A3B8" },
      { token: "identifier", foreground: "1F2937" },
      { token: "type.identifier", foreground: "B45309" },
      { token: "number", foreground: "0369A1" },
      { token: "string", foreground: "15803D" },
      { token: "operator", foreground: "BE185D" },
      { token: "keyword", foreground: "7C3AED" },
      { token: "delimiter", foreground: "64748B" },
    ],
    colors: {
      "editor.background": "#FFFFFF",
      "editor.lineHighlightBackground": "#F8FAFC",
      "editorLineNumber.foreground": "#94A3B8",
      "editorLineNumber.activeForeground": "#334155",
      "editorCursor.foreground": "#0F172A",
      "editor.selectionBackground": "#DBEAFE",
      "editor.inactiveSelectionBackground": "#E2E8F0",
      "editorSuggestWidget.background": "#FFFFFF",
      "editorSuggestWidget.border": "#CBD5E1",
    },
  });

  languageRegistered = true;
}

function useEditorAppearance() {
  const [appearance, setAppearance] = useState<"dark" | "light">(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  useEffect(() => {
    const root = document.documentElement;
    const syncAppearance = () => setAppearance(root.classList.contains("dark") ? "dark" : "light");
    syncAppearance();

    const observer = new MutationObserver(syncAppearance);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return appearance;
}

function getCompletionKind(
  monacoInstance: typeof monacoEditor,
  category: TelemetryExpressionSuggestion["category"],
) {
  if (category === "field") return monacoInstance.languages.CompletionItemKind.Field;
  if (category === "system") return monacoInstance.languages.CompletionItemKind.Constant;
  return monacoInstance.languages.CompletionItemKind.Variable;
}

const SectionBlock = forwardRef<HTMLDivElement, { title: string; description: string; active?: boolean; children: ReactNode }>(
  ({ title, description, active = false, children }, ref) => (
    <div
      ref={ref}
      className={cn(
        "space-y-4 rounded-[24px] border border-border/70 bg-card/70 p-4 transition-shadow",
        active && "shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]",
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  ),
);
SectionBlock.displayName = "SectionBlock";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
















