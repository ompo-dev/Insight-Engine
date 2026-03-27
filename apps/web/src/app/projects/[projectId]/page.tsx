import { notFound } from "next/navigation";
import { WorkspaceRouteClient } from "@/features/workspace/components/workspace-route-client";
import { getWorkspaceBootstrap } from "@/features/workspace/server/get-workspace-bootstrap";

export default async function ProjectWorkspacePage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const bootstrap = await getWorkspaceBootstrap(projectId);

  if (!bootstrap) {
    notFound();
  }

  return (
    <WorkspaceRouteClient
      projectId={bootstrap.project.id}
      projects={bootstrap.projects}
      settingsByProject={bootstrap.settingsByProject}
    />
  );
}
