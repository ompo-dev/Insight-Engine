import { useState } from "react";
import { useParams } from "wouter";
import { useListFunnels, useCreateFunnel } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Filter, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";

export default function Funnels() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: funnels, isLoading, refetch } = useListFunnels(projectId!);
  const createMutation = useCreateFunnel();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name) return;
    try {
      await createMutation.mutateAsync({
        projectId: projectId!,
        data: {
          name,
          steps: [
            { order: 1, eventName: "pageview", label: "Visited Site" },
            { order: 2, eventName: "signup", label: "Signed Up" }
          ]
        }
      });
      toast({ title: "Funnel created" });
      setIsCreateOpen(false);
      setName("");
      refetch();
    } catch {
      toast({ title: "Failed to create", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Filter className="w-6 h-6 text-muted-foreground" /> Conversion Funnels
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Analyze where users drop off in key flows.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> New Funnel
          </Button>
        </div>

        {isLoading ? (
          <div className="h-64 bg-card border border-border/50 rounded-2xl animate-pulse"></div>
        ) : !funnels || funnels.length === 0 ? (
          <EmptyState 
            icon={<Filter className="w-6 h-6" />}
            title="No funnels created"
            description="Build sequences of events to measure conversion rates step-by-step."
            action={<Button onClick={() => setIsCreateOpen(true)} variant="outline">Create Funnel</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {funnels.map(funnel => (
              <div key={funnel.id} className="bg-card border border-border/50 rounded-2xl p-6 shadow-subtle hover:shadow-card transition-all">
                <h3 className="text-lg font-bold text-foreground mb-4">{funnel.name}</h3>
                
                <div className="space-y-3 mb-6 relative before:absolute before:inset-y-2 before:left-2.5 before:w-0.5 before:bg-border/50">
                  {funnel.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 relative z-10">
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold ring-4 ring-card shrink-0">
                        {step.order}
                      </div>
                      <div className="flex-1 bg-muted/50 border border-border/50 px-3 py-1.5 rounded-lg">
                        <p className="text-sm font-medium">{step.label}</p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{step.eventName}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  View Analysis <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create Funnel</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Funnel Name</label>
              <Input 
                placeholder="e.g. Signup Conversion" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-4">Steps can be configured after creation.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
