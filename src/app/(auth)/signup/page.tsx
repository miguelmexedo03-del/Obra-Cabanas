import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SignupDisabledPage() {
  return (
    <div className="rounded-lg border bg-card p-8 shadow-sm text-center space-y-3">
      <h1 className="text-xl font-semibold">Registo restrito</h1>
      <p className="text-sm text-muted-foreground">
        As contas são criadas pelo administrador da obra. Pede o teu acesso ao responsável.
      </p>
      <Button variant="outline" render={<Link href="/login" />}>
        Voltar ao login
      </Button>
    </div>
  )
}
