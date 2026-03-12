import { useParams, Link } from "wouter";
import { useListSessions } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Users, Clock, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function Sessions() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: sessionData, isLoading } = useListSessions(projectId!, { limit: 50 });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Sessions</h1>
          <p className="text-muted-foreground text-sm">Track user journeys and session replays.</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-subtle overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading sessions...</div>
          ) : !sessionData || sessionData.sessions.length === 0 ? (
            <EmptyState 
              icon={<Users className="w-6 h-6" />}
              title="No sessions recorded"
              description="Once users visit your site and trigger events, their sessions will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Started At</th>
                    <th className="px-6 py-4 font-medium">Duration</th>
                    <th className="px-6 py-4 font-medium">Events</th>
                    <th className="px-6 py-4 font-medium">Entry Page</th>
                    <th className="px-6 py-4 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sessionData.sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {(session.userId || session.anonymousId || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-mono text-xs text-muted-foreground truncate w-24">
                            {session.userId || session.anonymousId}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-foreground">
                        {format(parseISO(session.startedAt), 'MMM d, HH:mm')}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDuration(session.duration)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-muted px-2 py-1 rounded text-xs font-medium">{session.eventCount}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground truncate max-w-[200px]">
                        {session.entryPage || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/projects/${projectId}/sessions/${session.id}`} className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors opacity-0 group-hover:opacity-100">
                          View Details <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
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
