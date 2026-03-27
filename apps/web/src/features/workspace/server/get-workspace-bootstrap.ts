import { getProject, getProjectSettings, listProjects } from "@workspace/domain";
import type { ProjectSettings, ProjectSummary } from "@/lib/data/types";

export interface WorkspaceBootstrapPayload {
  project: ProjectSummary;
  projects: ProjectSummary[];
  settingsByProject: Record<string, ProjectSettings>;
}

export async function getWorkspaceBootstrap(projectId: string): Promise<WorkspaceBootstrapPayload | null> {
  const [projects, project] = await Promise.all([listProjects(), getProject(projectId)]);

  if (!project) {
    return null;
  }

  const settings = await getProjectSettings(project.id);

  return {
    project: project as ProjectSummary,
    projects: projects as ProjectSummary[],
    settingsByProject: {
      [project.id]: settings as ProjectSettings,
    },
  };
}
