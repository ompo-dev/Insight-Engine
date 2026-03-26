# Analise do Projeto Insight Engine / Lynx Workspace

Este documento foi inferido a partir do codigo atual do repositorio. Ele consolida a visao de produto, regras de negocio, fluxos, linguagem visual e propostas implicitas no sistema.

## 1. O que o projeto e

O projeto implementa um produto de analise operacional para SaaS, com foco em juntar:

- telemetria de produto;
- receita e clientes;
- experimentos e feature flags;
- observabilidade;
- engenharia e impacto de releases;
- automacao e agentes de IA;
- leitura contextual por persona de negocio.

Na pratica, ele nao se comporta como um dashboard tradicional com paginas isoladas. O conceito central do produto e um **workspace visual**, onde plugins, metricas, datasets, views e nos customizados podem ser conectados em um canvas unico.

O sistema usa com frequencia a marca `Lynx` no frontend, no runtime de telemetria e nos snippets de SDK. O nome `Insight Engine` parece representar o repositorio ou a iniciativa, enquanto `Lynx Workspace` e a identidade mais forte do produto no codigo atual.

## 2. Idealizacao do produto

### 2.1 Tese principal

A tese do produto e que times de SaaS perdem contexto quando produto, receita, engenharia e operacao vivem em ferramentas separadas. O projeto tenta resolver isso unificando:

- captura de dados;
- modelagem de metricas e datasets;
- publicacao de views;
- leitura executiva;
- correlacao tecnica com deploys, PRs e incidentes;
- acoes automatizadas e agentes especializados.

### 2.2 Diferencial conceitual

O diferencial nao e apenas "mostrar numeros", mas permitir:

- montar blocos de entrada, transformacao, exibicao e acao no mesmo workspace;
- interpretar o mesmo projeto por cargos diferentes;
- correlacionar impacto de codigo com resultado de negocio;
- transformar dados brutos em nos acionaveis;
- evoluir de dashboards rigidos para uma operacao node-first.

### 2.3 Publico-alvo implicito

Os seeds e as copys indicam foco em:

- micro-SaaS;
- SaaS B2B;
- times pequenos ou hibridos;
- fundadores;
- growth;
- produto;
- engenharia;
- operacoes;
- customer success;
- financeiro.

## 3. Proposta de valor

O produto entrega uma promessa clara:

1. Criar um projeto rapidamente.
2. Conectar ingestao via SDK ou tracking manual.
3. Transformar entradas em metricas, listas e views.
4. Publicar tudo num canvas operacional unico.
5. Ler o mesmo estado do negocio por diferentes personas.
6. Usar automacoes, alerts e agentes para reduzir friccao operacional.

Em outras palavras, a plataforma quer ser um **Workspace OS para SaaS**, ligando dados, decisao e execucao.

## 4. Entidades centrais do dominio

### 4.1 Projeto

Cada projeto representa um produto SaaS monitorado e possui:

- nome, slug e website;
- API key;
- contadores de eventos, sessoes e clientes;
- MRR;
- configuracoes de ingestao e operacao;
- dados de analytics, receita, engenharia, observabilidade e telemetria modelada.

### 4.2 Camada de telemetria

O dominio de telemetria e o nucleo mais importante do sistema:

- **Collections**: entradas tipadas de dados, com schema, identity keys e timestamp field.
- **Metrics**: valores calculados por DSL.
- **Models**: datasets derivados por DSL.
- **Views**: superficies publicadas no canvas, derivadas de metricas, models ou collections.
- **Custom nodes**: nos criados no workspace que podem receber, transformar, mostrar e agir.

### 4.3 Plugins do workspace

O canvas organiza o sistema em plugins macro:

- Analytics
- Funnels
- Experiments
- Feature Flags
- Revenue
- Engineering
- Observability
- Insights
- Agents

Esses plugins funcionam como pontos de ancoragem do contexto. Eles resumem uma disciplina e se conectam por edges predefinidas.

### 4.4 Personas

O mesmo projeto pode ser lido pelas seguintes personas:

- Founder / Lideranca
- Financeiro
- Marketing / Growth
- Produto
- Design / UX
- Engineering
- Customer Success
- Operacoes

Cada persona muda:

- o enquadramento da narrativa;
- as metricas prioritarias;
- os grupos recomendados;
- o preset inicial do workspace;
- a interpretacao do que e mais urgente.

