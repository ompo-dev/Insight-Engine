import { useParams } from "wouter";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity, 
  Target,
  ArrowUpRight,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell
} from "recharts";
import { useGetRevenueMetrics, useGetRevenueTimeline, useGetRevenuePlans } from "@/lib/data/hooks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatMoney, formatNumber, formatPercent, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function SaaSMetrics() {
  const { projectId = "" } = useParams<{ projectId: string }>();

  const { data: metrics, isLoading: metricsLoading } = useGetRevenueMetrics(projectId, undefined, { query: { enabled: !!projectId } });
  const { data: timeline, isLoading: timelineLoading } = useGetRevenueTimeline(projectId, undefined, { query: { enabled: !!projectId } });
  const { data: plans, isLoading: plansLoading } = useGetRevenuePlans(projectId, { query: { enabled: !!projectId } });

  const COLORS = ['hsl(var(--primary))', 'hsl(210, 100%, 50%)', 'hsl(150, 100%, 40%)', 'hsl(280, 80%, 60%)', 'hsl(30, 100%, 60%)'];

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          Métricas SaaS
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2 py-0.5">Visão Principal</Badge>
        </h1>
        <p className="text-muted-foreground mt-1">Acompanhe a saúde financeira e o crescimento do seu micro-SaaS.</p>
      </div>

      {/* Hero Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {[
          { 
            title: "MRR", 
            value: formatMoney(metrics?.mrr), 
            change: metrics?.mrrGrowth, 
            icon: DollarSign,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
          },
          { 
            title: "ARR", 
            value: formatMoney(metrics?.arr), 
            icon: TrendingUp,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
          },
          { 
            title: "Churn Rate", 
            value: formatPercent(metrics?.churnRate), 
            benchmark: metrics?.benchmarks?.avgChurnRate,
            inverse: true, // lower is better
            icon: Activity,
            color: "text-rose-500",
            bg: "bg-rose-500/10"
          },
          { 
            title: "LTV", 
            value: formatMoney(metrics?.ltv), 
            icon: Target,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10"
          },
          { 
            title: "ARPU", 
            value: formatMoney(metrics?.arpu), 
            benchmark: metrics?.benchmarks?.avgArpu,
            icon: Users,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
          },
          { 
            title: "Clientes Ativos", 
            value: formatNumber(metrics?.activeCustomers), 
            change: ((metrics?.newCustomers || 0) - (metrics?.churnedCustomers || 0)) / Math.max(1, metrics?.activeCustomers || 1),
            icon: Users,
            color: "text-amber-500",
            bg: "bg-amber-500/10"
          },
        ].map((m, i) => (
          <Card key={i} className="shadow-subtle hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{m.title}</p>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", m.bg)}>
                  <m.icon className={cn("w-4 h-4", m.color)} />
                </div>
              </div>
              {metricsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">{m.value}</h3>
                  
                  {m.change !== undefined && (
                    <div className="flex items-center gap-1 mt-2">
                      {m.change >= 0 ? (
                        <ArrowUpRight className={cn("w-3.5 h-3.5", m.inverse ? "text-rose-500" : "text-emerald-500")} />
                      ) : (
                        <TrendingDown className={cn("w-3.5 h-3.5", m.inverse ? "text-emerald-500" : "text-rose-500")} />
                      )}
                      <span className={cn("text-xs font-medium", 
                        m.change >= 0 
                          ? (m.inverse ? "text-rose-500" : "text-emerald-500") 
                          : (m.inverse ? "text-emerald-500" : "text-rose-500")
                      )}>
                        {Math.abs(m.change * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">vs mês ant.</span>
                    </div>
                  )}

                  {m.benchmark !== undefined && m.change === undefined && (
                    <div className="flex items-center gap-1 mt-2 text-xs">
                      <span className="text-muted-foreground">Média SaaS:</span>
                      <span className="font-medium">{typeof m.value === 'string' && m.value.includes('R$') ? formatMoney(m.benchmark) : formatPercent(m.benchmark)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* MRR Timeline Chart */}
        <Card className="lg:col-span-2 shadow-subtle border-border/50 overflow-hidden flex flex-col">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Crescimento do MRR</CardTitle>
                <CardDescription>Receita recorrente ao longo do tempo (Net MRR)</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Novo</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary"/> Expansão</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"/> Churn</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 min-h-[350px]">
            {timelineLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline?.data || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-floating)' }}
                    formatter={(value: number) => [formatMoney(value), ""]}
                  />
                  <Area type="monotone" dataKey="newMrr" name="Novo MRR" stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#colorNew)" />
                  <Area type="monotone" dataKey="expansionMrr" name="Expansão" stackId="1" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorExp)" />
                  <Area type="monotone" dataKey="churnedMrr" name="Churn" stackId="2" stroke="#f43f5e" strokeWidth={2} fill="transparent" />
                  <Area type="monotone" dataKey="mrr" name="Total MRR" stroke="hsl(var(--foreground))" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Plans Distribution */}
        <Card className="shadow-subtle border-border/50 flex flex-col">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle>Receita por Plano</CardTitle>
            <CardDescription>Distribuição de MRR e clientes</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1">
            {plansLoading ? (
              <Skeleton className="w-full h-full min-h-[250px]" />
            ) : plans?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                Nenhum dado de planos
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="h-[200px] mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={plans} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="plan" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }} width={80} />
                      <Tooltip 
                        cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => formatMoney(value)}
                      />
                      <Bar dataKey="mrr" radius={[0, 4, 4, 0]} barSize={24}>
                        {plans?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-3 mt-auto">
                  {plans?.map((p, i) => (
                    <div key={p.plan} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium">{p.plan}</span>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{p.customers} cl.</span>
                        <span className="font-medium text-foreground">{formatMoney(p.mrr)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10 shadow-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Insights do seu SaaS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-background border shadow-sm">
                <h4 className="font-semibold text-sm mb-1 text-foreground">Taxa de Churn Saudável</h4>
                <p className="text-sm text-muted-foreground">
                  Seu churn de <strong className="text-foreground">{formatPercent(metrics?.churnRate)}</strong> está excelente! 
                  A média para micro-SaaS B2B no Brasil é de <strong>{formatPercent(metrics?.benchmarks?.avgChurnRate)}</strong>. Continue o bom trabalho de retenção.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background border shadow-sm">
                <h4 className="font-semibold text-sm mb-1 text-foreground">Oportunidade de ARPU</h4>
                <p className="text-sm text-muted-foreground">
                  Seu ARPU atual é de <strong className="text-foreground">{formatMoney(metrics?.arpu)}</strong>. 
                  Com a expansão de MRR observada recentemente, você pode considerar reestruturar os planos ou oferecer add-ons para aumentar a receita por cliente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle>Retenção da Receita (NDR)</CardTitle>
            <CardDescription>Net Dollar Retention</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center flex-col min-h-[200px]">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="hsl(var(--muted))" strokeWidth="12" fill="none" />
                <circle 
                  cx="96" cy="96" r="80" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="12" fill="none" 
                  strokeDasharray="502" 
                  strokeDashoffset={502 - (502 * (metrics?.netRevenueRetention || 1.05))} 
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tracking-tighter">
                  {formatPercent((metrics?.netRevenueRetention || 1.05) - 1)}
                </span>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">NDR</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4 max-w-xs">
              Valores acima de 100% indicam que o crescimento da base atual supera os cancelamentos.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
