import { useState } from "react";
import { Link } from "wouter";
import { Plus, BarChart3, Copy, Check, TrendingUp } from "lucide-react";
import { useListProjects, useCreateProject } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function Projects() {
  const { data: projects, isLoading, refetch } = useListProjects();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { mutate: createProject, isPending } = useCreateProject({
    mutation: {
      onSuccess: () => {
        setIsCreateOpen(false);
        setName("");
        setDescription("");
        refetch();
      }
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProject({ data: { name, description } });
  };

  const copyToClipboard = (e: React.MouseEvent, text: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Seus Projetos</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus micro-SaaS e workspaces.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Criar Novo Projeto</DialogTitle>
                <DialogDescription>
                  Adicione um novo SaaS para começar a monitorar métricas, receita e eventos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Projeto</Label>
                  <Input 
                    id="name" 
                    placeholder="Ex: Meu SaaS Incrível" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Descrição (Opcional)</Label>
                  <Input 
                    id="desc" 
                    placeholder="Ferramenta de IA para criadores" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending || !name}>
                  {isPending ? "Criando..." : "Criar Projeto"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full mb-4 rounded-md" />
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-2xl bg-card/50">
          <img src={`${import.meta.env.BASE_URL}images/empty-dashboard.png`} alt="Nenhum projeto" className="w-64 mb-6 opacity-80" />
          <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Lynx</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            A plataforma definitiva para micro-SaaS brasileiros. Crie seu primeiro projeto para começar a rastrear receita, clientes e eventos.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} size="lg" className="shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5 mr-2" />
            Criar meu primeiro projeto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}/overview`}>
              <Card className="hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 cursor-pointer transition-all duration-300 group h-full flex flex-col bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">{project.name}</CardTitle>
                      <CardDescription className="mt-1">{project.slug}</CardDescription>
                    </div>
                    {project.abacatePayConnected && (
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" title="Abacate Pay Conectado" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">API Key</Label>
                    <div 
                      className="flex items-center justify-between bg-muted/50 p-2 rounded-md border group/key"
                      onClick={(e) => copyToClipboard(e, project.apiKey, project.id)}
                    >
                      <code className="text-xs text-foreground/80 truncate font-mono">
                        {project.apiKey.substring(0, 15)}...
                      </code>
                      <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-background transition-colors">
                        {copiedId === project.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background rounded-lg p-3 border shadow-subtle">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">MRR</span>
                      </div>
                      <div className="text-lg font-bold text-foreground">
                        {formatMoney(project.mrr || 0)}
                      </div>
                    </div>
                    <div className="bg-background rounded-lg p-3 border shadow-subtle">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Eventos</span>
                      </div>
                      <div className="text-lg font-bold text-foreground">
                        {formatNumber(project.eventCount || 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
