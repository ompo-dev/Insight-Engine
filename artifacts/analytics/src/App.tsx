import { lazy, Suspense, useEffect } from "react";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useListProjects } from "@/lib/data/hooks";
import { buildWorkspaceHref } from "@/lib/workspace/routes";
import type { CanvasLayer, PluginId, WorkspaceInspectorTab } from "@/lib/workspace/types";
import { useProjectStore } from "@/store/use-project-store";

const NotFound = lazy(() => import("@/pages/not-found"));
const Workspace = lazy(() => import("@/pages/Workspace"));

function WorkspaceBootSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#090d16] px-4 py-4 text-slate-50 sm:px-6 lg:px-8">
      <div className="grid min-h-[calc(100dvh-2rem)] gap-4 lg:grid-cols-[78px_minmax(0,1fr)]">
        <div className="hidden rounded-[28px] border border-white/6 bg-[#0d111c] lg:block" />
        <div className="grid min-h-0 gap-4">
          <div className="rounded-[28px] border border-white/6 bg-[#0d111c] px-5 py-4">
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-11 w-48 rounded-2xl bg-white/10" />
              <Skeleton className="h-11 w-40 rounded-2xl bg-white/10" />
              <Skeleton className="h-11 w-28 rounded-2xl bg-white/10" />
            </div>
            <Skeleton className="mt-4 h-7 w-64 rounded-2xl bg-white/10" />
            <Skeleton className="mt-3 h-4 w-[28rem] max-w-full rounded-2xl bg-white/5" />
          </div>
          <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Skeleton className="min-h-[520px] rounded-[28px] bg-white/5" />
            <Skeleton className="hidden rounded-[28px] bg-white/5 xl:block" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeRedirect() {
  const [, setLocation] = useLocation();
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const { data: projects, isLoading } = useListProjects();

  useEffect(() => {
    if (isLoading || !projects?.length) return;

    const preferredProject = projects.find(
      (project) => project.id === selectedProjectId || project.slug === selectedProjectId,
    );

    setLocation(buildWorkspaceHref(preferredProject?.id ?? projects[0].id));
  }, [isLoading, projects, selectedProjectId, setLocation]);

  if (isLoading) {
    return <WorkspaceBootSkeleton />;
  }

  if (!projects?.length) {
    return <NoProjectsCanvasState />;
  }

  return <WorkspaceBootSkeleton />;
}

function NoProjectsCanvasState() {
  return (
    <div className="min-h-[100dvh] bg-[#17191e] px-4 py-4 text-slate-50">
      <div className="flex min-h-[calc(100dvh-2rem)] items-center justify-center rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.08),transparent_34%),#11141a] p-8 shadow-[0_32px_72px_rgba(0,0,0,0.32)]">
        <div className="max-w-xl text-center">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Unified Canvas</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Nenhum projeto ativo no canvas</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            A aplicacao agora vive inteira no canvas. Assim que houver um projeto disponivel, a navegacao cai direto no workspace operacional.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProjectRedirect({ projectId }: { projectId: string }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(buildWorkspaceHref(projectId));
  }, [projectId, setLocation]);

  return null;
}

function LegacyWorkspaceRedirect({
  projectId,
  plugin,
  layer = "map",
  tab = "overview",
}: {
  projectId: string;
  plugin: PluginId;
  layer?: CanvasLayer;
  tab?: WorkspaceInspectorTab;
}) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(buildWorkspaceHref(projectId, { plugin, layer, tab }));
  }, [layer, plugin, projectId, setLocation, tab]);

  return null;
}

function Router() {
  return (
    <Suspense fallback={<WorkspaceBootSkeleton />}>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/projects" component={HomeRedirect} />
        <Route path="/projects/:projectId/workspace" component={Workspace} />
        <Route path="/projects/:projectId/settings">
          {(params) => <ProjectRedirect projectId={params.projectId} />}
        </Route>

        <Route path="/projects/:projectId/overview">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="analytics" layer="map" tab="overview" />}
        </Route>
        <Route path="/projects/:projectId/events">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="analytics" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/sessions">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="analytics" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/sessions/:sessionId">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="analytics" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/funnels">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="funnels" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/funnels/:funnelId">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="funnels" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/experiments">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="experiments" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/experiments/:experimentId">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="experiments" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/metrics">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="revenue" layer="map" tab="overview" />}
        </Route>
        <Route path="/projects/:projectId/customers">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="revenue" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/revenue">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="revenue" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/engineering">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="engineering" layer="map" tab="overview" />}
        </Route>
        <Route path="/projects/:projectId/board">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="engineering" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/feature-flags">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="feature-flags" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/insights">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="insights" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/logs">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="observability" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/requests">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="observability" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/datastore">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="observability" layer="map" tab="data" />}
        </Route>
        <Route path="/projects/:projectId/dashboards">
          {(params) => <LegacyWorkspaceRedirect projectId={params.projectId} plugin="analytics" layer="map" tab="overview" />}
        </Route>

        <Route path="/projects/:projectId">
          {(params) => <ProjectRedirect projectId={params.projectId} />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
