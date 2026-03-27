import type { FocusEventHandler, KeyboardEventHandler } from "react";
import type { ProjectSummary } from "@/lib/data/types";

type ToastFn = (input: {
  title: string;
  description: string;
}) => void;

export function useWorkspaceProjectMeta({
  activeProject,
  projectDraftName,
  projectDraftDescription,
  isProjectMetaSaving,
  setProjectDraftName,
  setProjectDraftDescription,
  setIsProjectMetaEditing,
  setIsProjectMetaSaving,
  updateProject,
  toast,
}: {
  activeProject: ProjectSummary | null;
  projectDraftName: string;
  projectDraftDescription: string;
  isProjectMetaSaving: boolean;
  setProjectDraftName: (value: string) => void;
  setProjectDraftDescription: (value: string) => void;
  setIsProjectMetaEditing: (value: boolean) => void;
  setIsProjectMetaSaving: (value: boolean) => void;
  updateProject: (projectId: string, input: { name?: string; description?: string }) => Promise<unknown>;
  toast: ToastFn;
}) {
  const handleStartProjectMetaEditing = () => {
    if (!activeProject || isProjectMetaSaving) return;
    setProjectDraftName(activeProject.name);
    setProjectDraftDescription(activeProject.description ?? "");
    setIsProjectMetaEditing(true);
  };

  const handleCancelProjectMetaEditing = () => {
    setProjectDraftName(activeProject?.name ?? "");
    setProjectDraftDescription(activeProject?.description ?? "");
    setIsProjectMetaEditing(false);
  };

  const handleCommitProjectMeta = async () => {
    if (!activeProject) {
      setIsProjectMetaEditing(false);
      return;
    }

    const nextName = projectDraftName.trim();
    const nextDescription = projectDraftDescription.trim();

    if (!nextName) {
      setProjectDraftName(activeProject.name);
      setProjectDraftDescription(activeProject.description ?? "");
      setIsProjectMetaEditing(false);
      return;
    }

    if (nextName === activeProject.name && nextDescription === (activeProject.description ?? "")) {
      setIsProjectMetaEditing(false);
      return;
    }

    setIsProjectMetaSaving(true);
    try {
      await updateProject(activeProject.id, {
        name: nextName,
        description: nextDescription || undefined,
      });
      toast({
        title: "Projeto atualizado",
        description: "Titulo e subtitulo do projeto foram salvos.",
      });
    } catch {
      setProjectDraftName(activeProject.name);
      setProjectDraftDescription(activeProject.description ?? "");
      toast({
        title: "Nao foi possivel salvar o projeto",
        description: "Tente novamente em alguns instantes.",
      });
    } finally {
      setIsProjectMetaSaving(false);
      setIsProjectMetaEditing(false);
    }
  };

  const handleProjectMetaBlur: FocusEventHandler<HTMLDivElement> = (event) => {
    const nextFocused = event.relatedTarget as Node | null;
    if (nextFocused && event.currentTarget.contains(nextFocused)) return;
    void handleCommitProjectMeta();
  };

  const handleProjectMetaKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleCommitProjectMeta();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelProjectMetaEditing();
    }
  };

  return {
    handleStartProjectMetaEditing,
    handleCancelProjectMetaEditing,
    handleCommitProjectMeta,
    handleProjectMetaBlur,
    handleProjectMetaKeyDown,
  };
}
