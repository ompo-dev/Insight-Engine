import { useState } from "react";
import { useRoute } from "wouter";
import { Flag, Plus, Settings2, Trash2 } from "lucide-react";
import { useListFeatureFlags, useCreateFeatureFlag, useUpdateFeatureFlag, useDeleteFeatureFlag } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";

export default function FeatureFlags() {
  const [, params] = useRoute("/projects/:projectId/feature-flags");
  const projectId = params?.projectId || "";

  const { data: flags, isLoading, refetch } = useListFeatureFlags(projectId, { query: { enabled: !!projectId } });
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");

  const { mutate: createFlag, isPending: isCreating } = useCreateFeatureFlag({
    mutation: {
      onSuccess: () => {
        setIsCreateOpen(false);
        setKey("");
        setName("");
        refetch();
      }
    }
  });

  const { mutate: updateFlag } = useUpdateFeatureFlag({
    mutation: { onSuccess: () => refetch() }
  });

  const { mutate: deleteFlag } = useDeleteFeatureFlag({
    mutation: { onSuccess: () => refetch() }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createFlag({ projectId, data: { key, name, enabled: false, rolloutPercentage: 100 } });
  };

  const handleToggle = (flagId: string, enabled: boolean) => {
    updateFlag({ projectId, flagId, data: { enabled } });
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Feature Flags</h1>
          <p className="text-muted-foreground mt-1">Controle o lançamento de funcionalidades em tempo real.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Nova Flag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Criar Feature Flag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Chave (Key)</Label>
                  <Input 
                    placeholder="nova-dashboard-v2" 
                    value={key}
                    onChange={(e) => setKey(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    required 
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome Amigável</Label>
                  <Input 
                    placeholder="Nova Dashboard V2" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isCreating || !key || !name}>Criar Flag</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-subtle overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[60px]">Status</TableHead>
              <TableHead>Flag</TableHead>
              <TableHead>Rollout</TableHead>
              <TableHead>Regras</TableHead>
              <TableHead className="hidden sm:table-cell">Atualizado em</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell><Skeleton className="h-2 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : flags?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState 
                    icon={<Flag className="w-6 h-6" />}
                    title="Nenhuma feature flag"
                    description="Crie feature flags para liberar novidades gradualmente para seus usuários."
                    className="border-0 rounded-none bg-transparent"
                  />
                </TableCell>
              </TableRow>
            ) : (
              flags?.map((flag) => (
                <TableRow key={flag.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <Switch 
                      checked={flag.enabled} 
                      onCheckedChange={(c) => handleToggle(flag.id, c)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{flag.name}</div>
                    <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                      {flag.key}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all", flag.enabled ? "bg-primary" : "bg-muted-foreground/30")} 
                          style={{ width: `${flag.rolloutPercentage}%` }} 
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{flag.rolloutPercentage}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-secondary text-secondary-foreground font-normal">
                      {flag.targetingRules?.length || 0} regras
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDate(flag.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if(confirm("Tem certeza que deseja deletar?")) deleteFlag({ projectId, flagId: flag.id });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}
