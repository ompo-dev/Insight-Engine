import type {
  Alert,
  AnalyticsOverview,
  DeliveryBoard,
  EngineeringImpactHighlight,
  EngineeringOverview,
  Experiment,
  GitHubRelease,
  RevenueMetrics,
} from "@/lib/data/types";
import { formatMoney, formatPercent } from "@/lib/utils";
import { type TeamPersonaId } from "./team-personas";

type PersonaCard = {
  label: string;
  value: string;
  description: string;
};

type PersonaNarrative = {
  title: string;
  summary: string;
  cards: PersonaCard[];
};

export function getOverviewPersonaNarrative(
  personaId: TeamPersonaId,
  input: {
    overview?: AnalyticsOverview | null;
    revenue?: RevenueMetrics | null;
    alerts?: Alert[] | null;
    experiments?: Experiment[] | null;
    engineering?: EngineeringOverview | null;
    board?: DeliveryBoard | null;
  },
): PersonaNarrative {
  const criticalAlerts = input.alerts?.filter((alert) => alert.severity === "critical").length ?? 0;
  const runningExperiments = input.experiments?.filter((experiment) => experiment.status === "running").length ?? 0;
  const releaseHealth = input.engineering?.summary.releaseHealthScore ?? 0;

  switch (personaId) {
    case "finance":
      return {
        title: "Leitura financeira do workspace",
        summary:
          "Sinais de produto, UX e operacao entram aqui como variacao de receita, previsibilidade e risco de caixa.",
        cards: [
          {
            label: "Receita recorrente",
            value: formatMoney(input.revenue?.mrr),
            description: "Valor base que qualquer queda de conversao ou incidente pode pressionar.",
          },
          {
            label: "Churn monitorado",
            value: formatPercent(input.revenue?.churnRate),
            description: "Referencia direta para risco de perda de base e necessidade de resposta rapida.",
          },
          {
            label: "Riscos ativos",
            value: criticalAlerts.toString(),
            description: "Alertas que podem virar perda de eficiencia comercial ou faturamento.",
          },
        ],
      };
    case "marketing":
      return {
        title: "Leitura de growth e aquisicao",
        summary:
          "O mesmo dado do produto vira eficiencia de jornada, captura de demanda e gargalo de conversao.",
        cards: [
          {
            label: "Sessoes",
            value: input.overview?.totalSessions.toLocaleString("pt-BR") ?? "0",
            description: "Base de volume recente para avaliar tracao e qualidade da aquisicao.",
          },
          {
            label: "Bounce rate",
            value: formatPercent(input.overview?.bounceRate),
            description: "Sinal de friccao de landing, copy ou promessa de campanha.",
          },
          {
            label: "Experimentos rodando",
            value: runningExperiments.toString(),
            description: "Quantidade de testes disponiveis para melhorar conversao e ativacao.",
          },
        ],
      };
    case "product":
      return {
        title: "Leitura de produto",
        summary:
          "Aqui importa onde o usuario avanca, trava ou abandona, e como isso vira decisao de roadmap.",
        cards: [
          {
            label: "Usuarios ativos",
            value: input.overview?.uniqueUsers.toLocaleString("pt-BR") ?? "0",
            description: "Base recente de uso para validar valor entregue e tracao.",
          },
          {
            label: "Evento lider",
            value: input.overview?.topEvents[0]?.name ?? "Sem leitura",
            description: "Comportamento mais recorrente no periodo atual.",
          },
          {
            label: "Experimentos",
            value: runningExperiments.toString(),
            description: "Pipeline atual de aprendizado validando hipoteses de produto.",
          },
        ],
      };
    case "design":
      return {
        title: "Leitura de UX e design",
        summary:
          "Metrica de uso precisa apontar clareza, copy, hierarquia e atrito real na interface.",
        cards: [
          {
            label: "Bounce rate",
            value: formatPercent(input.overview?.bounceRate),
            description: "Entrada direta para revisar friccao visual, copy ou promessa da tela.",
          },
          {
            label: "Pagina lider",
            value: input.overview?.topPages[0]?.url ?? "Sem leitura",
            description: "Onde vale observar comportamento e clareza da experiencia.",
          },
          {
            label: "Alertas de jornada",
            value: criticalAlerts.toString(),
            description: "Sinais que merecem revisao de fluxo, CTA ou arquitetura de conteudo.",
          },
        ],
      };
    case "engineering":
      return {
        title: "Leitura de engenharia",
        summary:
          "Produto e receita so importam aqui quando ligados a release, deploy, erro, observabilidade e throughput.",
        cards: [
          {
            label: "Saude de releases",
            value: `${releaseHealth}%`,
            description: "Resumo rapido da confianca recente de entrega.",
          },
          {
            label: "Issues abertas",
            value: (input.engineering?.summary.openIssues ?? 0).toString(),
            description: "Fila tecnica ativa puxando foco do time.",
          },
          {
            label: "Incidentes no board",
            value: (input.board?.summary.openIncidents ?? 0).toString(),
            description: "Entregas publicadas com necessidade de monitoramento proximo.",
          },
        ],
      };
    case "customer-success":
      return {
        title: "Leitura de Customer Success",
        summary:
          "Tudo aqui precisa responder quais contas podem sofrer, quais precisam de comunicacao e onde existe chance de retencao.",
        cards: [
          {
            label: "Clientes ativos",
            value: input.revenue?.activeCustomers.toLocaleString("pt-BR") ?? "0",
            description: "Base viva sujeita a risco ou expansao.",
          },
          {
            label: "Churn atual",
            value: formatPercent(input.revenue?.churnRate),
            description: "Indicador para priorizar contas sob risco e contatos proativos.",
          },
          {
            label: "Alertas criticos",
            value: criticalAlerts.toString(),
            description: "Eventos que podem gerar tickets, reclamacoes ou cancelamentos.",
          },
        ],
      };
    case "operations":
      return {
        title: "Leitura operacional",
        summary:
          "Os dados viram fila acionavel, incidentes abertos, saude do sistema e necessidade de resposta.",
        cards: [
          {
            label: "Saude de releases",
            value: `${releaseHealth}%`,
            description: "Temperatura operacional das ultimas entregas.",
          },
          {
            label: "Cards publicados",
            value: (input.board?.summary.releasedThisMonth ?? 0).toString(),
            description: "Volume recente de mudancas que podem exigir acompanhamento.",
          },
          {
            label: "Alertas criticos",
            value: criticalAlerts.toString(),
            description: "Sinais que merecem dono, triagem e follow-up.",
          },
        ],
      };
    default:
      return {
        title: "Leitura executiva do workspace",
        summary:
          "Os mesmos dados sao resumidos em crescimento, risco e capacidade de execucao para decisao da lideranca.",
        cards: [
          {
            label: "MRR",
            value: formatMoney(input.revenue?.mrr),
            description: "Sinal direto de resultado economico do produto.",
          },
          {
            label: "Usuarios ativos",
            value: input.overview?.uniqueUsers.toLocaleString("pt-BR") ?? "0",
            description: "Proxy rapido de tracao e uso real da plataforma.",
          },
          {
            label: "Saude de releases",
            value: `${releaseHealth}%`,
            description: "Capacidade do time de entregar sem degradar a operacao.",
          },
        ],
      };
  }
}

