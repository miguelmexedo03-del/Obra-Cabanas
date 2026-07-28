import { redirect } from 'next/navigation'

// LoB retirado de produção a pedido do Miguel (2026-07-28).
// Histórico completo da página em git (commit anterior a esta alteração) — reverter para reativar.
export default function LobPage() {
  redirect('/')
}
