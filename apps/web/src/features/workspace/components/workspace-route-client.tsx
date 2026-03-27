"use client";

import type { ProjectSettings, ProjectSummary } from "@/lib/data/types";
import { WorkspaceBootstrapProvider } from "@/features/workspace/components/workspace-bootstrap-provider";
import WorkspaceScreen from "@/features/workspace/components/workspace-screen";

export function WorkspaceRouteClient({
  projectId,
  projects,
  settingsByProject,
}: {
  projectId: string;
  projects: ProjectSummary[];
  settingsByProject: Record<string, ProjectSettings>;
}) {
  return (
    <WorkspaceBootstrapProvider
      projectId={projectId}
      projects={projects}
      settingsByProject={settingsByProject}
    >
      <WorkspaceScreen key={projectId} />
    </WorkspaceBootstrapProvider>
  );
}
