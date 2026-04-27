'use client'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { sendMagicLink } from '@/app/actions/users'

export function MagicLinkButton({ email }: { email: string }) {
  async function onClick() {
    const res = await sendMagicLink(email)
    if (!res.success) {
      toast.error('Não foi possível gerar link', { description: res.error })
      return
    }
    await navigator.clipboard.writeText(res.data!.link)
    toast.success('Link copiado para a área de transferência', {
      description: 'Cola no e-mail/WhatsApp do colaborador. Expira em 1 hora.',
      duration: 8000,
    })
  }

  return (
    <Button variant="outline" onClick={onClick}>
      <Mail className="h-4 w-4 mr-2" /> Magic link
    </Button>
  )
}
