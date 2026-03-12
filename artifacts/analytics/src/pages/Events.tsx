import { useState } from "react";
import { useParams } from "wouter";
import { useListEvents } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Search, Activity } from "lucide-react";
import { format, parseISO } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";

export default function Events() {
  const { projectId } = useParams<{ projectId: string }>();
  const [search, setSearch] = useState("");
  
  const { data: eventsData, isLoading } = useListEvents(projectId!, { eventName: search || undefined, limit: 100 });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Live Events</h1>
            <p className="text-muted-foreground text-sm">Stream of all events ingested into this project.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by event name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl bg-background"
            />
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-subtle overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading events stream...</div>
          ) : !eventsData || eventsData.events.length === 0 ? (
            <EmptyState 
              icon={<Activity className="w-6 h-6" />}
              title="No events found"
              description="We haven't received any events matching your criteria."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">Timestamp</th>
                    <th className="px-6 py-4 font-medium">Event Name</th>
                    <th className="px-6 py-4 font-medium">User ID / Anon ID</th>
                    <th className="px-6 py-4 font-medium">Properties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {eventsData.events.map((event) => (
                    <tr key={event.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {format(parseISO(event.timestamp), 'MMM d, HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-foreground">
                        {event.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {event.userId || event.anonymousId || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[300px] truncate text-xs font-mono bg-muted/50 p-1.5 rounded border border-border/50">
                          {JSON.stringify(event.properties || {})}
                        </div>
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