export function getEngineeringPersonaNarrative(
  personaId: TeamPersonaId,
  engineering: EngineeringOverview,
): PersonaNarrative {
  const positiveHighlights = engineering.highlights.filter((highlight) => highlight.tone === "positive").length;
  const negativeHighlights = engineering.highlights.filter((highlight) => highlight.tone === "negative").length;

  switch (personaId) {
    case "finance":
      return {
        title: "Como codigo vira impacto financeiro",
        summary:
          "Releases, bugs e PRs importam aqui quando afetam conversao, churn, risco comercial ou previsao de receita.",
        cards: [
          {
            label: "Leituras positivas",
            value: positiveHighlights.toString(),
            description: "Mudancas tecnicas com sinal favoravel em receita ou ativacao.",
          },
          {
            label: "Leituras negativas",
            value: negativeHighlights.toString(),
            description: "Riscos de release que podem virar perda de receita ou custo.",
          },
          {
            label: "Saude de release",
            value: `${engineering.summary.releaseHealthScore}%`,
            description: "Resumo do quanto o fluxo de entrega esta seguro para o caixa.",
          },
        ],
      };
    case "marketing":
      return {
        title: "Como codigo afeta growth",
        summary:
          "A leitura foca em mudancas que alteram tracking, landing pages, onboarding e eficiencia da jornada.",
        cards: [
          {
            label: "Deploys 30d",
            value: engineering.summary.deploysLast30d.toString(),
            description: "Volume recente de alteracoes com potencial de mexer na conversao.",
          },
          {
            label: "PRs abertas",
            value: engineering.summary.openPullRequests.toString(),
            description: "Mudancas ainda em voo que podem impactar campanhas e paginas-chave.",
          },
          {
            label: "Saude de release",
            value: `${engineering.summary.releaseHealthScore}%`,
            description: "Referencia para confiar ou nao nos resultados apos deploy.",
          },
        ],
      };
    case "product":
    case "design":
      return {
        title: "Como codigo altera experiencia do usuario",
        summary:
          "A leitura destaca entregas que mexem em onboarding, friccao, clareza e progressao do usuario na jornada.",
        cards: [
          {
            label: "Lead time medio",
            value: `${engineering.summary.averageLeadTimeHours.toFixed(1)}h`,
            description: "Velocidade com que hipoteses saem da fila e chegam ao usuario.",
          },
          {
            label: "Highlights positivos",
            value: positiveHighlights.toString(),
            description: "Mudancas com sinal de melhoria na experiencia ou na conversao.",
          },
          {
            label: "Highlights de risco",
            value: negativeHighlights.toString(),
            description: "Mudancas que pedem validacao de UX, copy ou rollout cuidadoso.",
          },
        ],
      };
    case "customer-success":
      return {
        title: "Como codigo afeta contas ativas",
        summary:
          "Importa principalmente o que pode gerar ticket, friccao de uso, cancelamento ou necessidade de contato proativo.",
        cards: [
          {
            label: "Issues abertas",
            value: engineering.summary.openIssues.toString(),
            description: "Fila de problemas que pode aparecer na ponta para clientes.",
          },
          {
            label: "Leituras negativas",
            value: negativeHighlights.toString(),
            description: "Mudancas com potencial de aumentar atrito em contas ativas.",
          },
          {
            label: "Deploys 30d",
            value: engineering.summary.deploysLast30d.toString(),
            description: "Contexto recente para explicar alteracoes de comportamento em clientes.",
          },
        ],
      };
    case "operations":
      return {
        title: "Leitura operacional de codigo e release",
        summary:
          "O foco fica em estabilidade, incidentes, fila ativa e necessidade de resposta rapida depois de cada entrega.",
        cards: [
          {
            label: "Saude de release",
            value: `${engineering.summary.releaseHealthScore}%`,
            description: "Indicador sintetico de confianca operacional das entregas.",
          },
          {
            label: "Branches ativas",
            value: engineering.summary.activeBranches.toString(),
            description: "Quantidade de frentes tecnicas potencialmente gerando variacao no ambiente.",
          },
          {
            label: "Issues abertas",
            value: engineering.summary.openIssues.toString(),
            description: "Fila operacional ainda exigindo triagem, dono ou follow-up.",
          },
        ],
      };
    default:
      return {
        title: "Leitura executiva de engineering",
        summary:
          "Codigo importa aqui quando acelera entrega, reduz risco e mostra impacto concreto em negocio e produto.",
        cards: [
          {
            label: "Deploys 30d",
            value: engineering.summary.deploysLast30d.toString(),
            description: "Capacidade recente de entrega em producao.",
          },
          {
            label: "Lead time medio",
            value: `${engineering.summary.averageLeadTimeHours.toFixed(1)}h`,
            description: "Velocidade entre decisao tecnica e valor entregue.",
          },
          {
            label: "Saude de release",
            value: `${engineering.summary.releaseHealthScore}%`,
            description: "Balanco entre velocidade e confianca operacional.",
          },
        ],
      };
  }
}

