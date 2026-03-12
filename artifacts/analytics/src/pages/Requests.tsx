import { useParams } from "wouter";
import { useListRequests } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowLeftRight, Clock, ServerCrash } from "lucide-react";
import { format, parseISO } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";

export default function Requests() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: requestsData, isLoading } = useListRequests(projectId!, { limit: 100 });

  const getMethodColor = (method: string) => {
    switch(method.toUpperCase()) {
      case 'GET': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'POST': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'PUT':
      case 'PATCH': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'DELETE': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-green-500 font-medium';
    if (code >= 300 && code < 400) return 'text-blue-500 font-medium';
    if (code >= 400 && code < 500) return 'text-yellow-600 font-medium';
    if (code >= 500) return 'text-red-500 font-bold';
    return 'text-foreground';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-muted-foreground" /> HTTP Requests
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor API endpoints, latencies, and errors.</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-subtle overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading request traces...</div>
          ) : !requestsData || requestsData.requests.length === 0 ? (
            <EmptyState 
              icon={<ServerCrash className="w-6 h-6" />}
              title="No requests logged"
              description="Configure the SDK to monitor your application's incoming and outgoing HTTP requests."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">Timestamp</th>
                    <th className="px-6 py-4 font-medium">Method</th>
                    <th className="px-6 py-4 font-medium">URL Path</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {requestsData.requests.map((req) => (
                    <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-xs font-mono">
                        {format(parseISO(req.timestamp), 'MMM d, HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${getMethodColor(req.method)}`}>
                          {req.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-foreground max-w-md truncate" title={req.url}>
                        {req.url}
                      </td>
                      <td className={`px-6 py-4 font-mono ${getStatusColor(req.statusCode)}`}>
                        {req.statusCode}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground/50" />
                        {req.duration}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
