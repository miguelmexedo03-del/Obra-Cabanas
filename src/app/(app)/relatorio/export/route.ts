import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sortElementos } from '@/lib/utils'
import type { ElementoRelatorio, DivisaoRelatorio } from '../_components/relatorio-divisao'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildDivisoes(elementos: ElementoRelatorio[]): DivisaoRelatorio[] {
  const map = new Map<number, DivisaoRelatorio>()
  for (const el of sortElementos(elementos)) {
    if (!el.divisao_id || !el.divisoes) continue
    const hasNota = el.notas !== null
    const hasEvidencias = el.item_evidencias.length > 0
    if (el.concluido && !hasNota && !hasEvidencias) continue
    if (!map.has(el.divisao_id)) {
      map.set(el.divisao_id, {
        id: el.divisao_id,
        nome: el.divisoes.nome,
        ordem: el.divisoes.ordem,
        emFalta: [],
        comObservacao: [],
      })
    }
    const div = map.get(el.divisao_id)!
    if (!el.concluido) div.emFalta.push(el)
    else div.comObservacao.push(el)
  }
  return Array.from(map.values())
    .filter(d => d.emFalta.length > 0 || d.comObservacao.length > 0)
    .sort((a, b) => a.ordem - b.ordem)
}

function renderItem(el: ElementoRelatorio, tipo: 'falta' | 'observacao'): string {
  const label = el.sub_elemento
    ? `<span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-right:4px">${esc(el.elemento)} ›</span>${esc(el.sub_elemento)}`
    : esc(el.elemento)

  const icon = tipo === 'falta'
    ? `<span style="display:inline-flex;width:18px;height:18px;border-radius:4px;border:2px solid #d1d5db;flex-shrink:0;margin-top:1px"></span>`
    : `<span style="display:inline-flex;width:18px;height:18px;border-radius:4px;background:#16a34a;flex-shrink:0;align-items:center;justify-content:center;margin-top:1px"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span>`

  const notas: string[] = []
  if (el.notas) notas.push(esc(el.notas))
  for (const ev of el.item_evidencias) {
    if (ev.texto) notas.push(esc(ev.texto))
  }
  const notasHtml = notas
    .map(n => `<div style="margin:6px 0 0 26px;padding:5px 8px 5px 10px;background:#fffbeb;border-left:3px solid #fcd34d;border-radius:0 4px 4px 0;font-size:13px;color:#78350f">${n}</div>`)
    .join('')

  const fotos = el.item_evidencias.flatMap(ev => ev.evidencia_fotos)
  const fotosHtml = fotos.length > 0
    ? `<div style="margin:8px 0 0 26px;display:flex;flex-wrap:wrap;gap:6px">${fotos.map(f =>
        `<button onclick="openLightbox('${esc(f.url_publica)}')" style="width:130px;height:130px;border-radius:6px;border:1px solid #e5e7eb;overflow:hidden;padding:0;cursor:zoom-in;background:none"><img src="${esc(f.url_publica)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block"></button>`
      ).join('')}</div>`
    : ''

  return `<div style="padding:8px 0;border-top:1px solid #f3f4f6">
    <div style="display:flex;align-items:flex-start;gap:8px">
      ${icon}
      <span style="font-size:14px">${label}</span>
    </div>${notasHtml}${fotosHtml}
  </div>`
}

function renderDivisao(d: DivisaoRelatorio): string {
  const badge = [
    d.emFalta.length > 0 ? `${d.emFalta.length} em falta` : '',
    d.comObservacao.length > 0 ? `${d.comObservacao.length} feito com observação` : '',
  ].filter(Boolean).join(' · ')

  const faltaHtml = d.emFalta.length > 0 ? `
    <div style="padding:14px 18px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="width:20px;height:20px;border-radius:4px;background:#fee2e2;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#dc2626">${d.emFalta.length}</span>
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#dc2626">Em falta</span>
      </div>
      ${d.emFalta.map(el => renderItem(el, 'falta')).join('')}
    </div>` : ''

  const borderTop = d.emFalta.length > 0 && d.comObservacao.length > 0
    ? 'border-top:1px solid #f3f4f6;' : ''

  const obsHtml = d.comObservacao.length > 0 ? `
    <div style="padding:14px 18px;${borderTop}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="width:20px;height:20px;border-radius:4px;background:#fef3c7;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#d97706">${d.comObservacao.length}</span>
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#d97706">Feito com observação</span>
      </div>
      ${d.comObservacao.map(el => renderItem(el, 'observacao')).join('')}
    </div>` : ''

  return `<div style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:12px;overflow:hidden;page-break-inside:avoid">
    <div style="background:#f9fafb;padding:10px 18px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280">${esc(d.nome)}</span>
      <span style="font-size:12px;color:#9ca3af">${esc(badge)}</span>
    </div>
    ${faltaHtml}${obsHtml}
  </div>`
}

