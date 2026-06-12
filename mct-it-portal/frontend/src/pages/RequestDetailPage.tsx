import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import toast from 'react-hot-toast'
import type { Request } from '../types'
import { STATUS_LABELS, STATUS_BADGE_CLASS, TYPE_LABELS } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  CheckCircleIcon,
  XCircleIcon,
  PrinterIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [comment, setComment] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  const load = () => {
    if (!id) return
    api.get(`/requests/${id}`)
      .then((r) => setRequest(r.data))
      .catch(() => { toast.error('Demande introuvable'); navigate('/') })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const canValidate = () => {
    if (!request || !user) return false
    const it = ['IT_ADMIN', 'SUPER_ADMIN']
    const mgr = ['MANAGER', 'DIRECTOR', ...it]
    // Simple check: if user is a manager/IT and request is not closed/rejected
    return mgr.includes(user.role) && !['CLOSED', 'REJECTED', 'DRAFT'].includes(request.status)
  }

  const handleValidate = async (action: 'APPROVED' | 'REJECTED') => {
    if (!id) return
    setValidating(true)
    try {
      await api.post(`/requests/${id}/validate`, { action, comment })
      toast.success(action === 'APPROVED' ? 'Demande approuvée !' : 'Demande rejetée')
      setShowRejectModal(false)
      setComment('')
      load()
    } catch {
      toast.error('Erreur lors de la validation')
    } finally {
      setValidating(false)
    }
  }

  const handlePDF = async () => {
    if (!id) return
    try {
      const res = await api.get(`/pdf/${id}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${request?.referenceNumber ?? id}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400 py-24">Chargement...</div>
    )
  }

  if (!request) return null

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <p className="text-sm text-gray-500 font-mono">{request.referenceNumber}</p>
            <h1 className="text-xl font-bold text-gray-900">{TYPE_LABELS[request.type]}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${STATUS_BADGE_CLASS[request.status]}`}>
            {STATUS_LABELS[request.status]}
          </span>
          <button
            onClick={handlePDF}
            className="btn-secondary flex items-center gap-2 text-sm py-1.5"
          >
            <PrinterIcon className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
          Demandeur
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Nom" value={`${request.requesterName}`} />
          <InfoRow label="Email" value={request.requesterEmail} />
          <InfoRow label="Département" value={request.department} />
          {request.position && <InfoRow label="Fonction" value={request.position} />}
          {request.matricule && <InfoRow label="Matricule" value={request.matricule} />}
          <InfoRow
            label="Date de soumission"
            value={format(new Date(request.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          />
        </div>
      </div>

      {/* Details card */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
          Détails de la demande
        </h2>
        <div className="text-sm space-y-3">
          {request.type === 'EMAIL' && request.memoNumber && (
            <InfoRow label="Numéro Mémo" value={request.memoNumber} />
          )}
          {request.type === 'PRINT' && (
            <>
              {request.printObject && <InfoRow label="Objet" value={request.printObject} />}
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Copies A4" value={String(request.copiesA4 ?? 0)} />
                <InfoRow label="Copies A3" value={String(request.copiesA3 ?? 0)} />
              </div>
            </>
          )}
          {request.type === 'ASSET' && (
            <>
              {request.itAssets && <InfoRow label="Matériels demandés" value={request.itAssets} />}
              {request.softwareLicenses && <InfoRow label="Licences / Logiciels" value={request.softwareLicenses} />}
              {request.accessPrivileges && <InfoRow label="Accès et privilèges" value={request.accessPrivileges} />}
              {request.requestReason && <InfoRow label="Motif" value={request.requestReason} />}
            </>
          )}
          {request.type === 'OTHER' && request.description && (
            <InfoRow label="Description" value={request.description} />
          )}
        </div>
      </div>

      {/* Validation timeline */}
      {request.validations && request.validations.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            Historique des validations
          </h2>
          <div className="space-y-3">
            {request.validations.map((v) => (
              <div key={v.id} className="flex items-start gap-3">
                {v.action === 'APPROVED' ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {v.validatorName}
                    <span className={`ml-2 text-xs font-normal ${v.action === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>
                      {v.action === 'APPROVED' ? 'Approuvé' : 'Rejeté'}
                    </span>
                  </p>
                  {v.comment && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">"{v.comment}"</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(v.createdAt), 'dd/MM/yyyy à HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation actions */}
      {canValidate() && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">
            Validation
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => handleValidate('APPROVED')}
              disabled={validating}
              className="btn-primary flex items-center gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Approuver
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={validating}
              className="btn-danger flex items-center gap-2"
            >
              <XCircleIcon className="w-4 h-4" />
              Rejeter
            </button>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Motif de rejet
            </h3>
            <textarea
              className="input mb-4"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Indiquez le motif du rejet (optionnel)..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={() => handleValidate('REJECTED')}
                disabled={validating}
                className="btn-danger"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label} : </span>
      <span className="text-gray-900 font-medium whitespace-pre-line">{value}</span>
    </div>
  )
}
