import { ArrowRight, AlertCircle } from 'lucide-react'
import { BarChart3, CheckSquare, Building2, Kanban, TrendingUp } from 'lucide-react'

const fases = [
  { nome: 'Teto', cor: '#6B7280', desc: 'Verificação e nivelamento do teto em bruto.' },
  { nome: 'Remendos Teto', cor: '#9CA3AF', desc: 'Correção de parafusos, focos, fissuras e humidade.' },
  { nome: 'Pintura Teto', cor: '#D1D5DB', desc: 'Demolição, Extracoat, primário e acabamento final.' },
  { nome: 'Paredes', cor: '#3B82F6', desc: 'Pedra, pladur e fecho de paredes.' },
  { nome: 'Remendo Paredes', cor: '#60A5FA', desc: 'Tomadas, interruptores e mecanismos elétricos.' },
  { nome: 'Pintura Paredes', cor: '#93C5FD', desc: 'Demolição, Extracoat, primário e acabamento.' },
  { nome: 'Portas', cor: '#F59E0B', desc: 'Aros e portas interiores.' },
  { nome: 'Móveis', cor: '#10B981', desc: 'Móveis, bancas e bancadas de cozinha.' },
  { nome: 'Eletrodomésticos', cor: '#6366F1', desc: 'Instalação de todos os eletrodomésticos.' },
  { nome: 'Chão/Rodapé', cor: '#EF4444', desc: 'Pavimento e rodapés.' },
  { nome: 'WC Equipamentos', cor: '#8B5CF6', desc: 'Lavatório, sanita, chuveiro, duche e toalheiros.' },
]

const ferramentas = [
  {
    icon: BarChart3,
    cor: 'bg-slate-700',
    titulo: 'Gantt',
    resumo: 'O calendário visual da obra. É aqui que defines quando começa e acaba cada fase em cada apartamento.',
    comoUsar: [
      'Clica numa linha de AP para expandir e ver as fases.',
      'Clica numa barra para abrir o modal de edição (datas e estado).',
      'Arrasta as barras para mover as datas — o sistema atualiza automaticamente.',
      'Para limpar datas de uma fase, abre o modal e clica "Limpar datas" — volta ao estado de tracejado.',
    ],
    nota: 'A linha verde vertical é hoje. Um anel vermelho na barra significa que o prazo já passou.',
  },
  {
    icon: CheckSquare,
    cor: 'bg-emerald-700',
    titulo: 'Checklist',
    resumo: '3748 itens de qualidade distribuídos pelos 24 apartamentos. Cada item representa uma verificação física na obra.',
    comoUsar: [
      'Filtra por apartamento, fase, divisão ou estado antes de começar — há muitos itens.',
      'Clica no quadrado colorido à esquerda de cada item para o marcar como concluído.',
      'Usa a barra de pesquisa para encontrar um item específico pelo nome.',
      'O contador no cabeçalho de cada grupo mostra quantos itens já estão feitos.',
    ],
    nota: 'Cada item fica riscado quando concluído. A cor do quadrado corresponde à fase a que pertence.',
  },
  {
    icon: Building2,
    cor: 'bg-blue-700',
    titulo: 'Apartamentos',
    resumo: 'Vista individual de cada AP. Mostra o progresso geral e a checklist filtrada por esse apartamento.',
    comoUsar: [
      'Na lista, vês o progresso percentual de cada AP de relance.',
      'Clica num apartamento para entrar no detalhe.',
      'Dentro do detalhe, filtra por fase ou pesquisa itens específicos.',
      'A barra de progresso no topo reflete a percentagem de itens concluídos.',
    ],
    nota: 'O progresso atualiza em tempo real — assim que marcas itens na checklist, aparece aqui também.',
  },
  {
    icon: Kanban,
    cor: 'bg-violet-700',
    titulo: 'Kanban',
    resumo: 'Board visual para acompanhar o estado das fases Gantt. Quatro colunas: Por Fazer → Em Curso → Bloqueado → Concluído.',
    comoUsar: [
      'Cada cartão representa uma fase de um apartamento (ex: AP3 · Teto).',
      'Arrasta um cartão entre colunas para atualizar o estado.',
      '"Bloqueado" é para quando há impedimentos externos: material em falta, dependência de outra equipa.',
      'O estado aqui e no Gantt estão sincronizados — mudar num sítio reflete no outro.',
    ],
    nota: 'Usa "Bloqueado" com critério — é a informação mais útil para identificar bottlenecks na obra.',
  },
  {
    icon: TrendingUp,
    cor: 'bg-amber-700',
    titulo: 'Line of Balance',
    resumo: 'Ferramenta de planeamento baseada em fluxo contínuo (takt time). Defines as durações e o sistema calcula as datas automaticamente.',
    comoUsar: [
      'Define a duração de cada fase (em dias) e o takt time entre apartamentos.',
      'Escolhe a data de início do primeiro AP.',
      'O sistema gera o calendário ideal para todos os APs em sequência.',
      'Podes importar as datas calculadas diretamente para o Gantt.',
    ],
    nota: 'O LoB é uma ferramenta de planeamento, não de controlo. Usa-o para simular cenários antes de comprometer datas no Gantt.',
  },
]

function SectionLabel({ n, titulo }: { n: string; titulo: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <span className="font-mono text-xs text-muted-foreground/40 select-none">{n}</span>
      <h2 className="text-lg font-semibold">{titulo}</h2>
    </div>
  )
}

