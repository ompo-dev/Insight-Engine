import { useParams } from "wouter";
import { ArrowUpCircle, ArrowDownCircle, RefreshCcw, CreditCard, ExternalLink } from "lucide-react";
import { useListRevenueEvents } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function Revenue() {
  const { projectId = "" } = useParams<{ projectId: string }>();

  const { data, isLoading } = useListRevenueEvents(projectId, { limit: 100 }, { query: { enabled: !!projectId } });

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'payment':
      case 'new_subscription':
      case 'upgrade':
        return { icon: ArrowUpCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", label: type === 'payment' ? 'Pagamento' : type === 'upgrade' ? 'Upgrade' : 'Nova Assin.' };
      case 'refund':
      case 'downgrade':
        return { icon: ArrowDownCircle, color: "text-rose-500", bg: "bg-rose-500/10", label: type === 'refund' ? 'Reembolso' : 'Downgrade' };
      case 'cancellation':
        return { icon: RefreshCcw, color: "text-amber-500", bg: "bg-amber-500/10", label: 'Cancelamento' };
      default:
        return { icon: CreditCard, color: "text-muted-foreground", bg: "bg-muted", label: type };
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Transações</h1>
        <p className="text-muted-foreground mt-1">Histórico completo de eventos financeiros (stripe, abacatepay, etc).</p>
      </div>

      <Card className="shadow-subtle overflow-hidden">
        <div className="p-4 border-b bg-muted/10">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">Todas</Badge>
            <Badge variant="outline" className="cursor-pointer">Pagamentos</Badge>
            <Badge variant="outline" className="cursor-pointer">Upgrades</Badge>
            <Badge variant="outline" className="cursor-pointer">Reembolsos</Badge>
            <Badge variant="outline" className="cursor-pointer">Cancelamentos</Badge>
          </div>
        </div>
        
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="hidden md:table-cell">Origem</TableHead>
              <TableHead className="text-right">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="w-8 h-8 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhuma transação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              data?.events.map((e) => {
                const style = getTypeStyle(e.type);
                const Icon = style.icon;
                const isNegative = ['refund', 'downgrade'].includes(e.type);
                
                return (
                  <TableRow key={e.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell>
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", style.bg)}>
                        <Icon className={cn("w-4 h-4", style.color)} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{e.customerEmail || "Anônimo"}</div>
                      <div className="text-xs text-muted-foreground">{e.description || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("bg-transparent", style.color, "border-current/20")}>
                        {style.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {e.plan ? <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{e.plan}</span> : "-"}
                    </TableCell>
                    <TableCell className={cn("text-right font-medium", isNegative ? "text-rose-500" : "text-foreground")}>
                      {isNegative ? "-" : "+"}{formatMoney(e.amount)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="capitalize text-xs font-normal text-muted-foreground">
                        {e.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm flex items-center justify-end gap-2">
                      {formatDate(e.timestamp)}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}
