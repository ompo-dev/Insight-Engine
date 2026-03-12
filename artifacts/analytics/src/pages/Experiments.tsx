import { useState } from "react";
import { useParams, Link } from "wouter";
import { useListExperiments, useCreateExperiment } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FlaskConical, Plus, ArrowRight, Play, Pause, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";

export default function Experiments() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: experiments, isLoading, refetch } = useListExperiments(projectId!);
  const createExpMutation = useCreateExperiment();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");

  const handleCreate = async () => {
    if (!name) return;
    try {
      await createExpMutation.mutateAsync({
        projectId: projectId!,
        data: {
          name,
          hypothesis,
          variants: [
            { name: "Control", weight: 50, isControl: true },
            { name: "Variant A", weight: 50, isControl: false }
          ]
        }
      });
      toast({ title: "Experiment created" });
      setIsCreateOpen(false);
      setName("");
      setHypothesis("");
      refetch();
    } catch {
      toast({ title: "Failed to create", variant: "destructive" });
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'running': return <Play className="w-3 h-3 mr-1 text-green-500" />;
      case 'paused': return <Pause className="w-3 h-3 mr-1 text-yellow-500" />;
      case 'completed': return <CheckCircle2 className="w-3 h-3 mr-1 text-blue-500" />;
      default: return <div className="w-2 h-2 rounded-full bg-muted-foreground mr-2" />;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">A/B Experiments</h1>
            <p className="text-muted-foreground text-sm">Test features and measure impact safely.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> New Experiment
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
             <div className="h-40 bg-card border border-border/50 rounded-2xl"></div>
             <div className="h-40 bg-card border border-border/50 rounded-2xl"></div>
          </div>
        ) : !experiments || experiments.length === 0 ? (
          <EmptyState 
            icon={<FlaskConical className="w-6 h-6" />}
            title="No experiments running"
            description="Create an A/B test to start optimizing your application."
            action={<Button onClick={() => setIsCreateOpen(true)} variant="outline">Create your first test</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiments.map((exp) => (
              <div key={exp.id} className="bg-card border border-border/50 rounded-2xl p-6 shadow-subtle hover:shadow-card transition-all relative group flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                   <div className="flex items-center text-xs font-medium capitalize px-2 py-1 rounded-md bg-muted border border-border/50 w-fit">
                     {getStatusIcon(exp.status)}
                     {exp.status}
                   </div>
                </div>
                
                <h3 className="text-lg font-bold text-foreground mb-2 leading-tight">{exp.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                  {exp.hypothesis || "No hypothesis provided."}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
                  <span className="text-xs text-muted-foreground font-mono">{exp.variants.length} Variants</span>
                  <Link href={`/projects/${projectId}/experiments/${exp.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 pr-1 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      Results <ArrowRight className="w-4 h-4" />
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
            <DialogTitle>Create Experiment</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Experiment Name</label>
              <Input 
                placeholder="e.g. New Checkout Flow" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hypothesis</label>
              <Input 
                placeholder="e.g. Removing steps will increase conversion" 
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createExpMutation.isPending}>
              {createExpMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
