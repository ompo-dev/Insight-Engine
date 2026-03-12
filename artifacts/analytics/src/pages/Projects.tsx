import { useState } from "react";
import { useLocation } from "wouter";
import { BarChart3, Plus, Key, Copy, ArrowRight, Settings } from "lucide-react";
import { useListProjects, useCreateProject } from "@workspace/api-client-react";
import { useProjectStore } from "@/store/use-project-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";

export default function Projects() {
  const [_, setLocation] = useLocation();
  const { setActiveProjectId } = useProjectStore();
  const { toast } = useToast();
  
  const { data: projects, isLoading, refetch } = useListProjects();
  const createProjectMutation = useCreateProject();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    try {
      await createProjectMutation.mutateAsync({ data: { name: newProjectName } });
      toast({ title: "Project created successfully" });
      setIsCreateOpen(false);
      setNewProjectName("");
      refetch();
    } catch (e) {
      toast({ title: "Failed to create project", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const enterProject = (id: string) => {
    setActiveProjectId(id);
    setLocation(`/projects/${id}/overview`);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading projects...</div>;

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            Lynx Analytics
          </h1>
          <p className="text-muted-foreground mt-2">Manage your workspaces and applications.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {!projects || projects.length === 0 ? (
        <EmptyState 
          icon={<Settings className="w-6 h-6" />}
          title="No projects yet"
          description="Create your first project to start tracking events, sessions, and experiments."
          action={
            <Button onClick={() => setIsCreateOpen(true)}>Create Project</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="bg-card rounded-2xl border border-border p-6 shadow-subtle hover:shadow-card transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => enterProject(project.id)}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              
              <h3 className="text-xl font-semibold mb-1 cursor-pointer hover:text-primary transition-colors" onClick={() => enterProject(project.id)}>
                {project.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 font-mono bg-muted/50 inline-block px-2 py-0.5 rounded">
                {project.slug}
              </p>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">API KEY</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded border border-border/50 truncate flex-1">
                      {project.apiKey}
                    </code>
                    <Button variant="outline" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(project.apiKey)}>
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div>
                    <span className="text-xs text-muted-foreground">Events</span>
                    <p className="font-semibold text-foreground">{project.eventCount?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Sessions</span>
                    <p className="font-semibold text-foreground">{project.sessionCount?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              A project represents a single application or website you want to track.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="e.g. Production Web App" 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={createProjectMutation.isPending} className="rounded-xl">
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