### 4.5 Agentes

O produto ja pressupoe agentes de IA especialistas por area, como:

- FinOps Analyst
- Growth Analyst
- Product Strategist
- UX Reviewer
- Release Guard
- Account Sentinel
- Ops Dispatcher

Eles aparecem como camada de apoio ou autonomia operacional, nao apenas como chatbot generico.

## 5. Regras de negocio extraidas

## 5.1 Onboarding e projeto

- Um projeto sempre nasce com nome obrigatorio.
- Ao criar o projeto, o usuario escolhe o proximo passo:
  - setup SDK;
  - tracking manual;
  - ir direto ao canvas.
- Se o projeto ainda nao tem eventos, a proxima acao recomendada e instalar a SDK.
- Se o projeto ja tem eventos, a proxima acao recomendada e abrir o canvas.

## 5.2 Telemetria

- Toda collection possui schema estrito.
- Payloads podem ser validados antes da ingestao.
- Campos fora do schema geram erro.
- Tipos invalidos geram erro.
- Campos obrigatorios ausentes geram erro.
- A ingestao retorna quantidade aceita, rejeitada, ids gerados e erros detalhados.
- Cada collection pode gerar snippets de integracao em Bun, Browser, React e cURL.

## 5.3 Modelagem analitica

- Metrics e Models sao descritos por uma DSL declarativa.
- A DSL suporta pelo menos:
  - `source`
  - `window`
  - `filter`
  - `aggregate`
  - `select`
  - `math`
  - `compare`
  - `forecastSimple`
- Views publicam uma leitura visual sobre uma source modelada.
- As apresentacoes suportadas incluem:
  - `stat`
  - `table`
  - `line`
  - `comparison`

## 5.4 Custom nodes

Um no customizado pode ter quatro capacidades independentes:

- **receive**: receber payload tipado;
- **transform**: executar expressao segura;
- **display**: virar card, grafico, tabela, comparativo ou texto;
- **action**: disparar webhook, export, integracao ou trigger de IA.

Regras implicitas:

- se nao recebe, nao calcula e nao mostra nada, o no fica em draft;
- expressoes com erro colocam o no em attention;
- referencias circulares entre nos customizados sao tratadas como erro;
- a linguagem aceita apenas expressoes declarativas seguras;
- quando `actionLive` esta ativo, o no passa a representar entrega operacional real.

## 5.5 Personas e leitura contextual

- A mesma base de dados muda de significado conforme a persona ativa.
- O produto nao troca os dados; ele troca o frame decisorio.
- Cada persona tem:
  - resumo;
  - interpretacao;
  - metricas principais;
  - perguntas de decisao;
  - preset recomendado de grupos/plugins.

## 5.6 Engenharia conectada ao negocio

Existe uma regra forte de produto aqui:

- commits, branches, PRs, releases e deploys nao sao apenas dados tecnicos;
- eles devem ser correlacionados com:
  - ativacao;
  - conversao;
  - MRR;
  - erros;
  - risco operacional.

Ou seja, engenharia e tratada como fonte de impacto no negocio, nao como modulo isolado.

## 5.7 Receita e pagamentos

- O sistema modela clientes, MRR, ARR, churn, ARPU, CAC e eventos de receita.
- Existe integracao prevista com AbacatePay.
- Webhooks de cobranca podem:
  - criar cliente;
  - registrar evento de receita;
  - marcar churn em cancelamento.

Isso indica que o produto quer operar tanto como analitico quanto como camada leve de revenue operations.

## 5.8 Insights e alerts

- O produto gera insights sinteticos a partir do estado do projeto.
- Alerts sao disparados por thresholds operacionais, como picos de erro ou churn anormal.
- Insights combinam benchmark, receita, comportamento e recomendacao acionavel.

## 6. Fluxos principais do produto

### 6.1 Fluxo principal de onboarding

1. Usuario cria projeto.
2. Define website e descricao.
3. Escolhe setup por SDK, tracking manual ou canvas.
4. Ajusta configuracoes base do workspace.
5. Comeca a ingestao.
6. Entra no workspace para ligar dados e views.

### 6.2 Fluxo de telemetria

1. Criar collection.
2. Definir schema.
3. Validar payload.
4. Ingerir registros.
5. Criar metricas e models com DSL.
6. Publicar views.
7. Usar essas saidas no workspace.

### 6.3 Fluxo do canvas

