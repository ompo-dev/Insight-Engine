import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { ProjectSummary } from "@/lib/data/types";
import type { WorkspaceItemEditorSection } from "@/lib/workspace/types";

export function useWorkspaceScreenLocalState(activeProject: ProjectSummary | null) {
  const viewportStateRef = useRef({ x: 0, y: 0, zoom: 1 });
  const viewportTweenRef = useRef<gsap.core.Tween | null>(null);
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [focusedItemSection, setFocusedItemSection] = useState<WorkspaceItemEditorSection | null>(null);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [canvasInteractionMode, setCanvasInteractionMode] = useState<"select" | "pan">("select");
  const [isProjectMetaEditing, setIsProjectMetaEditing] = useState(false);
  const [isProjectMetaSaving, setIsProjectMetaSaving] = useState(false);
  const [isProjectCreating, setIsProjectCreating] = useState(false);
  const [projectDraftName, setProjectDraftName] = useState("");
  const [projectDraftDescription, setProjectDraftDescription] = useState("");

  useEffect(() => {
    setProjectDraftName(activeProject?.name ?? "");
    setProjectDraftDescription(activeProject?.description ?? "");
    setIsProjectMetaEditing(false);
  }, [activeProject?.id, activeProject?.name, activeProject?.description]);

  useEffect(() => {
    if (!isProjectMetaEditing) return;
    const frame = window.requestAnimationFrame(() => {
      projectNameInputRef.current?.focus();
      projectNameInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isProjectMetaEditing]);

  return {
    viewportStateRef,
    viewportTweenRef,
    projectNameInputRef,
    isProjectSwitcherOpen,
    setIsProjectSwitcherOpen,
    isWorkspaceSwitcherOpen,
    setIsWorkspaceSwitcherOpen,
    isCatalogOpen,
    setIsCatalogOpen,
    isCommandOpen,
    setIsCommandOpen,
    focusedItemSection,
    setFocusedItemSection,
    assistantPrompt,
    setAssistantPrompt,
    canvasInteractionMode,
    setCanvasInteractionMode,
    isProjectMetaEditing,
    setIsProjectMetaEditing,
    isProjectMetaSaving,
    setIsProjectMetaSaving,
    isProjectCreating,
    setIsProjectCreating,
    projectDraftName,
    setProjectDraftName,
    projectDraftDescription,
    setProjectDraftDescription,
  };
}
