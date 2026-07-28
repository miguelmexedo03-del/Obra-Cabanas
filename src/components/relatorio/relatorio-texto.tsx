// O relatório tem vários parágrafos, um por tópico, separados por linha em
// branco (ver renderTemplate em lib/relatorio/template.ts). O cabeçalho
// (AP + progresso) fica em destaque; os restantes são parágrafos normais.
export function RelatorioTexto({ texto }: { texto: string }) {
  const paragrafos = texto.split('\n\n').map(p => p.trim()).filter(Boolean)
  const [cabecalho, ...resto] = paragrafos

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{cabecalho}</p>
      {resto.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
      ))}
    </div>
  )
}
