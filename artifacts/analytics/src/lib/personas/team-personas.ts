export type TeamPersonaId =
  | "executive"
  | "finance"
  | "marketing"
  | "product"
  | "design"
  | "engineering"
  | "customer-success"
  | "operations";

export interface TeamPersonaDefinition {
  id: TeamPersonaId;
  label: string;
  shortLabel: string;
  summary: string;
  interpretation: string;
  primaryMetrics: string[];
  decisionFrame: string[];
  recommendedGroups: Array<"Produto" | "Receita" | "Experimentos" | "Operacao" | "Engineering">;
}

export interface SpecialistAgentDefinition {
  id: string;
  name: string;
  ownerRole: TeamPersonaId;
  mode: "coworker" | "autonomous";
  summary: string;
  scopes: string[];
}

export const defaultTeamPersonaId: TeamPersonaId = "executive";

export const teamPersonaDefinitions: TeamPersonaDefinition[] = [
  {
    id: "executive",
    label: "Founder / Lideranca",
    shortLabel: "Exec",
    summary: "Leitura de crescimento, risco e execucao para tomada de decisao global.",
    interpretation: "Traduz sinais de produto, receita e engenharia para prioridade de negocio.",
    primaryMetrics: ["MRR", "usuarios ativos", "saude de releases", "ritmo de entrega"],
    decisionFrame: [
      "Onde esta o maior risco para meta e crescimento",
      "O que mudou no produto ou no codigo antes do resultado",
      "Qual frente precisa de decisao ou alocacao agora",
    ],
    recommendedGroups: ["Receita", "Produto", "Engineering", "Operacao"],
  },
  {
    id: "finance",
    label: "Financeiro",
    shortLabel: "Fin",
    summary: "Enxerga produto e marketing como drivers de receita, churn e previsibilidade.",
    interpretation: "Cada variacao de conversao, friccao ou erro precisa virar leitura de caixa, MRR e risco comercial.",
    primaryMetrics: ["MRR", "ARR", "churn", "ARPU", "clientes ativos"],
    decisionFrame: [
      "O que esta reduzindo ou ampliando receita",
      "Qual queda operacional pode bater em caixa",
      "Onde vale priorizar correcoes por impacto financeiro",
    ],
    recommendedGroups: ["Receita", "Produto", "Operacao"],
  },
  {
    id: "marketing",
    label: "Marketing / Growth",
    shortLabel: "Growth",
    summary: "Relaciona trafego, eventos e jornada com captacao, ativacao e eficiencia de campanha.",
    interpretation: "Mudancas em UX, copy, tracking e deploy precisam ser lidas como impacto em demanda e conversao.",
    primaryMetrics: ["sessoes", "top paginas", "eventos chave", "conversao", "experimentos"],
    decisionFrame: [
      "Onde a aquisicao perde eficiencia",
      "Que etapa da jornada caiu apos alguma mudanca",
      "Que experimento ou landing merece iteracao imediata",
    ],
    recommendedGroups: ["Produto", "Experimentos", "Receita"],
  },
  {
    id: "product",
    label: "Produto",
    shortLabel: "PM",
    summary: "Leitura de ativacao, engajamento, friccao e valor entregue.",
    interpretation: "Cruza comportamento do usuario com receita e entrega tecnica para priorizar roadmap.",
    primaryMetrics: ["usuarios", "eventos", "funis", "experimentos", "feedback operacional"],
    decisionFrame: [
      "Onde usuarios travam ou abandonam",
      "O que aumentou ativacao, uso ou retencao",
      "Qual entrega deve entrar na frente do roadmap",
    ],
    recommendedGroups: ["Produto", "Experimentos", "Engineering", "Operacao"],
  },
  {
    id: "design",
    label: "Design / UX",
    shortLabel: "UX",
    summary: "Observa clareza da interface, copy e fluxo por sinais de uso, abandono e conversao.",
    interpretation: "Metrica de produto precisa virar pista de friccao visual, hierarquia ruim ou mensagem errada.",
    primaryMetrics: ["bounce rate", "top paginas", "eventos de CTA", "tempo por pagina", "alertas de jornada"],
    decisionFrame: [
      "Qual trecho da experiencia esta confuso",
      "Onde a copy ou a hierarquia visual falham",
      "O que deve ser redesenhado antes de escalar trafego",
    ],
    recommendedGroups: ["Produto", "Experimentos", "Receita"],
  },
  {
    id: "engineering",
    label: "Engineering",
    shortLabel: "Eng",
    summary: "Leitura de codigo, entrega, estabilidade e impacto posterior no produto.",
    interpretation: "Cada release, PR e incidente precisa ser correlacionado com resultado real e risco tecnico.",
    primaryMetrics: ["lead time", "saude de releases", "issues", "logs", "requests"],
    decisionFrame: [
      "Qual mudanca introduziu ganho ou regressao",
      "Onde a operacao degrada a experiencia do usuario",
      "Qual entrega precisa de rollback, hotfix ou rollout",
    ],
    recommendedGroups: ["Engineering", "Operacao", "Produto"],
  },
  {
    id: "customer-success",
    label: "Customer Success",
    shortLabel: "CS",
    summary: "Traduz incidentes e comportamento do produto em risco de contas, suporte e expansao.",
    interpretation: "Sinais de uso e erro precisam apontar contas em risco, atrito na jornada e oportunidade de retencao.",
    primaryMetrics: ["clientes ativos", "churn", "alertas criticos", "feature adoption"],
    decisionFrame: [
      "Que contas estao sob risco",
      "Que problema exige comunicacao proativa",
      "Onde existe chance de retencao ou expansao",
    ],
    recommendedGroups: ["Receita", "Produto", "Operacao"],
  },
  {
    id: "operations",
    label: "Operacoes",
    shortLabel: "Ops",
    summary: "Leitura de estabilidade, SLA, filas de acao e continuidade operacional.",
    interpretation: "Tudo precisa virar risco de operacao, backlog acionavel e prevencao de incidente.",
    primaryMetrics: ["logs", "requisicoes", "board", "incidentes", "saude de release"],
    decisionFrame: [
      "Onde ha degradacao operacional agora",
      "O que precisa de dono e follow-up imediato",
      "Que area do sistema exige vigilancia reforcada",
    ],
    recommendedGroups: ["Operacao", "Engineering", "Receita"],
  },
];

