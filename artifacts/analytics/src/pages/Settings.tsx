import { useEffect, useMemo, useState } from "react";
import { useParams, useSearch } from "wouter";
import { Bell, Bot, Globe, KeyRound, ShieldCheck, Sparkles, Users, Workflow } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AssembleGroup, LoadingCardStack } from "@/components/ui/assemble";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useGetProjectSettings, useUpdateProjectSettings } from "@/lib/data/hooks";
import { useToast } from "@/hooks/use-toast";
import {
  specialistAgentDefinitions,
  teamPersonaDefinitions,
  teamPersonaMap,
} from "@/lib/personas/team-personas";
import { useProjectStore } from "@/store/use-project-store";
import { useWorkspaceStore } from "@/store/use-workspace-store";

export default function Settings() {
  const { projectId } = useParams<{ projectId: string }>();
  const search = useSearch();
  const { data: settings, isLoading, refetch } = useGetProjectSettings(projectId!, {
    query: { enabled: !!projectId },
  });
  const { toast } = useToast();
  const updateSettings = useUpdateProjectSettings({
    mutation: {
      onSuccess: () => {
        toast({ title: "Configuracoes salvas com sucesso" });
        void refetch();
      },
      onError: () => {
        toast({ title: "Nao foi possivel salvar as configuracoes", variant: "destructive" });
      },
    },
  });

  const teamPersonaByProject = useProjectStore((state) => state.teamPersonaByProject);
  const defaultTeamPersonaId = useProjectStore((state) => state.defaultTeamPersonaId);
  const setProjectTeamPersona = useProjectStore((state) => state.setProjectTeamPersona);
  const restoreRolePreset = useWorkspaceStore((state) => state.restoreRolePreset);
  const personaScopeId = projectId ?? "";
  const activePersonaId =
    (personaScopeId ? teamPersonaByProject[personaScopeId] : undefined) ?? defaultTeamPersonaId;
  const activePersona = teamPersonaMap[activePersonaId];
  const requestedTab = useMemo(() => {
    const tab = new URLSearchParams(search).get("tab");
    return tab === "tracking" || tab === "team" || tab === "sdk" ? tab : "workspace";
  }, [search]);
  const [activeTab, setActiveTab] = useState<"workspace" | "tracking" | "team" | "sdk">(requestedTab);
  const roleAgents = useMemo(
    () => specialistAgentDefinitions.filter((agent) => agent.ownerRole === activePersonaId),
    [activePersonaId],
  );

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  const [form, setForm] = useState({
    website: "",
    apiBaseUrl: "",
    webhookUrl: "",
    timezone: "America/Sao_Paulo",
    locale: "pt-BR",
    retentionDays: 90,
    enableAnonymizedTracking: true,
    enableSessionReplay: false,
    enableProductEmails: false,
    enableErrorAlerts: true,
    sdkSnippet: "",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      website: settings.website,
      apiBaseUrl: settings.apiBaseUrl,
      webhookUrl: settings.webhookUrl,
      timezone: settings.timezone,
      locale: settings.locale,
      retentionDays: settings.retentionDays,
      enableAnonymizedTracking: settings.enableAnonymizedTracking,
      enableSessionReplay: settings.enableSessionReplay,
      enableProductEmails: settings.enableProductEmails,
      enableErrorAlerts: settings.enableErrorAlerts,
      sdkSnippet: settings.sdkSnippet,
    });
  }, [settings]);

  const handleSave = async () => {
    if (!projectId) return;
    await updateSettings.mutateAsync({ projectId, data: form });
  };

  const handlePersonaChange = (personaId: (typeof teamPersonaDefinitions)[number]["id"]) => {
    if (!personaScopeId) return;
    setProjectTeamPersona(personaScopeId, personaId);
    toast({
      title: `Leitura de ${teamPersonaMap[personaId].label} ativada`,
      description: "O workspace e o inspector passam a priorizar essa equipe.",
    });
  };

  const handleApplyPersonaPreset = () => {
    if (!projectId) return;
    restoreRolePreset(projectId, activePersonaId);
    toast({
      title: "Preset do cargo aplicado",
      description: "Mapa do projeto e camada de flows foram restaurados para esse perfil.",
    });
  };

  if (isLoading && !settings) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <LoadingCardStack
            count={1}
            renderCard={() => (
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-6">
                <div className="h-8 w-60 rounded-xl bg-white/10" />
                <div className="mt-3 h-4 w-[28rem] max-w-full rounded-full bg-white/5" />
              </div>
            )}
          />
          <LoadingCardStack
            count={2}
            className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]"
            renderCard={() => (
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-6">
                <div className="h-5 w-40 rounded-full bg-white/10" />
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="h-11 rounded-xl bg-white/10" />
                  <div className="h-11 rounded-xl bg-white/10" />
                  <div className="h-11 rounded-xl bg-white/10" />
                  <div className="h-11 rounded-xl bg-white/10" />
                </div>
              </div>
            )}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card className="border-white/8 bg-transparent shadow-none">
          <CardContent className="flex flex-col gap-4 p-0 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-300">
                  Workspace config
                </Badge>
                {settings?.environment ? (
                  <Badge variant="outline" className="border-white/10 bg-white/[0.04] uppercase tracking-wide text-slate-300">
                    {settings.environment}
                  </Badge>
                ) : null}
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Configuracoes do workspace</h1>
                <p className="mt-1 max-w-3xl text-sm text-slate-400">
                  Defina ingestao, leitura por equipe e o bootstrap do canvas com o minimo de friccao para o time entrar operando.
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full md:w-auto">
              <Sparkles className="mr-2 h-4 w-4" />
              {updateSettings.isPending ? "Salvando..." : "Salvar alteracoes"}
            </Button>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto border border-white/8 bg-white/[0.03]">
            <TabsTrigger value="workspace">Dados base</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="team">Equipe e IA</TabsTrigger>
            <TabsTrigger value="sdk">SDK</TabsTrigger>
          </TabsList>

          <TabsContent value="workspace">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-white/8 bg-[#111722] shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Globe className="h-5 w-5 text-primary" />
                    Dados base
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Endpoints, localizacao e politicas operacionais que o frontend ja usa hoje.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-2">
                  <Field label="Website principal" id="website" value={form.website} onChange={(value) => setForm((state) => ({ ...state, website: value }))} placeholder="https://seuapp.com" className="md:col-span-2" />
                  <Field label="API Base URL" id="apiBaseUrl" value={form.apiBaseUrl} onChange={(value) => setForm((state) => ({ ...state, apiBaseUrl: value }))} placeholder="https://api.seuapp.com" />
                  <Field label="Webhook URL" id="webhookUrl" value={form.webhookUrl} onChange={(value) => setForm((state) => ({ ...state, webhookUrl: value }))} placeholder="https://api.seuapp.com/webhooks/lynx" />
                  <Field label="Timezone" id="timezone" value={form.timezone} onChange={(value) => setForm((state) => ({ ...state, timezone: value }))} />
                  <Field label="Locale" id="locale" value={form.locale} onChange={(value) => setForm((state) => ({ ...state, locale: value }))} />
                  <Field label="Retencao de dados (dias)" id="retentionDays" type="number" value={String(form.retentionDays)} onChange={(value) => setForm((state) => ({ ...state, retentionDays: Number(value) || 30 }))} className="md:col-span-2" />
                </CardContent>
              </Card>

              <Card className="border-white/8 bg-[#111722] shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Bell className="h-5 w-5 text-primary" />
                    Checklist da stack atual
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Estado real da interface enquanto a camada Prisma/Postgres ainda nao entrou.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AssembleGroup className="space-y-3 text-sm">
                    {[
                      "Workspace-first com canvas, inspector e catalogo curado.",
                      "Leitura por cargo persistida por projeto.",
                      "Plugins adaptados sobre a camada mock atual.",
                      "Bootstrap pronto para migrar o client para backend real depois.",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                        <p className="text-slate-400">{item}</p>
                      </div>
                    ))}
                  </AssembleGroup>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tracking">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
              <Card className="border-white/8 bg-[#111722] shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Tracking e seguranca
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Flags operacionais que vao orientar ingestao, alertas e persistencia real.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AssembleGroup className="space-y-5">
                    {[
                      {
                        label: "Tracking anonimizado",
                        description: "Remove identificadores sensiveis por padrao nos eventos.",
                        key: "enableAnonymizedTracking" as const,
                      },
                      {
                        label: "Session replay",
                        description: "Mantem a UX pronta para replay quando o backend real entrar.",
                        key: "enableSessionReplay" as const,
                      },
                      {
                        label: "Emails de produto",
                        description: "Habilita comunicacoes e automacoes contextuais na jornada.",
                        key: "enableProductEmails" as const,
                      },
                      {
                        label: "Alertas de erro",
                        description: "Liga alertas operacionais no painel e nos futuros canais externos.",
                        key: "enableErrorAlerts" as const,
                      },
                    ].map((item) => (
                      <div key={item.key} className="flex flex-col gap-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="font-medium text-white">{item.label}</p>
                          <p className="text-sm text-slate-400">{item.description}</p>
                        </div>
                        <Switch
                          checked={form[item.key]}
                          onCheckedChange={(checked) => setForm((state) => ({ ...state, [item.key]: checked }))}
                        />
                      </div>
                    ))}
                  </AssembleGroup>
                </CardContent>
              </Card>

              <Card className="border-white/8 bg-[#111722] shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Leitura rapida
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Baseline tecnico atual do projeto para a proxima etapa da stack.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AssembleGroup className="grid gap-3">
                    <QuickInfo label="Tracking" value={form.enableAnonymizedTracking ? "Anonimizado" : "Identificado"} />
                    <QuickInfo label="Replay" value={form.enableSessionReplay ? "Pronto para ativar" : "Desligado"} />
                    <QuickInfo label="Emails" value={form.enableProductEmails ? "Operando" : "Nao habilitado"} />
                    <QuickInfo label="Alertas" value={form.enableErrorAlerts ? "Ativos" : "Silenciados"} />
                  </AssembleGroup>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.95fr]">
              <Card className="border-white/8 bg-[#111722] shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Users className="h-5 w-5 text-primary" />
                    Leitura por cargo
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    O mesmo dado muda de narrativa, prioridade e acao sugerida conforme a equipe ativa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-300">
                      Persona ativa
                    </Badge>
                    <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-300">
                      {activePersona.label}
                    </Badge>
                  </div>

                  <div className="grid gap-3">
                    {teamPersonaDefinitions.map((persona) => (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => handlePersonaChange(persona.id)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          persona.id === activePersonaId
                            ? "border-primary/40 bg-primary/[0.06]"
                            : "border-white/8 bg-white/[0.03] hover:border-white/12"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-white">{persona.label}</p>
                            <p className="mt-1 text-sm text-slate-400">{persona.summary}</p>
                          </div>
                          <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-300">
                            {persona.shortLabel}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Como essa equipe interpreta o produto</p>
                    <p className="mt-3 text-sm text-slate-400">{activePersona.interpretation}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activePersona.primaryMetrics.map((metric) => (
                        <Badge key={metric} variant="outline" className="border-white/10 bg-white/[0.04] text-slate-300">
                          {metric}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="outline" className="mt-4 gap-2 border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]" onClick={handleApplyPersonaPreset}>
                      <Workflow className="h-4 w-4" />
                      Restaurar preset do workspace
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-white/8 bg-[#111722] shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Users className="h-5 w-5 text-primary" />
                      Frame de decisao
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Essa camada muda destaque, linguagem e impacto mostrado no workspace.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AssembleGroup className="space-y-3">
                      {activePersona.decisionFrame.map((item) => (
                        <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                          {item}
                        </div>
                      ))}
                    </AssembleGroup>
                  </CardContent>
                </Card>

                <Card className="border-white/8 bg-[#111722] shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Bot className="h-5 w-5 text-primary" />
                      Agentes IA especialistas
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Estrutura para times hibridos, com agentes atuando junto de humanos ou de forma autonoma.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AssembleGroup className="space-y-3">
                      {roleAgents.map((agent) => (
                        <div key={agent.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">{agent.name}</p>
                              <p className="mt-1 text-sm text-slate-400">{agent.summary}</p>
                            </div>
                            <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-300">
                              {agent.mode}
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {agent.scopes.map((scope) => (
                              <Badge key={scope} variant="outline" className="border-white/10 bg-white/[0.04] text-slate-300">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </AssembleGroup>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sdk">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <Card className="border-white/8 bg-[#111722] shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <KeyRound className="h-5 w-5 text-primary" />
                    Fluxo recomendado
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Setup direto para quem vai instalar a SDK ou mandar dados manualmente.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AssembleGroup className="space-y-3 text-sm">
                    {[
                      "Criar a primeira colecao ou usar um template de sistema.",
                      "Copiar o snippet de Bun/Node ou Browser/React para o codigo do produto.",
                      "Validar payloads com schema estrito antes de publicar metricas e views.",
                      "Voltar ao canvas e ligar colecao, metrica e view no mesmo fluxo.",
                    ].map((item) => (
                      <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-slate-400">
                        {item}
                      </div>
                    ))}
                  </AssembleGroup>
                </CardContent>
              </Card>

              <Card className="border-white/8 bg-[#111722] shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <KeyRound className="h-5 w-5 text-primary" />
                    SDK bootstrap
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Snippet-base para o time plugar a ingestao sem precisar deduzir o contrato.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={form.sdkSnippet}
                    onChange={(event) => setForm((state) => ({ ...state, sdkSnippet: event.target.value }))}
                    className="min-h-[240px] border-white/10 bg-white/[0.03] font-mono text-sm text-slate-100 sm:min-h-[320px]"
                    spellCheck={false}
                  />
                  <p className="text-xs text-slate-500">
                    Use este campo como bootstrap do projeto. O proximo passo operacional e criar colecoes e publicar a primeira view no canvas.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="border-white/10 bg-white/[0.03] text-slate-100 placeholder:text-slate-500"
      />
    </div>
  );
}

function QuickInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}
