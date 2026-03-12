import { useParams, Link } from "wouter";
import { useGetSession } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowLeft, User, Clock, Globe, MapPin, Activity } from "lucide-react";
import { format, parseISO, differenceInSeconds } from "date-fns";

export default function SessionDetail() {
  const { projectId, sessionId } = useParams<{ projectId: string, sessionId: string }>();
  const { data, isLoading } = useGetSession(projectId!, sessionId!);

  if (isLoading) return <AppLayout><div className="animate-pulse p-8">Loading session...</div></AppLayout>;
  if (!data) return <AppLayout><div className="p-8 text-center text-destructive">Session not found</div></AppLayout>;

  const { session, events } = data;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}/sessions`} className="p-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">Session {session.id.substring(0,8)}...</h1>
            <p className="text-muted-foreground text-sm">{format(parseISO(session.startedAt), 'MMMM d, yyyy - HH:mm:ss')}</p>
          </div>
        </div>

        {/* Meta info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="bg-card border border-border/50 rounded-xl p-4 shadow-subtle flex items-start gap-3">
             <User className="w-5 h-5 text-primary mt-0.5" />
             <div>
               <p className="text-xs text-muted-foreground font-medium uppercase">User</p>
               <p className="text-sm font-mono mt-1 truncate">{session.userId || session.anonymousId}</p>
             </div>
           </div>
           <div className="bg-card border border-border/50 rounded-xl p-4 shadow-subtle flex items-start gap-3">
             <Clock className="w-5 h-5 text-primary mt-0.5" />
             <div>
               <p className="text-xs text-muted-foreground font-medium uppercase">Duration</p>
               <p className="text-sm mt-1">{session.duration ? `${Math.floor(session.duration/60)}m ${session.duration%60}s` : 'Active'}</p>
             </div>
           </div>
           <div className="bg-card border border-border/50 rounded-xl p-4 shadow-subtle flex items-start gap-3">
             <Globe className="w-5 h-5 text-primary mt-0.5" />
             <div>
               <p className="text-xs text-muted-foreground font-medium uppercase">Browser</p>
               <p className="text-sm mt-1 truncate">{session.userAgent?.split('/')[0] || 'Unknown'}</p>
             </div>
           </div>
           <div className="bg-card border border-border/50 rounded-xl p-4 shadow-subtle flex items-start gap-3">
             <MapPin className="w-5 h-5 text-primary mt-0.5" />
             <div>
               <p className="text-xs text-muted-foreground font-medium uppercase">Location</p>
               <p className="text-sm mt-1">{session.country || 'Unknown'}</p>
             </div>
           </div>
        </div>

        {/* Event Timeline */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-subtle p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-muted-foreground" /> Event Timeline
          </h3>
          
          <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {events.map((event, index) => {
              const delay = index > 0 ? differenceInSeconds(parseISO(event.timestamp), parseISO(events[index-1].timestamp)) : 0;
              
              return (
                <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-4">
                  
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border/50 bg-background shadow-subtle group-hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-semibold text-foreground">{event.name}</span>
                      <span className="text-xs text-muted-foreground">{format(parseISO(event.timestamp), 'HH:mm:ss')}</span>
                    </div>
                    {event.url && <p className="text-xs text-muted-foreground truncate mt-2 pb-2 border-b border-border/30">URL: {event.url}</p>}
                    {event.properties && Object.keys(event.properties).length > 0 && (
                      <div className="mt-2 text-xs font-mono bg-muted/30 p-2 rounded text-muted-foreground break-all">
                        {JSON.stringify(event.properties)}
                      </div>
                    )}
                  </div>
                  
                  {/* Delay indicator shown between items in desktop view implicitly by spacing, but let's add a small badge */}
                  {delay > 5 && index > 0 && (
                     <div className="absolute top-0 left-5 md:left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                       <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full border border-border">+{delay}s</span>
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
