 import React, { useState, useRef, useEffect } from 'react'

interface AdoptSignatureModalProps {
  isOpen: boolean
  onClose: () => void
  validatorName: string
  onConfirm: (signatureData: { style?: string; imageBase64?: string; initials?: string }) => void
}

const CURSIVE_STYLES = [
  { id: 'style1', name: 'Dancing Script', weight: 600, label: 'Style Calligraphique' },
  { id: 'style2', name: 'Great Vibes', weight: 400, label: 'Style Élégant' },
  { id: 'style3', name: 'Alex Brush', weight: 400, label: 'Style Plume Fine' },
  { id: 'style4', name: 'Pacifico', weight: 400, label: 'Style Signature Moderne' },
  { id: 'style5', name: 'Caveat', weight: 600, label: 'Style Manuscrit Naturel' },
  { id: 'style6', name: 'Satisfy', weight: 400, label: 'Style Signature Fluide' },
]

const canvasToTrimmedPng = (sourceCanvas: HTMLCanvasElement, padding = 8) => {
  const sourceContext = sourceCanvas.getContext('2d')
  if (!sourceContext) return sourceCanvas.toDataURL('image/png')

  const pixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data
  let minX = sourceCanvas.width
  let minY = sourceCanvas.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < sourceCanvas.height; y += 1) {
    for (let x = 0; x < sourceCanvas.width; x += 1) {
      if (pixels[(y * sourceCanvas.width + x) * 4 + 3] > 0) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX || maxY < minY) return sourceCanvas.toDataURL('image/png')

  const cropX = Math.max(0, minX - padding)
  const cropY = Math.max(0, minY - padding)
  const cropWidth = Math.min(sourceCanvas.width - cropX, maxX - cropX + padding + 1)
  const cropHeight = Math.min(sourceCanvas.height - cropY, maxY - cropY + padding + 1)
  const trimmedCanvas = document.createElement('canvas')
  trimmedCanvas.width = cropWidth
  trimmedCanvas.height = cropHeight
  trimmedCanvas.getContext('2d')?.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  )
  return trimmedCanvas.toDataURL('image/png')
}

