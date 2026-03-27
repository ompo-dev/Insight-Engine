"use client";

import { useEffect } from "react";
import type { ProjectSettings, ProjectSummary } from "@/lib/data/types";
import { useProjectStore } from "@/store/use-project-store";
import { useProjectsStore } from "@/store/use-projects-store";

export function WorkspaceBootstrapProvider({
  projectId,
  projects,
  settingsByProject,
  children,
}: {
  projectId: string;
  projects: ProjectSummary[];
  settingsByProject: Record<string, ProjectSettings>;
  children: React.ReactNode;
}) {
  const prime = useProjectsStore((state) => state.prime);
  const setSelectedProjectId = useProjectStore((state) => state.setSelectedProjectId);

  useEffect(() => {
    prime({ projects, settings: settingsByProject });
    setSelectedProjectId(projectId);
  }, [prime, projectId, projects, setSelectedProjectId, settingsByProject]);

  return <>{children}</>;
}
