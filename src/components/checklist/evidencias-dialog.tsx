'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Camera, X } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'
import { criarEvidencia, apagarEvidencia } from '@/app/actions/evidencias'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type View = 'lista' | 'novo' | 'detalhe'

type EvidenciaFoto = {
  id: string
  url_publica: string
}

type Evidencia = {
  id: string
  texto: string | null
  criado_em: string
  evidencia_fotos: EvidenciaFoto[]
}

type FotoLocal = {
  id: string
  file: File
  preview: string
  uploading: boolean
  storage_path?: string
  url_publica?: string
}

interface Props {
  elementoId: number
  open: boolean
  onOpenChange: (v: boolean) => void
  onCountChange?: (count: number) => void
}

export function EvidenciasDialog({ elementoId, open, onOpenChange, onCountChange }: Props) {
  const [view, setView] = useState<View>('lista')
  const [evidencias, setEvidencias] = useState<Evidencia[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedEvidencia, setSelectedEvidencia] = useState<Evidencia | null>(null)
  const [texto, setTexto] = useState('')
  const [fotosLocais, setFotosLocais] = useState<FotoLocal[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setView('lista')
    setTexto('')
    setFotosLocais(prev => {
      prev.forEach(f => URL.revokeObjectURL(f.preview))
      return []
    })
    setErro(null)
    setIsLoading(true)

    let cancelled = false
    const supabase = createClient()
    supabase
      .from('item_evidencias')
      .select('id, texto, criado_em, evidencia_fotos(id, url_publica)')
      .eq('elemento_id', elementoId)
      .order('criado_em', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setErro('Erro ao carregar evidências.')
          setIsLoading(false)
          return
        }
        const lista = (data ?? []) as Evidencia[]
        setEvidencias(lista)
        setIsLoading(false)
        if (lista.length === 0) setView('novo')
      })
    return () => { cancelled = true }
  }, [open, elementoId])

  async function handleAddFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const novas: FotoLocal[] = files.map(f => ({
      id: crypto.randomUUID(),
      file: f,
      preview: URL.createObjectURL(f),
      uploading: true,
    }))
    setFotosLocais(prev => [...prev, ...novas])

    const supabase = createClient()

    for (const nova of novas) {
      try {
        const compressed = await imageCompression(nova.file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })
        const ext = nova.file.name.split('.').pop() ?? 'jpg'
        const path = `${elementoId}/${crypto.randomUUID()}.${ext}`
        const { data, error } = await supabase.storage
          .from('evidencias')
          .upload(path, compressed, { contentType: compressed.type })

        if (error || !data) throw error ?? new Error('Upload falhou: sem dados')

        const { data: urlData } = supabase.storage
          .from('evidencias')
          .getPublicUrl(path)

        setFotosLocais(prev =>
          prev.map(f =>
            f.id === nova.id
              ? { ...f, uploading: false, storage_path: path, url_publica: urlData.publicUrl }
              : f
          )
        )
      } catch {
        setFotosLocais(prev => {
          URL.revokeObjectURL(nova.preview)
          return prev.filter(f => f.id !== nova.id)
        })
        setErro('Erro ao fazer upload da foto. Tenta novamente.')
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleGuardar() {
    const fotosCompletas = fotosLocais.filter(f => !f.uploading && f.storage_path && f.url_publica)
    if (!texto.trim() && fotosCompletas.length === 0) {
      setErro('Escreve uma observação ou adiciona pelo menos uma foto.')
      return
    }
    setIsSaving(true)
    setErro(null)

    const result = await criarEvidencia({
      elementoId,
      texto,
      fotos: fotosCompletas.map(f => ({
        storage_path: f.storage_path!,
        url_publica: f.url_publica!,
      })),
    })

    if (!result.success) {
      setErro(result.error ?? 'Erro ao guardar. Tenta novamente.')
      setIsSaving(false)
      return
    }

    const supabase = createClient()
    const { data, error: reloadErr } = await supabase
      .from('item_evidencias')
      .select('id, texto, criado_em, evidencia_fotos(id, url_publica)')
      .eq('elemento_id', elementoId)
      .order('criado_em', { ascending: false })

    if (!reloadErr) {
      const lista = (data ?? []) as Evidencia[]
      setEvidencias(lista)
      onCountChange?.(lista.length)
    }
    setTexto('')
    setFotosLocais(prev => {
      prev.forEach(f => URL.revokeObjectURL(f.preview))
      return []
    })
    setIsSaving(false)
    setView('lista')
  }

  async function handleApagar() {
    if (!selectedEvidencia) return
    setIsDeleting(true)
    setErro(null)
    const result = await apagarEvidencia(selectedEvidencia.id)
    if (!result.success) {
      setErro(result.error ?? 'Erro ao apagar.')
      setIsDeleting(false)
      setConfirmDelete(false)
      return
    }
    setEvidencias(prev => {
      const next = prev.filter(ev => ev.id !== selectedEvidencia.id)
      onCountChange?.(next.length)
      return next
    })
    setIsDeleting(false)
    setConfirmDelete(false)
    setSelectedEvidencia(null)
    setView('lista')
  }

  function formatData(iso: string) {
    return new Date(iso).toLocaleString('pt-PT', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {(view === 'novo' || view === 'detalhe') && evidencias.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setView('lista'); setConfirmDelete(false); setErro(null) }}
                  aria-label="Voltar"
                  className="-ml-1 p-1 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <DialogTitle>
                {view === 'lista' && 'Evidências'}
                {view === 'novo' && 'Novo registo'}
                {view === 'detalhe' && 'Detalhe'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto">
            {/* Vista: LISTA */}
            {view === 'lista' && (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-brand-200 text-brand-600 hover:bg-brand-50"
                  onClick={() => { setTexto(''); setFotosLocais([]); setErro(null); setView('novo') }}
                >
                  + Novo registo
                </Button>

                {isLoading && (
                  <p className="py-4 text-center text-sm text-muted-foreground">A carregar…</p>
                )}

                {!isLoading && evidencias.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">Sem registos ainda.</p>
                )}

                {!isLoading && evidencias.map(ev => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => { setSelectedEvidencia(ev); setView('detalhe') }}
                    className="w-full rounded-lg bg-muted/50 p-3 text-left transition-colors hover:bg-muted"
                  >
                    {ev.texto && (
                      <p className="mb-1 line-clamp-2 text-sm text-foreground">{ev.texto}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatData(ev.criado_em)}</span>
                      {ev.evidencia_fotos.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Camera className="h-3 w-3" />
                          {ev.evidencia_fotos.length}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Vista: NOVO REGISTO */}
            {view === 'novo' && (
              <div className="space-y-4">
                <Textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  placeholder="Observação…"
                  rows={4}
                />

                {fotosLocais.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {fotosLocais.map(f => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <div key={f.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                        <img src={f.preview} alt="" className="h-full w-full object-cover" />
                        {f.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-muted/70">
                    <Camera className="h-4 w-4" />
                  </span>
                  <span>Adicionar foto</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddFoto}
                    className="sr-only"
                  />
                </label>

                {erro && <p className="text-sm text-destructive">{erro}</p>}

                <Button
                  type="button"
                  className="w-full"
                  disabled={isSaving || fotosLocais.some(f => f.uploading)}
                  onClick={handleGuardar}
                >
                  {isSaving ? 'A guardar…' : 'Guardar'}
                </Button>
              </div>
            )}

            {/* Vista: DETALHE */}
            {view === 'detalhe' && selectedEvidencia && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">{formatData(selectedEvidencia.criado_em)}</p>

                {selectedEvidencia.texto && (
                  <p className="text-sm leading-relaxed text-foreground">{selectedEvidencia.texto}</p>
                )}

                {selectedEvidencia.evidencia_fotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedEvidencia.evidencia_fotos.map(foto => (
                      <button
                        key={foto.id}
                        type="button"
                        onClick={() => setFullscreenUrl(foto.url_publica)}
                        className="aspect-square overflow-hidden rounded-lg bg-muted transition-opacity hover:opacity-80"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={foto.url_publica} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {erro && <p className="text-sm text-destructive">{erro}</p>}

                {!confirmDelete ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Apagar registo
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-center text-sm text-muted-foreground">Tens a certeza? Esta ação não pode ser desfeita.</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="flex-1"
                        disabled={isDeleting}
                        onClick={handleApagar}
                      >
                        {isDeleting ? 'A apagar…' : 'Confirmar'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen photo viewer */}
      {fullscreenUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
          onClick={() => setFullscreenUrl(null)}
        >
          <button
            type="button"
            aria-label="Fechar foto"
            onClick={() => setFullscreenUrl(null)}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
