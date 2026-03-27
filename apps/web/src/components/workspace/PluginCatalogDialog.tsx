import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkspacePluginCard } from "@/components/workspace/WorkspacePluginCard";
import { workspaceCatalogCategories } from "@/lib/workspace/registry";
import type {
  WorkspaceCatalogItem,
  WorkspaceNodeBinding,
  WorkspaceNodePresentation,
} from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

interface PluginCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: WorkspaceCatalogItem[];
  installedBindings: WorkspaceNodeBinding[];
  presentationByBindingKey: Record<string, WorkspaceNodePresentation>;
  onSelectItem: (item: WorkspaceCatalogItem) => void;
}

function getBindingKey(binding: WorkspaceNodeBinding) {
  return `${binding.kind}:${binding.entityId}`;
}

export function PluginCatalogDialog({
  open,
  onOpenChange,
  items,
  installedBindings,
  presentationByBindingKey,
  onSelectItem,
}: PluginCatalogDialogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setCategory("all");
      setSelectedItemIds([]);
    }
  }, [open]);

  const installedKeys = useMemo(
    () => new Set(installedBindings.map((binding) => getBindingKey(binding))),
    [installedBindings],
  );

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!normalizedSearch) return true;
      return [item.label, item.description, item.category, ...item.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [category, items, search]);

  const addableSelectedItemIds = selectedItemIds.filter((itemId) => {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item?.binding) return false;
    return !installedKeys.has(getBindingKey(item.binding));
  });

  const handleToggleItem = (item: WorkspaceCatalogItem) => {
    if (!item.binding) {
      onSelectItem(item);
      return;
    }

    setSelectedItemIds((current) =>
      current.includes(item.id)
        ? current.filter((candidate) => candidate !== item.id)
        : [...current, item.id],
    );
  };

  const handleAddSelected = () => {
    addableSelectedItemIds.forEach((itemId) => {
      const item = items.find((candidate) => candidate.id === itemId);
      if (item) onSelectItem(item);
    });
    setSelectedItemIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(96vw,1180px)] max-w-6xl overflow-hidden rounded-[28px] border border-border/70 bg-card p-0 text-card-foreground">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-card-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Catalogo modular
          </DialogTitle>
        </DialogHeader>
        <div className="border-b border-border/70 px-6 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Buscar template ou item do workspace"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={category === "all" ? "default" : "outline"}
                onClick={() => setCategory("all")}
              >
                Todos
              </Button>
              {workspaceCatalogCategories.map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={category === item ? "default" : "outline"}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-border/70 bg-background/40 text-muted-foreground"
              >
                {visibleItems.length} visiveis
              </Badge>
              <Badge
                variant="outline"
                className="border-border/70 bg-background/40 text-muted-foreground"
              >
                {selectedItemIds.length} selecionados
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSelectedItemIds(
                    visibleItems
                      .filter((item) => item.binding)
                      .map((item) => item.id),
                  )
                }
              >
                Selecionar visiveis
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedItemIds([])}
                disabled={!selectedItemIds.length}
              >
                Limpar
              </Button>
            </div>
          </div>
        </div>
        <ScrollArea className="h-[64vh]">
          <div className="grid gap-4 px-6 py-6 lg:grid-cols-2">
            {visibleItems.map((item) => {
              const installed = item.binding
                ? installedKeys.has(getBindingKey(item.binding))
                : false;
              const selected = selectedItemIds.includes(item.id);
              const presentation = item.binding
                ? presentationByBindingKey[getBindingKey(item.binding)]
                : null;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "rounded-[28px] border border-transparent text-left transition-transform hover:-translate-y-0.5",
                    selected && "border-primary/40",
                  )}
                  onClick={() => handleToggleItem(item)}
                >
                  {presentation ? (
                    <WorkspacePluginCard
                      presentation={presentation}
                      preview
                      expanded
                      className={cn(
                        selected && "border-primary/50",
                        installed && "opacity-70",
                      )}
                      footerAction={
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {installed ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              >
                                no canvas
                              </Badge>
                            ) : null}
                          </div>
                          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-border/70 bg-background/60 text-muted-foreground">
                            {selected ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </span>
                        </div>
                      }
                    />
                  ) : (
                    <div className="rounded-[24px] border border-border/70 bg-card p-5 shadow-card">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/60">
                              <item.icon
                                className={cn("h-5 w-5", item.accentClassName)}
                              />
                            </span>
                            <div>
                              <p className="font-semibold text-card-foreground">
                                {item.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.category}
                              </p>
                            </div>
                          </div>
                          <p className="mt-4 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-border/70 bg-background/60 text-muted-foreground">
                          <Plus className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            O builder cria um item unico. Blocos do catalogo podem entrar em
            lote no canvas atual.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddSelected}
              disabled={!addableSelectedItemIds.length}
            >
              {addableSelectedItemIds.length <= 1
                ? "Adicionar item"
                : `Adicionar ${addableSelectedItemIds.length} itens`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
