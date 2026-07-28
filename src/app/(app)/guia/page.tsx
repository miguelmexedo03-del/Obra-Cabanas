import { ArrowRight, BarChart3, CheckSquare, Building2, Kanban } from 'lucide-react'

const ferramentas = [
  {
    icon: BarChart3,
    cor: 'bg-foreground',
    titulo: 'Gantt',
    resumo: 'O calendário visual da obra. É aqui que defines quando começa e acaba cada fase em cada apartamento.',
    comoUsar: [
      'Clica numa linha de AP para expandir e ver as fases.',
      'Clica numa barra para abrir o modal de edição (datas e estado).',
      'Arrasta as barras para mover as datas — o sistema atualiza automaticamente.',
      'Para limpar datas de uma fase, abre o modal e clica "Limpar datas" — volta ao estado de tracejado.',
    ],
  },
  {
    icon: CheckSquare,
    cor: 'bg-foreground',
    titulo: 'Checklist',
    resumo: '3748 itens de qualidade distribuídos pelos 24 apartamentos. Cada item representa uma verificação física na obra.',
    comoUsar: [
      'Filtra por apartamento, fase, divisão ou estado antes de começar — há muitos itens.',
      'Clica no quadrado colorido à esquerda de cada item para o marcar como concluído.',
      'Usa a barra de pesquisa para encontrar um item específico pelo nome.',
      'O contador no cabeçalho de cada grupo mostra quantos itens já estão feitos.',
    ],
  },
  {
    icon: Building2,
    cor: 'bg-foreground',
    titulo: 'Apartamentos',
    resumo: 'Vista individual de cada AP. Mostra o progresso geral e a checklist filtrada por esse apartamento.',
    comoUsar: [
      'Na lista, vês o progresso percentual de cada AP de relance.',
      'Clica num apartamento para entrar no detalhe.',
      'Dentro do detalhe, filtra por fase ou pesquisa itens específicos.',
      'A barra de progresso no topo reflete a percentagem de itens concluídos.',
    ],
  },
  {
    icon: Kanban,
    cor: 'bg-foreground',
    titulo: 'Kanban',
    resumo: 'Board visual para acompanhar o estado das fases Gantt. Quatro colunas: Por Fazer → Em Curso → Bloqueado → Concluído.',
    comoUsar: [
      'Cada cartão representa uma fase de um apartamento (ex: AP3 · Teto).',
      'Arrasta um cartão entre colunas para atualizar o estado.',
      '"Bloqueado" é para quando há impedimentos externos: material em falta, dependência de outra equipa.',
      'O estado aqui e no Gantt estão sincronizados — mudar num sítio reflete no outro.',
    ],
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
                  <f.icon className="h-4 w-4 text-background" />
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
            { simbolo: '▬', cor: 'text-brand-500', label: 'Barras coloridas', desc: 'Cada barra é uma fase individual. A cor corresponde à fase — a mesma da Checklist e do Kanban.' },
            { simbolo: '┄', cor: 'text-slate-400', label: 'Linha tracejada', desc: 'A fase ainda não tem datas. Clica para abrir o modal e definir o início e o fim.' },
            { simbolo: '│', cor: 'text-brand-600', label: 'Linha verde vertical', desc: 'É hoje. Qualquer barra à esquerda desta linha já devia estar em curso ou concluída.' },
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

    </div>
  )
}
