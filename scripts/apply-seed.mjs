// Script one-off para aplicar o seed do checklist ao Supabase.
// Corre: node scripts/apply-seed.mjs
// Requer: .env.local com SUPABASE_SERVICE_ROLE_KEY preenchido.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

const __dir = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dir, '..', '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key || key === 'eyJ...') {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não está preenchido no .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false }
})

// Ler o seed SQL e separar em blocos (um por INSERT statement)
const seedPath = join(__dir, '..', 'supabase', 'migrations', '0002_seed_checklist.sql')
const sql = readFileSync(seedPath, 'utf8')

// Remover begin/commit — vamos aplicar cada INSERT separadamente
const cleaned = sql
  .replace(/^\s*--[^\n]*\n/gm, '')  // remove comentários
  .replace(/\r\n/g, '\n')
  .replace(/^begin;\s*/m, '')
  .replace(/\s*commit;\s*$/m, '')
  .trim()

// Dividir em blocos por ponto-e-vírgula que termina uma linha
// (evita partir dentro de strings)
const blocks = []
let current = ''
let depth = 0

for (const char of cleaned) {
  current += char
  if (char === '(') depth++
  else if (char === ')') depth--
  else if (char === ';' && depth === 0) {
    const block = current.trim()
    if (block.length > 1) blocks.push(block)
    current = ''
  }
}

// Filtrar apenas os blocos de elementos (divisoes já foram aplicadas via MCP)
const elementoBlocks = blocks.filter(b =>
  b.toLowerCase().startsWith('insert into elementos')
)

console.log(`📦 ${elementoBlocks.length} blocos de elementos a aplicar...`)

let total = 0
for (let i = 0; i < elementoBlocks.length; i++) {
  const block = elementoBlocks[i]
  const { error } = await supabase.rpc('exec_sql', { sql: block }).catch(() => ({ error: null }))

  // rpc não funciona para DDL — usar fetch direto à REST API não é opção aqui.
  // Em vez disso, usar o cliente Postgres via @supabase/supabase-js não suporta SQL raw.
  // Fallback: contar linhas para dar feedback.
  const rowCount = (block.match(/\(/g) || []).length - 1
  total += rowCount
  process.stdout.write(`\r  Bloco ${i + 1}/${elementoBlocks.length} (~${total} linhas)`)
}

console.log('\n\n⚠️  O cliente JS não executa SQL raw. A usar método alternativo...')
console.log('Por favor corre o seed pelo SQL Editor do Supabase Dashboard:')
console.log('  1. Abre: https://supabase.com/dashboard/project/larfdydhlbqupmllxunq/sql/new')
console.log('  2. Clica em "New query"')
console.log('  3. Copia o conteúdo de: supabase/migrations/0002_seed_checklist.sql')
console.log('  4. Cola e clica "Run"')
