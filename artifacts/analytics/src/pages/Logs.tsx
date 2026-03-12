import { useState } from "react";
import { useParams } from "wouter";
import { useListLogs } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TerminalSquare, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";

export default function Logs() {
  const { projectId } = useParams<{ projectId: string }>();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");
  
  const queryParams = { 
    search: search || undefined, 
    level: level !== "all" ? level as any : undefined,
    limit: 100 
  };
  
  const { data: logsData, isLoading } = useListLogs(projectId!, queryParams);

  const getLevelColor = (l: string) => {
    switch(l) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <TerminalSquare className="w-6 h-6 text-muted-foreground" /> System Logs
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search messages..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm rounded-lg"
              />
            </div>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-[120px] h-9 text-sm rounded-lg">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 bg-zinc-950 dark:bg-zinc-950 rounded-xl border border-border shadow-inner overflow-hidden flex flex-col font-mono text-sm relative">
          <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-4 shrink-0">
             <div className="flex gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
             </div>
             <span className="text-zinc-500 text-xs">stdout</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {isLoading ? (
              <div className="text-zinc-500 animate-pulse">Waiting for logs...</div>
            ) : !logsData || logsData.entries.length === 0 ? (
              <div className="text-zinc-500">No logs found.</div>
            ) : (
              logsData.entries.map((log) => (
                <div key={log.id} className="flex items-start gap-4 hover:bg-zinc-900/50 px-2 py-0.5 rounded transition-colors group">
                  <span className="text-zinc-500 shrink-0 select-none">
                    {format(parseISO(log.timestamp), 'HH:mm:ss.SSS')}
                  </span>
                  <span className={`uppercase font-bold w-12 shrink-0 ${getLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-zinc-400 shrink-0 w-24 truncate" title={log.service}>
                    [{log.service || 'app'}]
                  </span>
                  <span className="text-zinc-200 whitespace-pre-wrap break-all">
                    {log.message}
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <span className="text-zinc-500 ml-2 group-hover:text-zinc-400 transition-colors">
                        {JSON.stringify(log.meta)}
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
