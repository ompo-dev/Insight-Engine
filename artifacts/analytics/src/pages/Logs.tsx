import { useState } from "react";
import { useParams } from "wouter";
import { format, parseISO } from "date-fns";
import { Filter, Search, TerminalSquare } from "lucide-react";
import { useListLogs } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Logs() {
  const { projectId } = useParams<{ projectId: string }>();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");

  const queryParams = {
    search: search || undefined,
    level: level !== "all" ? (level as any) : undefined,
    limit: 100,
  };

  const { data: logsData, isLoading } = useListLogs(projectId!, queryParams);

  const getLevelColor = (entryLevel: string) => {
    switch (entryLevel) {
      case "error":
        return "text-red-500";
      case "warn":
        return "text-yellow-500";
      case "info":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
        <div className="flex shrink-0 items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <TerminalSquare className="h-6 w-6 text-muted-foreground" /> Logs do sistema
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar mensagem..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 rounded-lg pl-9 text-sm"
              />
            </div>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-9 w-[120px] rounded-lg text-sm">
                <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="warn">Aviso</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-zinc-950 font-mono text-sm shadow-inner">
          <div className="flex h-8 shrink-0 items-center gap-4 border-b border-zinc-800 bg-zinc-900 px-4">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs text-zinc-500">stdout</span>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="animate-pulse text-zinc-500">Aguardando logs...</div>
            ) : !logsData || logsData.entries.length === 0 ? (
              <div className="text-zinc-500">Nenhum log encontrado.</div>
            ) : (
              logsData.entries.map((log) => (
                <div
                  key={log.id}
                  className="group flex items-start gap-4 rounded px-2 py-0.5 transition-colors hover:bg-zinc-900/50"
                >
                  <span className="shrink-0 select-none text-zinc-500">
                    {format(parseISO(log.timestamp), "HH:mm:ss.SSS")}
                  </span>
                  <span className={`w-12 shrink-0 font-bold uppercase ${getLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="w-24 shrink-0 truncate text-zinc-400" title={log.service ?? undefined}>
                    [{log.service || "app"}]
                  </span>
                  <span className="break-all whitespace-pre-wrap text-zinc-200">
                    {log.message}
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <span className="ml-2 text-zinc-500 transition-colors group-hover:text-zinc-400">
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