export const teamPersonaMap = Object.fromEntries(
  teamPersonaDefinitions.map((persona) => [persona.id, persona]),
) as Record<TeamPersonaId, TeamPersonaDefinition>;

export const specialistAgentDefinitions: SpecialistAgentDefinition[] = [
  {
    id: "agent_finops",
    name: "FinOps Analyst",
    ownerRole: "finance",
    mode: "coworker",
    summary: "Traduz variacao de produto e funil em impacto de receita, churn e previsao.",
    scopes: ["MRR", "churn", "pricing", "cash risk"],
  },
  {
    id: "agent_growth",
    name: "Growth Analyst",
    ownerRole: "marketing",
    mode: "coworker",
    summary: "Monitora aquisicao, ativacao e experimentos de conversao.",
    scopes: ["landing pages", "campaign efficiency", "CTA drop", "activation"],
  },
  {
    id: "agent_product",
    name: "Product Strategist",
    ownerRole: "product",
    mode: "coworker",
    summary: "Resume friccoes da jornada e recomenda prioridade de roadmap.",
    scopes: ["funnels", "engagement", "retention", "feature usage"],
  },
  {
    id: "agent_ux",
    name: "UX Reviewer",
    ownerRole: "design",
    mode: "coworker",
    summary: "Transforma sinais de uso em hipoteses de layout, copy e clareza visual.",
    scopes: ["page friction", "CTA clarity", "copy", "navigation"],
  },
  {
    id: "agent_release",
    name: "Release Guard",
    ownerRole: "engineering",
    mode: "autonomous",
    summary: "Correlaciona PRs, releases, incidentes e metricas de estabilidade.",
    scopes: ["deploys", "lead time", "rollback risk", "incident detection"],
  },
  {
    id: "agent_cs",
    name: "Account Sentinel",
    ownerRole: "customer-success",
    mode: "coworker",
    summary: "Aponta contas sob risco e eventos que exigem contato humano.",
    scopes: ["account health", "risk accounts", "support spikes", "expansion"],
  },
  {
    id: "agent_ops",
    name: "Ops Dispatcher",
    ownerRole: "operations",
    mode: "autonomous",
    summary: "Organiza filas operacionais, incidentes e prioridades de resposta.",
    scopes: ["logs", "requests", "alerts", "runbooks"],
  },
];
