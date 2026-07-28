// Interpreta o texto plano do relatório (cabeçalho + blocos "Título:\n- item\n- item",
// separados por linha em branco — ver renderTemplate em lib/relatorio/template.ts) e
// dá-lhe uma apresentação visual consistente. O texto continua plano por baixo (para
// "Copiar" funcionar bem colado num email); isto é só a camada de leitura no ecrã.
function parseRelatorio(texto: string) {
  const blocos = texto.split('\n\n').map(b => b.trim()).filter(Boolean)
  const [cabecalho, ...resto] = blocos
  const seccoes = resto.map(bloco => {
    const linhas = bloco.split('\n')
    const titulo = linhas[0].replace(/:$/, '')
    const itens = linhas.slice(1).map(l => l.replace(/^-\s*/, ''))
    return { titulo, itens }
  })
  return { cabecalho: cabecalho ?? '', seccoes }
}

export function RelatorioTexto({ texto }: { texto: string }) {
  const { cabecalho, seccoes } = parseRelatorio(texto)

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{cabecalho}</p>
      {seccoes.map((s, i) => (
        <div key={i}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{s.titulo}</p>
          <ul className="space-y-0.5 pl-4 text-sm text-foreground/90 list-disc marker:text-brand-500">
            {s.itens.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
}