export const AdoptSignatureModal: React.FC<AdoptSignatureModalProps> = ({
  isOpen,
  onClose,
  validatorName,
  onConfirm,
}) => {
  const [tab, setTab] = useState<'style' | 'draw'>('style')
  const [selectedStyleName, setSelectedStyleName] = useState<string>(CURSIVE_STYLES[0].name)
  const [initials, setInitials] = useState<string>('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [isAdopting, setIsAdopting] = useState(false)
  const [fontLoadError, setFontLoadError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const activeStyle = CURSIVE_STYLES.find((s) => s.name === selectedStyleName) || CURSIVE_STYLES[0]

  useEffect(() => {
    if (validatorName) {
      const parts = validatorName.trim().split(' ').filter(Boolean)
      const inits = parts.map((p) => p[0].toUpperCase()).join('').slice(0, 3)
      setInitials(inits || 'MCT')
    }
  }, [validatorName])

  useEffect(() => {
    if (tab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#0f2961'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }, [tab])

  if (!isOpen) return null

  // Gestion du pad de dessin sur canevas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    setHasDrawn(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleAdopt = async () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current
      if (!canvas || !hasDrawn) {
        alert('Veuillez dessiner votre signature avant d\'adopter.')
        return
      }
      const imageBase64 = canvasToTrimmedPng(canvas)
      onConfirm({ imageBase64, initials })
    } else {
      setIsAdopting(true)
      setFontLoadError('')

      const signatureText = validatorName || 'Signature'
      const fontDescriptor = `${activeStyle.weight} 44px "${activeStyle.name}"`

      // Le canvas ne doit jamais figer la police de secours dans le PNG final.
      try {
        if (!document.fonts?.load) {
          throw new Error('FontFaceSet indisponible')
        }

        const loadedFaces = await document.fonts.load(fontDescriptor, signatureText)
        await document.fonts.ready
        if (loadedFaces.length === 0) {
          throw new Error(`Police ${activeStyle.name} indisponible`)
        }
      } catch (err) {
        console.warn('Signature font load warning:', err)
        setFontLoadError('La police choisie n’a pas pu être chargée. Veuillez réessayer.')
        setIsAdopting(false)
        return
      }

      // Générer l'image PNG avec exactement la famille et le poids de l'aperçu.
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 720
      tempCanvas.height = 140
      const ctx = tempCanvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
        ctx.fillStyle = '#081a45'
        ctx.font = fontDescriptor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(signatureText, tempCanvas.width / 2, tempCanvas.height / 2)
        const imageBase64 = canvasToTrimmedPng(tempCanvas, 10)
        onConfirm({ imageBase64, style: activeStyle.name, initials })
      } else {
        onConfirm({ style: activeStyle.name, initials })
      }

      setIsAdopting(false)
    }
  }


  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5">
        {/* En-tête du Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Adopter votre signature électronique</h3>
              <p className="text-xs text-slate-500">Personnalisez l'empreinte visuelle qui sera apposée sur le dossier PDF</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
        </div>

        {/* Formulaire Nom & Initiales */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div className="col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Nom complet sur la signature :</label>
            <input
              type="text"
              readOnly
              value={validatorName}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Initiales :</label>
            <input
              type="text"
              maxLength={4}
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 text-center uppercase"
            />
          </div>
        </div>

        {/* Sélection Onglets Style vs Dessin */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setTab('style')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
              tab === 'style' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Choisir un style manuscrit
          </button>
          <button
            onClick={() => setTab('draw')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
              tab === 'draw' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Dessiner à la main
          </button>
        </div>

        {/* Onglet 1 : Sélection de 6 styles manuscrits distincts */}
        {tab === 'style' && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">Sélectionnez une variante typographique :</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CURSIVE_STYLES.map((styleItem) => (
                <div
                  key={styleItem.id}
                  onClick={() => {
                    setSelectedStyleName(styleItem.name)
                    setFontLoadError('')
                  }}
                  className={`p-3 border-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between h-24 ${
                    selectedStyleName === styleItem.name
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-md ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 font-sans font-medium">{styleItem.label}</span>
                  <div
                    style={{ fontFamily: styleItem.name, fontWeight: styleItem.weight }}
                    className="text-xl text-slate-900 truncate py-1"
                  >
                    {validatorName || 'Signature'}
                  </div>
                  <div className="text-[9px] font-mono text-indigo-600 font-bold">{styleItem.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onglet 2 : Pad de dessin interactif */}
        {tab === 'draw' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">Dessinez votre signature dans l'encadré ci-dessous :</label>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 underline"
              >
                Effacer le dessin
              </button>
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden flex justify-center">
              <canvas
                ref={canvasRef}
                width={480}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="cursor-crosshair bg-white touch-none"
              />
            </div>
          </div>
        )}

        {/* Aperçu du Tampon Officiel Style Crochet L Bleu */}
        <div className="space-y-1.5 pt-1">
          <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Aperçu de la Signature Personnalisée (Forme Crochet L Bleu)</span>
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-white flex items-center justify-between gap-4">
            {/* Tampon Crochet L Bleu */}
            <div className="border-l-2 border-b-2 border-blue-500 rounded-bl-xl pl-3 pb-2 pt-1 pr-6 inline-block min-w-[200px]">
              <div className="text-xs font-bold text-blue-400 tracking-wide font-sans mb-1">
                Approuve
              </div>
              {tab === 'draw' && hasDrawn && canvasRef.current ? (
                <div className="bg-white/90 p-1 rounded inline-block max-h-10 ml-4 my-1">
                  <img src={canvasRef.current.toDataURL()} alt="Signature dessinée" className="h-8 object-contain" />
                </div>
              ) : (
                <div
                  style={{ fontFamily: activeStyle.name, fontWeight: activeStyle.weight }}
                  className="text-2xl text-white tracking-wide py-0.5 ml-4 font-normal"
                >
                  {validatorName || 'Signature'}
                </div>
              )}
              <div className="text-[10px] text-slate-300 font-mono ml-8 mt-1">
                22/07/2026 à 09:44
              </div>
            </div>

            <div className="border-2 border-indigo-400/40 rounded-xl px-3 py-2 text-center bg-indigo-950/60 shrink-0">
              <span className="text-[9px] font-mono text-indigo-300 block font-semibold">INITIALES</span>
              <span className="text-base font-extrabold font-mono text-white tracking-wider">{initials || 'DS'}</span>
            </div>
          </div>
        </div>

        {fontLoadError && (
          <p role="alert" className="text-xs font-semibold text-rose-600">
            {fontLoadError}
          </p>
        )}

        {/* Boutons d'Action */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleAdopt}
            disabled={isAdopting}
            className="w-2/3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 disabled:cursor-wait text-white py-2.5 text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isAdopting ? 'Préparation de la signature…' : 'Adopter & Signer le dossier'}
          </button>
        </div>
      </div>
    </div>
  )
}