export default function GuiaPage() {
  return (
    <div className="max-w-4xl space-y-16 pb-16">

      {/* Header */}
      <div className="border-b pb-8">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">
          Obra Cabanas · Manual de utilização
        </p>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Como usar a app</h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
          Guia de referência da app — explica cada ferramenta, como interpretar o que vês, e o que podes fazer em cada sítio.
        </p>
      </div>

      {/* 01 — Fluxo de trabalho */}
      <section>
        <SectionLabel n="01" titulo="Fluxo de trabalho" />
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          A app tem uma lógica simples: o <strong className="text-foreground">Gantt</strong> define o calendário,
          o <strong className="text-foreground">Kanban</strong> acompanha o estado das tarefas em tempo real,
          e a <strong className="text-foreground">Checklist</strong> regista a qualidade item a item.
          Os <strong className="text-foreground">Apartamentos</strong> juntam tudo num só sítio por AP.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {['Planear no Gantt', 'Acompanhar no Kanban', 'Verificar na Checklist', 'Rever por Apartamento'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-2.5 bg-muted rounded-lg px-4 py-2.5">
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-sm font-medium">{step}</span>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 02 — Ferramentas */}
      <section>
        <SectionLabel n="02" titulo="Ferramentas" />
        <div className="space-y-5">
          {ferramentas.map(f => (
            <div key={f.titulo} className="rounded-xl border overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
                <div className={`${f.cor} p-2 rounded-md shrink-0`}>
                  <f.icon className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold">{f.titulo}</h3>
              </div>
              <div className="px-5 py-4 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{f.resumo}</p>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2">Como usar</p>
                  <ol className="space-y-2">
                    {f.comoUsar.map((passo, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="font-mono text-xs text-muted-foreground/60 mt-0.5 shrink-0 w-4">{i + 1}.</span>
                        <span className="text-muted-foreground leading-relaxed">{passo}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{f.nota}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 03 — Como interpretar o Gantt */}
      <section>
        <SectionLabel n="03" titulo="Como interpretar o Gantt" />
        <div className="rounded-xl border overflow-hidden divide-y">
          {[
            { simbolo: '▬', cor: 'text-slate-300', label: 'Barra cinzenta clara', desc: 'Duração total do AP — vai da data de início mais cedo à data de fim mais tarde entre todas as fases.' },
            { simbolo: '▬', cor: 'text-emerald-500', label: 'Barras coloridas', desc: 'Cada barra é uma fase individual. A cor corresponde à fase — a mesma da Checklist e do Kanban.' },
            { simbolo: '┄', cor: 'text-slate-400', label: 'Linha tracejada', desc: 'A fase ainda não tem datas. Clica para abrir o modal e definir o início e o fim.' },
            { simbolo: '│', cor: 'text-emerald-500', label: 'Linha verde vertical', desc: 'É hoje. Qualquer barra à esquerda desta linha já devia estar em curso ou concluída.' },
            { simbolo: '○', cor: 'text-red-500', label: 'Anel vermelho na barra', desc: 'O prazo passou e a fase ainda não está concluída. Requer atenção imediata.' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
              <span className={`font-mono text-base ${item.cor} shrink-0 w-5 text-center mt-0.5`}>{item.simbolo}</span>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 04 — Sequência construtiva */}
      <section>
        <SectionLabel n="04" titulo="Sequência construtiva" />
        <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
          As 11 fases têm uma ordem imutável — cada uma só começa depois da anterior estar terminada.
          Esta sequência define as dependências no Gantt e na Checklist.
        </p>
        <div className="space-y-1.5">
          {fases.map((f, i) => (
            <div key={f.nome} className="flex items-center gap-4 rounded-lg border px-4 py-3 hover:bg-muted/20 transition-colors">
              <span className="font-mono text-xs text-muted-foreground/50 w-5 shrink-0 select-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: f.cor }} />
              <span className="text-sm font-medium w-40 shrink-0">{f.nome}</span>
              <span className="text-xs text-muted-foreground">{f.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 05 — Estados */}
      <section>
        <SectionLabel n="05" titulo="Estados das tarefas" />
        <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
          Cada fase de cada apartamento tem um estado. Mantê-los atualizados é o que torna o Kanban uma ferramenta útil.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { dot: 'bg-slate-300', label: 'Por fazer', quando: 'A fase ainda não começou. É o estado inicial de todas as tarefas.' },
            { dot: 'bg-blue-500', label: 'Em curso', quando: 'A equipa está ativamente a trabalhar nesta fase no terreno.' },
            { dot: 'bg-red-500', label: 'Bloqueado', quando: 'Há um impedimento externo: material em falta, outra equipa a acabar, decisão pendente.' },
            { dot: 'bg-emerald-500', label: 'Concluído', quando: 'A fase terminou, a checklist foi verificada e o trabalho aceite.' },
          ].map(s => (
            <div key={s.label} className="rounded-lg border px-4 py-3.5 flex items-start gap-3">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${s.dot}`} />
              <div>
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.quando}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 06 — Permissões */}
      <section>
        <SectionLabel n="06" titulo="Quem pode fazer o quê" />
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-1/2">Ação</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Encarregado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operário</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { acao: 'Ver dashboards e KPIs', admin: true, enc: true, op: true },
                { acao: 'Marcar itens na checklist', admin: true, enc: true, op: true },
                { acao: 'Editar datas no Gantt', admin: true, enc: true, op: false },
                { acao: 'Mover cartões no Kanban', admin: true, enc: true, op: false },
                { acao: 'Simular no Line of Balance', admin: true, enc: true, op: false },
                { acao: 'Gerir utilizadores', admin: true, enc: false, op: false },
                { acao: 'Ver auditoria de ações', admin: true, enc: false, op: false },
              ].map(row => (
                <tr key={row.acao} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 text-muted-foreground">{row.acao}</td>
                  <td className="px-4 py-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                    {row.admin ? '✓' : <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                    {row.enc ? '✓' : <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                    {row.op ? '✓' : <span className="text-muted-foreground/30">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