1. Abrir projeto.
2. Carregar preset inicial conforme persona.
3. Instalar plugins e itens no canvas.
4. Conectar blocos.
5. Selecionar no.
6. Inspecionar dados, configuracoes e acoes.
7. Criar novos nos derivados.
8. Duplicar a aba do workspace se necessario.

### 6.4 Fluxo de node builder

1. Criar "Novo no".
2. Configurar recebimento.
3. Configurar logica.
4. Configurar visual.
5. Configurar acao.
6. Ligar no a outros blocos do canvas.

Esse fluxo mostra claramente a intencao de transformar o produto num builder operacional.

### 6.5 Fluxo de leitura por persona

1. Usuario troca o cargo/persona ativo.
2. O workspace muda seu preset e enquadramento.
3. O inspector muda o texto de leitura contextual.
4. Os agentes IA disponiveis mudam conforme o cargo.

### 6.6 Fluxo de engenharia para negocio

1. Repositorios e PRs entram no sistema.
2. Releases e deploys sao monitorados.
3. Issues e board conectam execucao.
4. Impactos em ativacao, conversao, MRR e erros sao exibidos.
5. O time interpreta o efeito real de uma release.

## 7. Exemplos concretos de negocio presentes no seed

Os seeds deixam claro o tipo de problema que o produto quer resolver.

### 7.1 Recuperacao de receita perdida

Existe uma mini-historia de negocio pronta:

- collection `cart_sessions`
- metrica `abandoned_cart_value`
- metrica `potential_mrr_if_recovered`
- model `lost_sales_queue`
- view `lost_sales_stat`
- view `lost_sales_table`

Isso mostra que o produto foi pensado para:

- detectar abandono;
- calcular valor perdido;
- transformar isso em fila operacional;
- exibir impacto executivo e operacao acionavel.

### 7.2 Suporte conectado a receita

Existe outra collection pronta:

- `support_tickets`

Ela aponta para um uso onde tickets e incidentes nao sao apenas atendimento, mas sinais de:

- risco de churn;
- friccao no checkout;
- falhas em billing;
- impacto de produto e operacao.

### 7.3 Engenharia orientada a impacto

Os dados mockados de engenharia incluem:

- branches;
- PRs;
- issues;
- releases;
- deployments;
- board de entrega;
- impacto por release.

Isso reforca a tese de correlacao entre software delivery e resultado do negocio.

## 8. Referencias visuais e linguagem de interface

## 8.1 Direcao visual

A linguagem visual atual puxa para um **workspace premium de operacao**:

- fundo escuro dominante por padrao;
- superfices arredondadas grandes;
- bordas suaves;
- contraste alto com neon controlado;
- cara de tool profissional, nao de dashboard corporativo frio;
- mistura de ambiente editorial com software de command center.

## 8.2 Elementos recorrentes

- raio alto, normalmente entre 24px e 28px;
- sidebars e paineis com cara de sistema operacional;
- cards densos com tipografia forte no headline;
- badges de status e categoria;
- minimap no canvas;
- conexoes animadas entre blocos;
- inspector lateral rico;
- command menu e catalogo de blocos.

## 8.3 Tipografia

O sistema usa:

- `Plus Jakarta Sans` como fonte principal;
- `IBM Plex Mono` para codigo, formulas e trechos tecnicos.

Isso comunica uma mistura entre produto sofisticado e ferramenta tecnica.

## 8.4 Temas visuais

Existem quatro temas base por projeto:

- Lynx
- Sprout
- Paper
- Repo

Eles alteram acento, superfice e canvas, o que indica intencao de personalizacao sem romper a identidade base.

## 8.5 Referencias visuais implicitas

Pelo tipo de interface e pelas escolhas de UI, as referencias visuais mais proximas parecem ser:

- ferramentas de whiteboard/node graph;
- sistemas tipo control room;
- analytics SaaS de alto padrao;
- interfaces de produto com linguagem de design systems modernos;
- uma fusao entre BI, builder visual e workspace operacional.

## 9. Arquitetura e estado atual

### 9.1 Estado atual do frontend

O frontend atual esta concentrado em tres paginas principais:

- biblioteca de projetos;
- workspace;
- settings.

As antigas rotas especializadas ainda existem como compatibilidade, mas hoje redirecionam para o workspace com plugin/tab especificos.

### 9.2 Workspace-first

