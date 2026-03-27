import { FolderKanban, Library, PanelsTopLeft, Sparkles, PlusSquare } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import type { WorkspaceCatalogItem, CanvasLayer } from "@/lib/workspace/types";

interface WorkspaceCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installedNodes: Array<{ id: string; label: string; description: string; kindLabel: string }>;
  catalogItems: WorkspaceCatalogItem[];
  currentLayer: CanvasLayer;
  onOpenNode: (nodeId: string) => void;
  onSelectCatalogItem: (item: WorkspaceCatalogItem) => void;
  onOpenCatalog: () => void;
  onSwitchLayer: (layer: CanvasLayer) => void;
  onOpenProjects: () => void;
  onOpenSettings: () => void;
  onRestorePreset: () => void;
}

export function WorkspaceCommandMenu({
  open,
  onOpenChange,
  installedNodes,
  catalogItems,
  onOpenNode,
  onSelectCatalogItem,
  onOpenCatalog,
  onOpenProjects,
  onOpenSettings,
  onRestorePreset,
}: WorkspaceCommandMenuProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Busque nos, templates ou acoes" />
      <CommandList>
        <CommandEmpty>Nenhuma acao encontrada.</CommandEmpty>
        <CommandGroup heading="Nos no workspace">
          {installedNodes.map((node) => (
            <CommandItem
              key={node.id}
              value={`${node.label} ${node.description} ${node.kindLabel}`}
              onSelect={() => {
                onOpenNode(node.id);
                onOpenChange(false);
              }}
            >
              <span>{node.label}</span>
              <CommandShortcut>{node.kindLabel}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Adicionar ao workspace">
          {catalogItems.slice(0, 12).map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.description} ${item.category}`}
              onSelect={() => {
                onSelectCatalogItem(item);
                onOpenChange(false);
              }}
            >
              <span>{item.label}</span>
              <CommandShortcut>{item.category}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Workspace">
          <CommandItem
            value="catalogo modular"
            onSelect={() => {
              onOpenCatalog();
              onOpenChange(false);
            }}
          >
            <Library className="h-4 w-4 text-primary" />
            <span>Abrir catalogo</span>
            <CommandShortcut>Browse</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="novo no vazio"
            onSelect={() => {
              const builder = catalogItems.find((item) => item.id === "builder_item");
              if (builder) {
                onSelectCatalogItem(builder);
              }
              onOpenChange(false);
            }}
          >
            <PlusSquare className="h-4 w-4 text-emerald-400" />
            <span>Criar novo no vazio</span>
          </CommandItem>
          <CommandItem
            value="restaurar template workspace"
            onSelect={() => {
              onRestorePreset();
              onOpenChange(false);
            }}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Restaurar template base</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Canvas">
          <CommandItem
            value="trocar projeto"
            onSelect={() => {
              onOpenProjects();
              onOpenChange(false);
            }}
          >
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            <span>Trocar projeto</span>
          </CommandItem>
          <CommandItem
            value="trocar workspace"
            onSelect={() => {
              onOpenSettings();
              onOpenChange(false);
            }}
          >
            <PanelsTopLeft className="h-4 w-4 text-muted-foreground" />
            <span>Trocar workspace</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
