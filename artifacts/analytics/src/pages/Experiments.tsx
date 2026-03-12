import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowRight, CheckCircle2, FlaskConical, Pause, Play, Plus } from "lucide-react";
import { useCreateExperiment, useListExperiments } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Experiments() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: experiments, isLoading, refetch } = useListExperiments(projectId!);
  const createExperiment = useCreateExperiment();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");

  const handleCreate = async () => {
    if (!name) return;

    try {
      await createExperiment.mutateAsync({
        projectId: projectId!,
        data: {
          name,
          hypothesis,
          variants: [
            { id: "control", name: "Control", weight: 0.5, isControl: true },
            { id: "variant-a", name: "Variant A", weight: 0.5, isControl: false },
          ],
        },
      });

      toast({ title: "Experimento criado" });
      setIsCreateOpen(false);
      setName("");
      setHypothesis("");
      void refetch();
    } catch {
      toast({ title: "Falha ao criar experimento", variant: "destructive" });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Play className="mr-1 h-3 w-3 text-green-500" />;
      case "paused":
        return <Pause className="mr-1 h-3 w-3 text-yellow-500" />;
      case "completed":
        return <CheckCircle2 className="mr-1 h-3 w-3 text-blue-500" />;
      default:
        return <div className="mr-2 h-2 w-2 rounded-full bg-muted-foreground" />;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Experimentos A/B</h1>
            <p className="text-sm text-muted-foreground">
              Valide hipoteses de produto com rollout seguro e leitura clara de impacto.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Novo experimento
          </Button>
        </div>

        {isLoading ? (
          <div className="grid animate-pulse gap-4 md:grid-cols-2">
            <div className="h-40 rounded-2xl border border-border/50 bg-card" />
            <div className="h-40 rounded-2xl border border-border/50 bg-card" />
          </div>
        ) : !experiments || experiments.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="w-6 h-6" />}
            title="Nenhum experimento criado"
            description="Crie um teste A/B para comparar interfaces, fluxos e mensagens antes do rollout total."
            action={
              <Button onClick={() => setIsCreateOpen(true)} variant="outline">
                Criar primeiro teste
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {experiments.map((experiment) => (
              <div
                key={experiment.id}
                className="group relative flex h-full flex-col rounded-2xl border border-border/50 bg-card p-6 shadow-subtle transition-all hover:shadow-card"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex w-fit items-center rounded-md border border-border/50 bg-muted px-2 py-1 text-xs font-medium capitalize">
                    {getStatusIcon(experiment.status)}
                    {experiment.status}
                  </div>
                </div>

                <h3 className="mb-2 text-lg font-bold leading-tight text-foreground">{experiment.name}</h3>
                <p className="mb-6 flex-1 line-clamp-2 text-sm text-muted-foreground">
                  {experiment.hypothesis || "Sem hipotese registrada ainda."}
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4">
                  <span className="font-mono text-xs text-muted-foreground">
                    {experiment.variants.length} variantes
                  </span>
                  <Link href={`/projects/${projectId}/experiments/${experiment.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 pr-1 transition-colors group-hover:bg-primary/10 group-hover:text-primary"
                    >
                      Ver resultado <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Criar experimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do experimento</label>
              <Input
                placeholder="Ex: Checkout com resumo lateral"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hipotese</label>
              <Input
                placeholder="Ex: menos etapas aumentam a conversao"
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createExperiment.isPending}>
              {createExperiment.isPending ? "Criando..." : "Criar experimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
