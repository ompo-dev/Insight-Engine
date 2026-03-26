import { useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, BarChart3, Check, Copy, Plus, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { useCreateProject, useListProjects } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { AssembleGroup, LoadingCardStack } from "@/components/ui/assemble";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatNumber } from "@/lib/utils";

type ProjectSetupMode = "sdk" | "manual" | "workspace";

function getNextRoute(projectId: string, setupMode: ProjectSetupMode) {
  if (setupMode === "sdk") return `/projects/${projectId}/settings?tab=sdk`;
  if (setupMode === "manual") return `/projects/${projectId}/settings?tab=tracking`;
  return `/projects/${projectId}/workspace`;
}

export default function Projects() {
  const [, setLocation] = useLocation();
  const { data: projects, isLoading, refetch } = useListProjects();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [setupMode, setSetupMode] = useState<ProjectSetupMode>("sdk");

  const { mutate: createProject, isPending } = useCreateProject({
    mutation: {
      onSuccess: (project) => {
        setIsCreateOpen(false);
        setName("");
        setDescription("");
        setWebsite("");
        setSetupMode("sdk");
        void refetch();
        setLocation(getNextRoute(project.id, setupMode));
      },
    },
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createProject({ data: { name, description, website: website || undefined } });
  };

  const copyToClipboard = (event: MouseEvent, text: string, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const quickStartItems = [
    {
      title: "Crie o projeto",
      description: "Defina nome, website e a rota inicial de setup sem passar por telas vagas.",
      icon: <Plus className="h-4 w-4" />,
    },
    {
      title: "Conecte o codigo",
      description: "Instale a SDK ou configure ingestao manual com schema e snippets prontos.",
      icon: <Wrench className="h-4 w-4" />,
    },
    {
      title: "Publique no canvas",
      description: "Monte metricas, modelos e correlacoes no mesmo workspace de dados.",
      icon: <Sparkles className="h-4 w-4" />,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Workspace library</Badge>
              <Badge variant="outline">Micro-SaaS ready</Badge>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl" data-animate-text>
                Projetos e onboarding
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Crie o projeto, conecte a ingestao e entre no canvas sem perder tempo com configuracao espalhada.
              </p>
            </div>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Novo projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Criar projeto</DialogTitle>
                  <DialogDescription>
                    O primeiro passo ja define para onde voce vai depois: SDK, tracking manual ou canvas.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do projeto</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Atlas CRM"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website principal</Label>
                    <Input
                      id="website"
                      placeholder="https://atlascrm.com"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Descricao</Label>
                    <Input
                      id="desc"
                      placeholder="CRM de receita para times B2B"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Proximo passo</Label>
                    <Select value={setupMode} onValueChange={(value) => setSetupMode(value as ProjectSetupMode)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sdk">Abrir setup da SDK</SelectItem>
                        <SelectItem value="manual">Abrir tracking manual</SelectItem>
                        <SelectItem value="workspace">Ir direto para o canvas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending || !name} className="w-full sm:w-auto">
                    {isPending ? "Criando..." : "Criar e continuar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {quickStartItems.map((item) => (
            <Card key={item.title} className="border-border/70 bg-card/60 shadow-none">
              <CardContent className="flex items-start gap-3 p-5">
                <div className="mt-0.5 rounded-2xl border border-border/70 bg-background/60 p-2.5 text-primary">{item.icon}</div>
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <LoadingCardStack
            count={3}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
            renderCard={(index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <Skeleton className="mb-2 h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="mb-4 h-10 w-full rounded-md" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </CardContent>
              </Card>
            )}
          />
        ) : !projects?.length ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card/50 px-6 py-16 text-center">
            <img
              src={`${import.meta.env.BASE_URL}images/empty-dashboard.png`}
              alt="Nenhum projeto"
              className="mb-6 w-full max-w-64 opacity-80"
            />
            <h2 className="text-2xl font-bold text-foreground">Crie seu primeiro projeto</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              O fluxo recomendado e criar o projeto, abrir o setup da SDK e publicar a primeira view no canvas.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} size="lg" className="mt-6 w-full sm:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              Criar projeto
            </Button>
          </div>
        ) : (
          <AssembleGroup className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const nextStepLabel = project.eventCount > 0 ? "Abrir canvas" : "Instalar SDK";
              const nextStepHref = project.eventCount > 0
                ? `/projects/${project.id}/workspace`
                : `/projects/${project.id}/settings?tab=sdk`;

              return (
                <Link key={project.id} href={`/projects/${project.id}/workspace`}>
                  <Card className="group flex h-full cursor-pointer flex-col border-border/70 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-xl transition-colors group-hover:text-primary">
                            {project.name}
                          </CardTitle>
                          <CardDescription className="mt-1 truncate">{project.slug}</CardDescription>
                        </div>
                        <Badge variant="outline">{project.eventCount > 0 ? "ativo" : "setup"}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col gap-5">
                      <div>
                        <Label className="mb-1.5 block text-xs text-muted-foreground">API key</Label>
                        <div
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 p-2.5"
                          onClick={(event) => copyToClipboard(event, project.apiKey, project.id)}
                        >
                          <code className="truncate font-mono text-xs text-foreground/80">
                            {project.apiKey.substring(0, 18)}...
                          </code>
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                          >
                            {copiedId === project.id ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <ProjectMetric
                          icon={<TrendingUp className="h-3.5 w-3.5" />}
                          label="MRR"
                          value={formatMoney(project.mrr || 0)}
                        />
                        <ProjectMetric
                          icon={<BarChart3 className="h-3.5 w-3.5" />}
                          label="Eventos"
                          value={formatNumber(project.eventCount || 0)}
                        />
                      </div>

                      <div className="mt-auto rounded-2xl border border-border/70 bg-background/50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Proximo passo</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{nextStepLabel}</p>
                          </div>
                          <Link href={nextStepHref}>
                            <Button variant="outline" size="sm" className="rounded-xl" onClick={(event) => event.stopPropagation()}>
                              Abrir
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </AssembleGroup>
        )}
      </div>
    </AppLayout>
  );
}

function ProjectMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 p-3 shadow-subtle">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}
