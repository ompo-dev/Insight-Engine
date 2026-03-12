import { useState } from "react";
import { useParams } from "wouter";
import { format, parseISO } from "date-fns";
import { Code, Database, Layers, Plus } from "lucide-react";
import { useInsertDatastoreRecord, useListDatastoreCollections, useQueryDatastore } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Datastore() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  const { data: collections, isLoading: isLoadingCollections, refetch: refetchCollections } =
    useListDatastoreCollections(projectId!);

  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [jsonInput, setJsonInput] = useState("{\n  \"key\": \"value\"\n}");

  const selectedCollection =
    activeCollection || (collections && collections.length > 0 ? collections[0].name : null);

  const { data: recordsData, refetch: refetchRecords } = useQueryDatastore(
    projectId!,
    selectedCollection || "placeholder",
    { limit: 50 },
    { query: { enabled: !!selectedCollection } },
  );

  const insertMutation = useInsertDatastoreRecord();

  const handleInsert = async () => {
    const targetCollection = newCollectionName.trim() || selectedCollection;

    if (!targetCollection) {
      toast({ title: "Nome da colecao obrigatorio", variant: "destructive" });
      return;
    }

    try {
      const parsedData = JSON.parse(jsonInput);
      await insertMutation.mutateAsync({
        projectId: projectId!,
        collection: targetCollection,
        data: { data: parsedData },
      });

      toast({ title: "Registro inserido" });
      setIsInsertOpen(false);
      void refetchCollections();

      if (targetCollection === selectedCollection) {
        void refetchRecords();
      }
    } catch {
      toast({ title: "JSON invalido ou falha na insercao", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col space-y-6">
        <div className="flex shrink-0 items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <Database className="h-6 w-6 text-muted-foreground" /> Datastore
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Colecoes JSON flexiveis para prototipar dados antes da camada Prisma.
            </p>
          </div>
          <Button
            onClick={() => {
              setNewCollectionName("");
              setIsInsertOpen(true);
            }}
            className="gap-2 rounded-xl"
          >
            <Plus className="h-4 w-4" /> Inserir registro
          </Button>
        </div>

        <div className="flex flex-1 gap-6 overflow-hidden">
          <div className="flex w-64 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-subtle">
            <div className="flex items-center gap-2 border-b border-border/50 bg-muted/10 p-4 text-sm font-medium">
              <Layers className="h-4 w-4 text-muted-foreground" /> Colecoes
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {isLoadingCollections ? (
                <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
              ) : !collections || collections.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Nenhuma colecao criada ainda. Insira um registro para abrir a primeira.
                </div>
              ) : (
                collections.map((collection) => (
                  <button
                    key={collection.name}
                    onClick={() => setActiveCollection(collection.name)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedCollection === collection.name
                        ? "bg-primary font-medium text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{collection.name}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        selectedCollection === collection.name
                          ? "bg-primary-foreground/20"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {collection.recordCount}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-subtle">
            <div className="flex items-center gap-2 border-b border-border/50 bg-muted/10 p-4 text-sm font-medium">
              <Code className="h-4 w-4 text-muted-foreground" />
              {selectedCollection ? `Registros em "${selectedCollection}"` : "Selecione uma colecao"}
            </div>
            <div className="flex-1 space-y-4 overflow-auto bg-muted/5 p-4">
              {recordsData?.records.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">A colecao ainda esta vazia.</div>
              )}
              {recordsData?.records.map((record) => (
                <div key={record.id} className="relative rounded-xl border border-border/50 bg-background p-4 shadow-sm">
                  <div className="absolute right-4 top-4 rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                    {format(parseISO(record.createdAt), "MMM d, HH:mm:ss")}
                  </div>
                  <p className="mb-2 font-mono text-xs text-muted-foreground">ID: {record.id}</p>
                  <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-sm text-zinc-300">
                    {JSON.stringify(record.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isInsertOpen} onOpenChange={setIsInsertOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Inserir registro JSON</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da colecao</label>
              <Input
                placeholder={selectedCollection || "users"}
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar a colecao selecionada no painel.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dados JSON</label>
              <Textarea
                value={jsonInput}
                onChange={(event) => setJsonInput(event.target.value)}
                className="min-h-[200px] border-zinc-800 bg-zinc-950 font-mono text-sm text-zinc-300 focus:ring-zinc-700"
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInsertOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInsert} disabled={insertMutation.isPending}>
              {insertMutation.isPending ? "Inserindo..." : "Inserir registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
