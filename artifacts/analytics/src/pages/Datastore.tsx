import { useState } from "react";
import { useParams } from "wouter";
import { useListDatastoreCollections, useQueryDatastore, useInsertDatastoreRecord } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Database, Plus, Code, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

export default function Datastore() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  
  const { data: collections, isLoading: isLoadingColls, refetch: refetchColls } = useListDatastoreCollections(projectId!);
  
  const [activeColl, setActiveColl] = useState<string | null>(null);
  const selectedCollection = activeColl || (collections && collections.length > 0 ? collections[0].name : null);
  
  const { data: recordsData, refetch: refetchRecords } = useQueryDatastore(
    projectId!, 
    selectedCollection || "dummy", 
    { limit: 50 },
    { query: { enabled: !!selectedCollection } }
  );

  const insertMutation = useInsertDatastoreRecord();
  
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [newCollName, setNewCollName] = useState("");
  const [jsonInput, setJsonInput] = useState("{\n  \"key\": \"value\"\n}");

  const handleInsert = async () => {
    const targetColl = newCollName.trim() || selectedCollection;
    if (!targetColl) return toast({ title: "Collection name required", variant: "destructive" });
    
    try {
      const parsedData = JSON.parse(jsonInput);
      await insertMutation.mutateAsync({
        projectId: projectId!,
        collection: targetColl,
        data: { data: parsedData }
      });
      toast({ title: "Record inserted" });
      setIsInsertOpen(false);
      refetchColls();
      if (targetColl === selectedCollection) refetchRecords();
    } catch (e) {
      toast({ title: "Invalid JSON or insertion failed", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Database className="w-6 h-6 text-muted-foreground" /> Datastore
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Schema-less JSON document storage for this project.</p>
          </div>
          <Button onClick={() => { setNewCollName(""); setIsInsertOpen(true); }} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> Insert Record
          </Button>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Sidebar Collections */}
          <div className="w-64 bg-card border border-border/50 rounded-2xl shadow-subtle flex flex-col shrink-0 overflow-hidden">
             <div className="p-4 border-b border-border/50 bg-muted/10 font-medium text-sm flex items-center gap-2">
               <Layers className="w-4 h-4 text-muted-foreground" /> Collections
             </div>
             <div className="flex-1 overflow-y-auto p-2 space-y-1">
               {isLoadingColls ? (
                 <div className="p-4 text-sm text-muted-foreground">Loading...</div>
               ) : !collections || collections.length === 0 ? (
                 <div className="p-4 text-sm text-muted-foreground">No collections yet. Insert a record to create one.</div>
               ) : (
                 collections.map(c => (
                   <button 
                     key={c.name}
                     onClick={() => setActiveColl(c.name)}
                     className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                       selectedCollection === c.name ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-foreground'
                     }`}
                   >
                     <span className="truncate">{c.name}</span>
                     <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCollection === c.name ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                       {c.recordCount}
                     </span>
                   </button>
                 ))
               )}
             </div>
          </div>

          {/* Main Content Records */}
          <div className="flex-1 bg-card border border-border/50 rounded-2xl shadow-subtle overflow-hidden flex flex-col relative">
             <div className="p-4 border-b border-border/50 bg-muted/10 flex items-center gap-2 text-sm font-medium">
                <Code className="w-4 h-4 text-muted-foreground" />
                {selectedCollection ? `Records in "${selectedCollection}"` : 'Select a collection'}
             </div>
             <div className="flex-1 overflow-auto p-4 space-y-4 bg-muted/5">
                {recordsData?.records.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">Collection is empty.</div>
                )}
                {recordsData?.records.map(record => (
                  <div key={record.id} className="bg-background border border-border/50 rounded-xl p-4 shadow-sm relative group">
                     <div className="absolute top-4 right-4 text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                       {format(parseISO(record.createdAt), 'MMM d, HH:mm:ss')}
                     </div>
                     <p className="text-xs text-muted-foreground font-mono mb-2">ID: {record.id}</p>
                     <pre className="text-sm font-mono bg-zinc-950 text-zinc-300 p-4 rounded-lg overflow-x-auto">
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
            <DialogTitle>Insert JSON Record</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Collection Name</label>
              <Input 
                placeholder={selectedCollection || "users"} 
                value={newCollName}
                onChange={(e) => setNewCollName(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Leave blank to use currently selected collection.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">JSON Data</label>
              <Textarea 
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="font-mono text-sm min-h-[200px] bg-zinc-950 text-zinc-300 border-zinc-800 focus:ring-zinc-700"
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInsertOpen(false)}>Cancel</Button>
            <Button onClick={handleInsert} disabled={insertMutation.isPending}>
              {insertMutation.isPending ? "Inserting..." : "Insert Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
