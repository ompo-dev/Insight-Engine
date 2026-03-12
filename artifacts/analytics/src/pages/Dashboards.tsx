import { useParams } from "wouter";
import { useListDashboards } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LayoutDashboard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function Dashboards() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: dashboards, isLoading } = useListDashboards(projectId!);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-muted-foreground" /> Custom Dashboards
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Build and share custom views of your metrics.</p>
          </div>
          <Button className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> New Dashboard
          </Button>
        </div>

        {isLoading ? (
          <div className="h-40 bg-card border border-border/50 rounded-2xl animate-pulse"></div>
        ) : !dashboards || dashboards.length === 0 ? (
          <EmptyState 
            icon={<LayoutDashboard className="w-6 h-6" />}
            title="No dashboards yet"
            description="Create custom dashboards with charts, tables, and funnels specific to your needs."
            action={<Button variant="outline">Build Dashboard</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {dashboards.map(dashboard => (
               <div key={dashboard.id} className="bg-card border border-border/50 rounded-2xl p-6 shadow-subtle hover:shadow-card transition-all cursor-pointer">
                 <h3 className="font-semibold text-lg">{dashboard.name}</h3>
                 <p className="text-sm text-muted-foreground mt-1">{dashboard.description || "No description"}</p>
                 <div className="mt-6 flex items-center gap-2">
                   <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[10px]">📊</div>
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 border-2 border-card flex items-center justify-center text-[10px]">📈</div>
                   </div>
                   <span className="text-xs text-muted-foreground font-medium">{dashboard.widgets.length} Widgets</span>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
