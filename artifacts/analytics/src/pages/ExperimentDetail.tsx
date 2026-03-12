import { useParams, Link } from "wouter";
import { useGetExperiment, useUpdateExperiment } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowLeft, Play, Pause, FlaskConical, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ExperimentDetail() {
  const { projectId, experimentId } = useParams<{ projectId: string, experimentId: string }>();
  const { data: expDetail, isLoading, refetch } = useGetExperiment(projectId!, experimentId!);
  const updateMutation = useUpdateExperiment();
  const { toast } = useToast();

  if (isLoading) return <AppLayout><div className="animate-pulse p-8">Loading experiment...</div></AppLayout>;
  if (!expDetail) return <AppLayout><div className="p-8">Experiment not found</div></AppLayout>;

  const { experiment, results, confidence, winner } = expDetail;

  const toggleStatus = async () => {
    const newStatus = experiment.status === 'running' ? 'paused' : 'running';
    try {
      await updateMutation.mutateAsync({
        projectId: projectId!,
        experimentId: experimentId!,
        data: { status: newStatus }
      });
      toast({ title: `Experiment ${newStatus}` });
      refetch();
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${projectId}/experiments`} className="p-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{experiment.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider border ${
                  experiment.status === 'running' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                  experiment.status === 'completed' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                  'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                }`}>
                  {experiment.status}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1">{experiment.hypothesis}</p>
            </div>
          </div>
          
          <Button 
            onClick={toggleStatus} 
            variant={experiment.status === 'running' ? 'outline' : 'default'}
            className="gap-2 rounded-xl"
            disabled={experiment.status === 'completed'}
          >
            {experiment.status === 'running' ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-subtle">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm font-medium uppercase tracking-wider">
              <UsersIcon className="w-4 h-4" /> Total Participants
            </div>
            <p className="text-3xl font-bold text-foreground">{expDetail.totalParticipants.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-subtle">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm font-medium uppercase tracking-wider">
              <FlaskConical className="w-4 h-4" /> Statistical Confidence
            </div>
            <p className="text-3xl font-bold text-foreground">
               {confidence ? `${(confidence * 100).toFixed(1)}%` : 'Need more data'}
            </p>
          </div>
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-subtle bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center gap-2 mb-2 text-primary text-sm font-medium uppercase tracking-wider">
              <BarChart2 className="w-4 h-4" /> Winning Variant
            </div>
            <p className="text-3xl font-bold text-foreground">{winner || 'Inconclusive'}</p>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-subtle overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h3 className="text-lg font-semibold">Variant Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Variant</th>
                  <th className="px-6 py-4 font-medium">Participants</th>
                  <th className="px-6 py-4 font-medium">Conversions</th>
                  <th className="px-6 py-4 font-medium">Conversion Rate</th>
                  <th className="px-6 py-4 font-medium">Uplift vs Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {results.map((res) => {
                  const isControl = experiment.variants.find(v => v.id === res.variantId)?.isControl;
                  return (
                    <tr key={res.variantId} className={`hover:bg-muted/20 transition-colors ${res.isSignificant ? 'bg-green-500/5' : ''}`}>
                      <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                        {res.variantName}
                        {isControl && <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase tracking-wider">Control</span>}
                        {res.isSignificant && <span className="text-[10px] bg-green-500/20 text-green-700 px-2 py-0.5 rounded uppercase tracking-wider border border-green-500/30">Winner</span>}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{res.participants.toLocaleString()}</td>
                      <td className="px-6 py-4 text-muted-foreground">{res.conversions.toLocaleString()}</td>
                      <td className="px-6 py-4 font-mono font-medium text-foreground">
                        {(res.conversionRate * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4">
                        {isControl ? (
                          <span className="text-muted-foreground">-</span>
                        ) : res.uplift !== undefined ? (
                          <span className={`font-mono font-medium ${res.uplift > 0 ? 'text-green-500' : res.uplift < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {res.uplift > 0 ? '+' : ''}{(res.uplift * 100).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function UsersIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