O produto foi claramente reorientado para o modelo workspace-first:

- paginas antigas viraram entradas para plugins;
- o canvas se tornou a experiencia principal;
- configuracao, leitura e acao orbitam esse canvas.

### 9.3 Mock-first com backend real parcial

Hoje o frontend roda por padrao em modo mock. Isso sugere:

- o produto esta em fase de consolidacao de experiencia;
- o canvas e o modelo de interacao ja sao prioridade;
- a persistencia real existe parcialmente, mas ainda nao e a base principal da UX.

### 9.4 Persistencia local do workspace

O estado do workspace e persistido localmente por projeto e por persona. Isso permite:

- manter layouts;
- trocar persona sem perder contexto;
- duplicar views;
- restaurar presets.

## 10. Propostas e direcoes futuras implicitas no codigo

O codigo deixa varias propostas de evolucao bem claras.

### 10.1 Virar um builder de operacao

O caminho mais forte e ampliar o node builder para que o usuario monte:

- entradas;
- formulas;
- datasets;
- views;
- automacoes;
- acoes;
- agentes.

Ou seja, menos "painel pronto" e mais "sistema montavel".

### 10.2 Migrar do mock para stack real

As proprias telas de settings e checklist indicam a proxima etapa:

- sair do mock database;
- conectar Prisma/Postgres e fontes reais;
- manter a mesma UX do workspace.

### 10.3 Amarrar telemetria, engenharia e receita

Essa e a tese mais valiosa do projeto. O produto tem potencial para ser uma plataforma onde o usuario responde perguntas como:

- qual release piorou conversao;
- qual friccao operacional esta batendo em churn;
- qual experimento trouxe impacto em MRR;
- qual fila operacional gera maior recuperacao;
- qual conta esta em risco agora.

### 10.4 Expandir camada de agentes

A camada de agentes ainda esta mais conceitual que operacional, mas o desenho ja esta pronto para:

- copilotos por funcao;
- alertas autonomos;
- sugestoes contextuais;
- automacoes por no ou por plugin;
- supervisao humana sobre agentes.

## 11. Resumo executivo

Em termos simples, o projeto e um **workspace operacional para SaaS** que tenta unificar:

- produto;
- revenue;
- engenharia;
- observabilidade;
- experimentacao;
- automacao;
- IA;
- leitura por cargo.

O coracao do sistema nao e uma pagina de dashboard, e sim um **canvas node-first** onde cada bloco pode representar entrada, calculo, lista, view, plugin ou agente.

O que o produto quer vender e isto:

"Pare de olhar dados em silos. Modele seu negocio como um workspace vivo, conectando evento, receita, deploy, risco e acao no mesmo lugar."

## 12. Recomendacao de posicionamento

Se for transformar isso em narrativa de produto, a formulacao mais fiel ao codigo atual seria algo proximo de:

> Plataforma workspace-first para times SaaS conectarem telemetria, receita, engenharia e operacao num canvas unico, com leitura contextual por persona e automacao orientada a impacto.

## 13. Arquivos-base usados nesta leitura

- `artifacts/analytics/src/App.tsx`
- `artifacts/analytics/src/pages/Projects.tsx`
- `artifacts/analytics/src/pages/Workspace.tsx`
- `artifacts/analytics/src/pages/Settings.tsx`
- `artifacts/analytics/src/lib/personas/team-personas.ts`
- `artifacts/analytics/src/lib/workspace/registry.tsx`
- `artifacts/analytics/src/lib/workspace/presets.ts`
- `artifacts/analytics/src/lib/workspace/presenters.ts`
- `artifacts/analytics/src/lib/workspace/node-runtime.ts`
- `artifacts/analytics/src/lib/telemetry/types.ts`
- `artifacts/analytics/src/lib/telemetry/runtime.ts`
- `artifacts/analytics/src/lib/telemetry/items.ts`
- `artifacts/analytics/src/lib/telemetry-seed.ts`
- `artifacts/analytics/src/lib/data/mock-seed.ts`
- `artifacts/analytics/src/lib/data/mock-database.ts`
- `artifacts/analytics/src/lib/http/client.ts`
- `artifacts/api-server/src/routes/projects.ts`
- `artifacts/api-server/src/routes/analytics.ts`
- `artifacts/api-server/src/routes/insights.ts`
- `artifacts/api-server/src/routes/abacatepay.ts`
