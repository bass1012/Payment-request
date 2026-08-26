import { useState, type FormEvent, type FormEventHandler } from 'react'
import toast from 'react-hot-toast'
import {
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import type { Request } from '../../types'
import RequestClosureForm from './RequestClosureForm'
import RequestPaymentForm, { type PaymentValidationPayload } from './RequestPaymentForm'
import { AdoptSignatureModal } from '../auth/AdoptSignatureModal'
import { useAuth } from '../../contexts/AuthContext'

type ActionRequest = Pick<Request, 'status' | 'type' | 'workflowSteps' | 'currentStep' | 'validationAuthority'>

interface RequestValidationActionsProps {
  request: ActionRequest
  visible: boolean
  validating: boolean
  comment: string
  onCommentChange: (value: string) => void
  onValidate: (action: 'APPROVED' | 'REJECTED' | 'REQUEST_CORRECTION', extraData?: Record<string, unknown>) => Promise<void>

  onPayment: (payload: PaymentValidationPayload) => void
  onClose: FormEventHandler<HTMLFormElement>
  onOpenReject: () => void
}

export default function RequestValidationActions({
  request,
  visible,
  validating,
  comment,
  onCommentChange,
  onValidate,
  onPayment,
  onClose,
  onOpenReject,
}: RequestValidationActionsProps) {
  const { user } = useAuth()
  const [memoMaterial, setMemoMaterial] = useState('')
  const [memoSpecs, setMemoSpecs] = useState('')
  const [memoScreenSize, setMemoScreenSize] = useState('')
  const [memoAccessories, setMemoAccessories] = useState('')
  const [consentGiven, setConsentGiven] = useState(true)

  const [showCorrectionModal, setShowCorrectionModal] = useState(false)
  const [showAdoptSignatureModal, setShowAdoptSignatureModal] = useState(false)

  if (!visible) return null

  const validatorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Valideur'

  const isItAssetStep = request.type === 'ASSET'
    && request.workflowSteps
    && request.workflowSteps[request.currentStep - 1]?.type === 'it'

  const submitMemo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!consentGiven) {
      toast.error('Vous devez accepter les conditions de signature électronique.')
      return
    }
    if (!memoMaterial.trim()) {
      toast.error('Le modèle / type de matériel est requis.')
      return
    }
    if (!memoSpecs.trim()) {
      toast.error('Les caractéristiques techniques sont requises.')
      return
    }
    try {
      await onValidate('APPROVED', {
        memoMaterial,
        memoSpecs,
        memoScreenSize,
        memoAccessories,
        consentGiven,
      })
      setMemoMaterial('')
      setMemoSpecs('')
      setMemoScreenSize('')
      setMemoAccessories('')
    } catch {
      toast.error('Erreur lors de la validation')
    }
  }

  const handleApproveClick = () => {
    if (!consentGiven) {
      toast.error('Vous devez accepter les conditions de signature électronique.')
      return
    }
    setShowAdoptSignatureModal(true)
  }

  const handleAdoptSignatureConfirm = async (signatureData: { style?: string; imageBase64?: string; initials?: string }) => {
    try {
      await onValidate('APPROVED', {
        consentGiven,
        signatureStyle: signatureData.style,
        signatureImage: signatureData.imageBase64,
        signatureInitials: signatureData.initials,
      })
      setShowAdoptSignatureModal(false)
    } catch {
      // Erreur déjà gérée dans le parent
    }
  }


  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) {
      toast.error('Veuillez préciser le motif de la correction demandée.')
      return
    }
    try {
      await onValidate('REQUEST_CORRECTION')
      setShowCorrectionModal(false)
    } catch {
      // Toast déjà affiché dans le parent
    }
  }

  return (
    <div className="card space-y-4 border-indigo-100 bg-indigo-50/10">
      <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex items-center justify-between">
        <span>
          {request.status === 'PENDING_PAYMENT'
            ? 'Validation du Règlement'
            : request.status === 'PROCESSING'
              ? 'Clôture de la Demande'
              : 'Validation de l\'Étape'}
        </span>
        <span className="text-[11px] font-normal lowercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
          Signature cryptographique native SHA-256
        </span>
      </h2>

      {request.validationAuthority?.mode === 'DELEGATED' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <span className="font-semibold">Validation par délégation :</span> vous agissez pour{' '}
          {request.validationAuthority.delegatorName} ({request.validationAuthority.delegatorEmail}), périmètre{' '}
          {request.validationAuthority.delegationScope}. Cette représentation sera inscrite dans le journal d’audit.
        </div>
      )}

      {request.status === 'PENDING_PAYMENT' ? (
        <RequestPaymentForm
          validating={validating}
          onSubmit={onPayment}
          onReject={onOpenReject}
          onInvalid={() => toast.error('Le montant et la référence de transaction sont requis')}
        />
      ) : request.status === 'PROCESSING' ? (
        <RequestClosureForm
          type={request.type}
          comment={comment}
          validating={validating}
          onCommentChange={onCommentChange}
          onSubmit={onClose}
        />
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="signature-consent"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="signature-consent" className="cursor-pointer select-none leading-relaxed">
              <span className="font-semibold text-slate-900">Consentement de signature électronique :</span> Je confirme l'exactitude des informations et donne mon consentement explicite pour l'apposition de ma signature et l'enregistrement de l'empreinte SHA-256 dans le journal d'audit cryptographique ERP MCT.
            </label>
          </div>

          <div>
            <label htmlFor="validation-comment" className="block text-xs font-semibold text-slate-700 mb-1">
              Commentaire / Observations (Optionnel pour approbation, obligatoire pour correction) :
            </label>
            <textarea
              id="validation-comment"
              rows={2}
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Saisissez vos remarques ou précisez les éléments à corriger..."
              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-sans shadow-sm"
            />
          </div>

          {isItAssetStep ? (
            <form onSubmit={submitMemo} className="space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  Mémo d'attribution (Moyens Généraux — Adom Pierre)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="memo-material" className="label text-xs font-semibold text-gray-700">
                      Modèle / Type de matériel *
                    </label>
                    <input id="memo-material" type="text" required placeholder="ex: Ordinateur portable HP ProBook 450 G10" value={memoMaterial} onChange={(event) => setMemoMaterial(event.target.value)} className="input" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="memo-screen-size" className="label text-xs font-semibold text-gray-700">
                      Taille écran (pouces)
                    </label>
                    <input id="memo-screen-size" type="text" placeholder="ex: 15.6" value={memoScreenSize} onChange={(event) => setMemoScreenSize(event.target.value)} className="input" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="memo-specs" className="label text-xs font-semibold text-gray-700">
                    Caractéristiques techniques (Processeur, RAM, Stockage) *
                  </label>
                  <textarea id="memo-specs" required rows={2} placeholder="ex: Intel Core i5, 16Go RAM, 512Go SSD" value={memoSpecs} onChange={(event) => setMemoSpecs(event.target.value)} className="input font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="memo-accessories" className="label text-xs font-semibold text-gray-700">
                    Accessoires fournis (Optionnel)
                  </label>
                  <input id="memo-accessories" type="text" placeholder="ex: Chargeur secteur, sacoche de transport, souris sans fil" value={memoAccessories} onChange={(event) => setMemoAccessories(event.target.value)} className="input" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={validating || !consentGiven} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  <CheckCircleIcon className="w-4 h-4" />
                  Valider & Envoyer le Mémo
                </button>
                <button type="button" onClick={onOpenReject} disabled={validating} className="btn-danger flex items-center gap-2">
                  <XCircleIcon className="w-4 h-4" />
                  Rejeter
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button onClick={handleApproveClick} disabled={validating || !consentGiven} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                <CheckCircleIcon className="w-4 h-4" />
                Approuver & Signer
              </button>
              <button
                type="button"
                onClick={() => {
                  if (comment.trim()) {
                    onValidate('REQUEST_CORRECTION')
                  } else {
                    setShowCorrectionModal(true)
                  }
                }}
                disabled={validating}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 012.828 0L20.121 4.121a2 2 0 010 2.828l-8.485 8.485M16 4l4 4" />
                </svg>
                Demander une correction
              </button>
              <button onClick={onOpenReject} disabled={validating} className="btn-danger flex items-center gap-2">
                <XCircleIcon className="w-4 h-4" />
                Rejet Définitif
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal d'Adoption de Signature Style DocuSign */}
      <AdoptSignatureModal
        isOpen={showAdoptSignatureModal}
        onClose={() => setShowAdoptSignatureModal(false)}
        validatorName={validatorName}
        onConfirm={handleAdoptSignatureConfirm}
      />

      {/* Modal de saisie obligatoire du motif de correction */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 012.828 0L20.121 4.121a2 2 0 010 2.828l-8.485 8.485M16 4l4 4" />
                  </svg>
                </div>
                <h3 className="font-bold text-slate-900 text-base">Motif de la demande de correction</h3>
              </div>
              <button onClick={() => setShowCorrectionModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div>
                <label htmlFor="correction-modal-comment" className="block text-xs font-semibold text-slate-700 mb-1">
                  Précisez les modifications ou compléments attendus du demandeur *
                </label>
                <textarea
                  id="correction-modal-comment"
                  rows={4}
                  required
                  value={comment}
                  onChange={(e) => onCommentChange(e.target.value)}
                  placeholder="ex: Merci de corriger la section d'imputation et de joindre le devis actualisé..."
                  autoFocus
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={validating || !comment.trim()}
                  className="w-1/2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50 transition-colors"
                >
                  {validating ? 'Envoi...' : 'Transmettre la demande de correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}




