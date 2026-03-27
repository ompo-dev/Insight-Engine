import { useMemo } from "react";
import { Database, Pencil, PlaySquare, Trash2, X } from "lucide-react";
import {
  WorkspaceCanvasDock,
  type WorkspaceCanvasDockAction,
} from "@/features/workspace/components/workspace-canvas-dock";
import type { WorkspaceNodePresentation } from "@/lib/workspace/types";

export function WorkspaceCanvasNodeActionDock({
  presentation,
  onEdit,
  onOpenData,
  onOpenActions,
  onRemove,
  onClearFocus,
}: {
  presentation: WorkspaceNodePresentation;
  onEdit: () => void;
  onOpenData: () => void;
  onOpenActions: () => void;
  onRemove: () => void;
  onClearFocus: () => void;
}) {
  const actions = useMemo<WorkspaceCanvasDockAction[]>(
    () => [
      {
        id: "edit",
        label: `Editar ${presentation.title}`,
        icon: <Pencil className="h-4 w-4" />,
        onClick: onEdit,
      },
      {
        id: "data",
        label: `Dados de ${presentation.title}`,
        icon: <Database className="h-4 w-4" />,
        onClick: onOpenData,
      },
      {
        id: "actions",
        label: `Acoes de ${presentation.title}`,
        icon: <PlaySquare className="h-4 w-4" />,
        onClick: onOpenActions,
      },
      {
        id: "remove",
        label: `Remover ${presentation.title}`,
        icon: <Trash2 className="h-4 w-4" />,
        onClick: onRemove,
      },
      {
        id: "close",
        label: `Fechar foco de ${presentation.title}`,
        icon: <X className="h-4 w-4" />,
        onClick: onClearFocus,
      },
    ],
    [
      onClearFocus,
      onEdit,
      onOpenActions,
      onOpenData,
      onRemove,
      presentation.title,
    ],
  );

  return (
    <WorkspaceCanvasDock
      actions={actions}
      orientation="horizontal"
      splitAfter={3}
      animation="node-focus"
      className="shadow-[0_20px_44px_rgba(0,0,0,0.34)]"
    />
  );
}
