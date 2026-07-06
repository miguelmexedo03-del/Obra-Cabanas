import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildResultado } from '../_lib/build-resultado'
import type { ElementoConsulta, EstadoFiltro } from '../_lib/build-resultado'
import { TIPOS_DIVISAO, type TipoDivisao } from '@/lib/utils'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function capitalizeEstado(estado: string): string {
  switch (estado) {
    case 'incompleto':
      return 'Incompleto'
    case 'todos':
      return 'Todos'
    default:
      return 'Completo'
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Não autorizado', { status: 401 })

  const tipoParam = request.nextUrl.searchParams.get('tipo')
  const tipo: TipoDivisao | null =
    tipoParam && (TIPOS_DIVISAO as readonly string[]).includes(tipoParam)
      ? (tipoParam as TipoDivisao)
      : null
  if (!tipo) return new NextResponse('Parâmetro tipo inválido', { status: 400 })

  const faseParam = request.nextUrl.searchParams.get('fase')
  const faseId = faseParam ? Number(faseParam) : NaN
  if (isNaN(faseId)) return new NextResponse('Parâmetro fase inválido', { status: 400 })

  const estadoParam = request.nextUrl.searchParams.get('estado')
  const estado: EstadoFiltro = estadoParam === 'incompleto' || estadoParam === 'todos' ? estadoParam : 'completo'

  const [{ data: elementosData }, { data: faseData }] = await Promise.all([
    supabase
      .from('elementos')
      .select('concluido, apartamento_id, divisao_id, divisoes(nome), apartamentos(codigo)')
      .eq('fase_id', faseId)
      .not('divisao_id', 'is', null),
    supabase.from('fases').select('nome').eq('id', faseId).single(),
  ])

  const elementos = (elementosData ?? []) as ElementoConsulta[]
  const linhas = buildResultado(elementos, tipo, estado)
  const faseNome = faseData?.nome ?? `Fase ${faseId}`

  const geradoEm = new Date().toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const linhasHtml = linhas.length > 0
    ? linhas.map(l => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${esc(l.apCodigo)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${esc(l.divisaoNome)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${l.concluidos}/${l.total}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${l.estado === 'Completo' ? '#15803d' : '#b45309'}">${esc(l.estado)}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="padding:24px;text-align:center;color:#9ca3af">Nenhum resultado.</td></tr>`

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Consulta — ${esc(tipo)} — ${esc(faseNome)} — Obra Cabanas</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.5;color:#111827;background:#fff;padding:2rem;max-width:860px;margin:0 auto}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;border-bottom:2px solid #e5e7eb}
    @media print{body{padding:1rem}}
  </style>
</head>
<body>
  <div style="padding-bottom:20px;border-bottom:1px solid #e5e7eb;margin-bottom:20px">
    <h1 style="font-size:22px;font-weight:700;letter-spacing:-.025em">Consulta — Obra Cabanas</h1>
    <p style="color:#6b7280;font-size:13px;margin-top:4px">
      Tipo: <strong>${esc(tipo)}</strong> · Fase: <strong>${esc(faseNome)}</strong> · Estado: <strong>${esc(capitalizeEstado(estado))}</strong>
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:2px">Gerado em <strong>${esc(geradoEm)}</strong></p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Apartamento</th><th>Divisão</th><th>Concluídos/Total</th><th>Estado</th>
      </tr>
    </thead>
    <tbody>${linhasHtml}</tbody>
  </table>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="consulta-${tipo.toLowerCase().replace(/\s+/g, '-')}.html"`,
    },
  })
}
