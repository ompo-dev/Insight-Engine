import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Bell, Globe, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProjectSettings, useUpdateProjectSettings } from "@/lib/data/hooks";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: settings, isLoading, refetch } = useGetProjectSettings(projectId!, {
    query: { enabled: !!projectId },
  });
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
  const { toast } = useToast();
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

  if (isLoading && !settings) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background shadow-subtle">
          <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                  Workspace config
                </Badge>
                {settings?.environment && (
                  <Badge variant="secondary" className="uppercase tracking-wide">
                    {settings.environment}
                  </Badge>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Configuracoes do projeto</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajuste integracoes, tracking, notificacoes e o bootstrap tecnico do workspace.
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={updateSettings.isPending} className="shadow-lg shadow-primary/20">
              <Sparkles className="mr-2 h-4 w-4" />
              {updateSettings.isPending ? "Salvando..." : "Salvar alteracoes"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="shadow-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Dados base
              </CardTitle>
              <CardDescription>
                Endpoints, localizacao e politicas operacionais que o frontend ja consegue usar hoje.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="website">Website principal</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(event) => setForm((state) => ({ ...state, website: event.target.value }))}
                  placeholder="https://seuapp.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiBaseUrl">API Base URL</Label>
                <Input
                  id="apiBaseUrl"
                  value={form.apiBaseUrl}
                  onChange={(event) => setForm((state) => ({ ...state, apiBaseUrl: event.target.value }))}
                  placeholder="https://api.seuapp.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  value={form.webhookUrl}
                  onChange={(event) => setForm((state) => ({ ...state, webhookUrl: event.target.value }))}
                  placeholder="https://api.seuapp.com/webhooks/lynx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={form.timezone}
                  onChange={(event) => setForm((state) => ({ ...state, timezone: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locale">Locale</Label>
                <Input
                  id="locale"
                  value={form.locale}
                  onChange={(event) => setForm((state) => ({ ...state, locale: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="retentionDays">Retencao de dados (dias)</Label>
                <Input
                  id="retentionDays"
                  type="number"
                  min={30}
                  value={form.retentionDays}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, retentionDays: Number(event.target.value) || 30 }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Tracking e seguranca
              </CardTitle>
              <CardDescription>
                Flags operacionais que vao guiar a futura camada Prisma + Postgres.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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
                  description: "Habilita automacoes e comunicacoes contextuais na jornada.",
                  key: "enableProductEmails" as const,
                },
                {
                  label: "Alertas de erro",
                  description: "Liga alertas operacionais no painel e nos futuros canais externos.",
                  key: "enableErrorAlerts" as const,
                },
              ].map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-4 rounded-xl border p-4">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={form[item.key]}
                    onCheckedChange={(checked) => setForm((state) => ({ ...state, [item.key]: checked }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="shadow-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Checklist operacional
              </CardTitle>
              <CardDescription>
                Itens prontos para a proxima fase com API real, axios e Prisma.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                "Client unificado com fallback mock ja preparado.",
                "Stores Zustand separados por dominio do produto.",
                "Rotas do menu agora mapeadas no app principal.",
                "Tela de settings pronta para virar configuracao persistida no backend.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-lg bg-muted/40 px-4 py-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="text-muted-foreground">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                SDK bootstrap
              </CardTitle>
              <CardDescription>
                Snippet que vamos manter como referencia quando a camada real de ingestao entrar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={form.sdkSnippet}
                onChange={(event) => setForm((state) => ({ ...state, sdkSnippet: event.target.value }))}
                className="min-h-[220px] font-mono text-sm"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Hoje isso serve como base de configuracao do workspace. Depois vamos apontar o client real para Prisma/Postgres.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