function buildHtml(
  codigo: string,
  geradoEm: string,
  ultimaAlteracao: string | null,
  totalEmFalta: number,
  totalObservacao: number,
  divisoes: DivisaoRelatorio[],
): string {
  const metaLine = ultimaAlteracao
    ? `Gerado em <strong>${esc(geradoEm)}</strong> · Última alteração na checklist: <strong>${esc(ultimaAlteracao)}</strong>`
    : `Gerado em <strong>${esc(geradoEm)}</strong>`

  const body = divisoes.length > 0
    ? divisoes.map(renderDivisao).join('')
    : `<p style="text-align:center;color:#9ca3af;padding:3rem 0">Nenhuma ocorrência registada. Todos os itens estão concluídos sem observações.</p>`

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Relatório ${esc(codigo)} — Obra Cabanas</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.5;color:#111827;background:#fff;padding:2rem;max-width:860px;margin:0 auto}
    @media print{body{padding:1rem}div[style*="page-break-inside"]{page-break-inside:avoid}}
  </style>
</head>
<body>
  <div style="padding-bottom:20px;border-bottom:1px solid #e5e7eb;margin-bottom:24px">
    <h1 style="font-size:22px;font-weight:700;letter-spacing:-.025em">${esc(codigo)} — Cabanas</h1>
    <p style="color:#6b7280;font-size:13px;margin-top:4px">${metaLine}</p>
    <div style="display:flex;gap:32px;margin-top:12px">
      <div>
        <div style="font-size:26px;font-weight:700;color:#ef4444;line-height:1">${totalEmFalta}</div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:500;color:#6b7280;margin-top:2px">Em falta</div>
      </div>
      <div>
        <div style="font-size:26px;font-weight:700;color:#d97706;line-height:1">${totalObservacao}</div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:500;color:#6b7280;margin-top:2px">Feitos com observação</div>
      </div>
    </div>
  </div>

  <div>${body}</div>

  <div style="margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center">
    Gerado pela app Obra Cabanas em ${esc(geradoEm)}
  </div>

  <!-- Lightbox -->
  <div id="lb" onclick="closeLightbox()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;align-items:center;justify-content:center;cursor:zoom-out">
    <img id="lb-img" src="" alt="" style="max-width:90vw;max-height:90vh;border-radius:8px;object-fit:contain;box-shadow:0 25px 60px rgba(0,0,0,.5)">
  </div>
  <script>
    function openLightbox(url){var lb=document.getElementById('lb');lb.style.display='flex';document.getElementById('lb-img').src=url;document.body.style.overflow='hidden';}
    function closeLightbox(){var lb=document.getElementById('lb');lb.style.display='none';document.getElementById('lb-img').src='';document.body.style.overflow='';}
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeLightbox();});
    document.getElementById('lb').addEventListener('click',function(e){if(e.target===this)closeLightbox();});
  </script>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Não autorizado', { status: 401 })

  const apId = Number(request.nextUrl.searchParams.get('ap'))
  if (!apId || isNaN(apId)) return new NextResponse('Parâmetro ap inválido', { status: 400 })

  const [apResult, elementosResult, lastModResult] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo').eq('id', apId).single(),
    supabase.from('elementos').select(`
      id, elemento, sub_elemento, concluido, notas, fase_id, divisao_id,
      fases(nome, cor_hex),
      divisoes(id, nome, ordem),
      item_evidencias(
        id, texto, criado_em,
        evidencia_fotos(id, url_publica)
      )
    `).eq('apartamento_id', apId).not('divisao_id', 'is', null),
    supabase.from('elementos')
      .select('updated_at')
      .eq('apartamento_id', apId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!apResult.data) return new NextResponse('Apartamento não encontrado', { status: 404 })

  const { codigo } = apResult.data
  const elementos = (elementosResult.data ?? []) as ElementoRelatorio[]
  const divisoes = buildDivisoes(elementos)

  const totalEmFalta = divisoes.reduce((s, d) => s + d.emFalta.length, 0)
  const totalObservacao = divisoes.reduce((s, d) => s + d.comObservacao.length, 0)

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  const geradoEm = new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
  const ultimaAlteracao = fmt(lastModResult.data?.updated_at ?? null)

  const html = buildHtml(codigo, geradoEm, ultimaAlteracao, totalEmFalta, totalObservacao, divisoes)

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-${codigo}.html"`,
    },
  })
}