export function getPersonaHighlightSummary(personaId: TeamPersonaId, highlight: EngineeringImpactHighlight) {
  switch (personaId) {
    case "finance":
      return highlight.tone === "negative"
        ? "Trate como risco de receita, previsao ou eficiencia comercial."
        : "Use como sinal de ganho em conversao, monetizacao ou retencao.";
    case "marketing":
      return "Leia isso como variacao de jornada, campanha, landing page ou ativacao.";
    case "product":
      return "Leia isso como evidencia para priorizacao de produto e proxima iteracao.";
    case "design":
      return "Leia isso como pista de friccao de UX, copy ou clareza visual.";
    case "customer-success":
      return "Use isso para antecipar risco de conta, ticket ou necessidade de comunicacao.";
    case "operations":
      return "Use isso para triagem, follow-up e definicao de dono operacional.";
    default:
      return "Use isso para conectar entrega tecnica ao resultado do negocio.";
  }
}

export function getPersonaReleaseSummary(personaId: TeamPersonaId, release: GitHubRelease) {
  switch (personaId) {
    case "finance":
      return "Observe como a release mexe em receita, risco e confianca do caixa.";
    case "marketing":
      return "Valide rapidamente se a release alterou tracking, LP ou jornada de aquisicao.";
    case "product":
      return "Conecte a release com ativacao, conversao e retencao do usuario.";
    case "design":
      return "Confirme se houve mudanca sensivel em fluxo, copy ou interface apos o deploy.";
    case "customer-success":
      return "Considere impacto imediato em contas ativas, tickets e comunicacao proativa.";
    case "operations":
      return `Status ${release.status}: trate como referencia para follow-up, rollback ou estabilizacao.`;
    default:
      return "Leia a release como decisao de negocio: ganho, risco ou aprendizado.";
  }
}
