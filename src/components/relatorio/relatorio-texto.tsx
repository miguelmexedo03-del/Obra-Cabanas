// O relatório é um único parágrafo em prosa corrida (ver renderTemplate em
// lib/relatorio/template.ts) — não há nada a interpretar, só a mostrar.
export function RelatorioTexto({ texto }: { texto: string }) {
  return <p className="text-sm leading-relaxed text-foreground">{texto}</p>
}
