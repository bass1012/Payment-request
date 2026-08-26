import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import toast from 'react-hot-toast'
import type { Request } from '../types'
import { STATUS_LABELS, STATUS_BADGE_CLASS, TYPE_LABELS, getStatusLabel, isUserTurnMatch } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  PrinterIcon,
  ArrowLeftIcon,
  CurrencyDollarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import RequestDocumentsCard from '../components/requests/RequestDocumentsCard'
import RequestWorkflowPanel from '../components/requests/RequestWorkflowPanel'
import RequestValidationActions from '../components/requests/RequestValidationActions'
import RequestDetailDialogs from '../components/requests/RequestDetailDialogs'
import { SignatureAuditTrail } from '../components/requests/SignatureAuditTrail'
import { RevisionDiffViewer } from '../components/requests/RevisionDiffViewer'
import CommentSection from '../components/requests/CommentSection'
import type { PaymentValidationPayload } from '../components/requests/RequestPaymentForm'

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [comment, setComment] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string>('')
  const [previewType, setPreviewType] = useState<'pdf' | 'image' | 'other'>('other')

  useEffect(() => {
    const closeModalOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (previewUrl) closePreview()
      else if (showRejectModal) setShowRejectModal(false)
    }
    document.addEventListener('keydown', closeModalOnEscape)
    return () => document.removeEventListener('keydown', closeModalOnEscape)
  }, [previewUrl, showRejectModal])

  const getFileType = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    if (ext === 'pdf') return 'pdf'
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) return 'image'
    return 'other'
  }

  const handlePreviewFile = async (filePath: string, fileName: string, isMainPdf = false) => {
    setValidating(true)
    try {
      let res;
      if (isMainPdf) {
        res = await api.get(`/requests/${id}/pdf`, { responseType: 'blob' })
      } else {
        res = await api.get(filePath, { responseType: 'blob' })
      }

      const type = getFileType(fileName)
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        image: 'image/jpeg',
      }
      const mime = mimeMap[type] || res.data.type || 'application/octet-stream'
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mime }))
      setPreviewUrl(url)
      setPreviewName(fileName)
      setPreviewType(type)
    } catch {
      toast.error('Erreur lors du chargement du fichier')
    } finally {
      setValidating(false)
    }
  }

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const res = await api.get(filePath, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Erreur lors du téléchargement du fichier')
    }
  }

  const closePreview = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      window.URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setPreviewName('')
    setPreviewType('other')
  }

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

    // Si la demande est déjà clôturée, rejetée ou en brouillon, personne ne peut plus valider
    if (['CLOSED', 'REJECTED', 'DRAFT'].includes(request.status)) return false

    // Si la demande est en cours de traitement IT, seuls les profils IT, ADMIN ou Moyens Généraux peuvent la clôturer
    if (request.status === 'IN_PROGRESS_IT' || request.status === 'PROCESSING') {
      return ['IT', 'ADMIN', 'IT_ADMIN', 'SUPER_ADMIN', 'MOYENS_GENERAUX'].includes(user.role)
    }

    // Sinon, l'utilisateur connecté doit avoir le même e-mail que le valideur attendu à cette étape (ou un des valideurs si liste séparée par des virgules),
    // OU être administrateur (pour pouvoir débloquer la demande en cas d'absence)
    if (typeof request.canCurrentUserValidate === 'boolean') return request.canCurrentUserValidate
    return isUserTurnMatch(request.nextValidatorEmail, user.email)
  }

  const handleValidate = async (action: 'APPROVED' | 'REJECTED' | 'REQUEST_CORRECTION', extraData?: Record<string, unknown>) => {
    if (!id) return
    setValidating(true)
    try {
      await api.post(`/requests/${id}/validate`, { action, comment, ...extraData })
      const toastMsg = action === 'APPROVED'
        ? 'Demande approuvée !'
        : action === 'REQUEST_CORRECTION'
          ? 'Demande de correction transmise au demandeur'
          : 'Demande rejetée'
      toast.success(toastMsg)
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] })
      setShowRejectModal(false)
      setComment('')
      load()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erreur lors de la validation'
      toast.error(msg)
    } finally {
      setValidating(false)
    }
  }


  const handlePaymentValidation = (payload: PaymentValidationPayload) => {
    setValidating(true)
    api.post(`/requests/${id}/validate`, {
      action: 'APPROVED',
      ...payload,
    })
      .then(() => {
      toast.success('Paiement validé avec succès !')
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      load()
      })
      .catch(() => toast.error('Erreur lors de la validation du paiement'))
      .finally(() => setValidating(false))
  }

  const handleCloseRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setValidating(true)
    try {
      await api.post(`/requests/${id}/close`, { note: comment })
      toast.success('Demande clôturée avec succès ! Les signataires ont été notifiés.')
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      setComment('')
      load()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erreur lors de la clôture de la demande'
      toast.error(msg)
    } finally {
      setValidating(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!id) return
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette demande ? Cette action est irréversible.')) return

    setCancelling(true)
    try {
      await api.post(`/requests/${id}/cancel`)
      toast.success('Demande annulée avec succès')
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      load()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erreur lors de l\'annulation de la demande'
      toast.error(msg)
    } finally {
      setCancelling(false)
    }
  }

  const handlePDF = async () => {
    if (!id) return
    try {
      const res = await api.get(`/requests/${id}/pdf`, { responseType: 'blob' })
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

  const handleDelete = async () => {
    if (!id || !request) return
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la demande ${request.referenceNumber} ? Cette action est irréversible et effacera tous les justificatifs liés.`)) {
      setValidating(true)
      try {
        await api.delete(`/requests/${id}`)
        toast.success('Demande supprimée avec succès')
        queryClient.invalidateQueries({ queryKey: ['requests'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
        queryClient.invalidateQueries({ queryKey: ['admin-requests'] })
        navigate('/')
      } catch {
        toast.error('Erreur lors de la suppression de la demande')
      } finally {
        setValidating(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400 py-24">Chargement...</div>
    )
  }

  if (!request) return null

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
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
          {(() => {
            const isUserTurn = request.canCurrentUserValidate ?? isUserTurnMatch(request.nextValidatorEmail, user?.email);
            const badgeClass = isUserTurn ? 'badge-decision' : STATUS_BADGE_CLASS[request.status];
            const statusText = getStatusLabel(request, user?.email);
            return (
              <span className={`text-sm ${badgeClass}`}>
                {statusText}
              </span>
            );
          })()}
          <button
            onClick={handlePDF}
            className="btn-secondary flex items-center gap-2 text-sm py-1.5"
          >
            <PrinterIcon className="w-4 h-4" />
            PDF
          </button>
          {user?.role === 'ADMIN' && (
            <button
              onClick={handleDelete}
              disabled={validating}
              className="btn-danger flex items-center gap-2 text-sm py-1.5"
            >
              <TrashIcon className="w-4 h-4" />
              Supprimer
            </button>
          )}
        </div>
      </div>

      {request.sla && (
        <section
          className={`rounded-2xl border p-4 ${
            request.sla.isOverdue
              ? 'border-red-200 bg-red-50'
              : 'border-blue-100 bg-blue-50/70'
          }`}
          aria-label="Suivi du délai de traitement"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Ancienneté du dossier</p>
              <p className="font-bold text-slate-900 mt-1">
                {request.sla.requestAgeDays} jour{request.sla.requestAgeDays > 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Délai de l’étape</p>
              <p className={`font-bold mt-1 ${request.sla.isOverdue ? 'text-red-700' : 'text-slate-900'}`}>
                {request.sla.targetBusinessDays
                  ? `${request.sla.stageAgeBusinessDays}/${request.sla.targetBusinessDays} jours ouvrés`
                  : 'Aucun délai actif'}
              </p>
              {request.sla.targetAt && (
                <p className="text-xs text-slate-500 mt-1">
                  Échéance : {format(new Date(request.sla.targetAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Étape bloquante</p>
              <p className="font-bold text-slate-900 mt-1">
                {request.sla.blockerLabel || 'Aucune'}
              </p>
            </div>
          </div>
          {request.sla.isOverdue && (
            <p className="mt-3 text-sm font-semibold text-red-700" role="alert">
              Le délai cible de cette étape est dépassé.
            </p>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Colonne Gauche : Détails & Actions */}
        <div className="lg:col-span-2 space-y-6">

          {/* Info card */}
          <div className="card space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
          Demandeur
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-xs text-blue-700 mt-4">
                <span className="font-semibold">NB :</span> Un délai de 5 jours ouvrés est requis pour la livraison du matériel à compter de la réception de la dernière validation (après la validation de la Direction Générale).
              </div>
            </>
          )}
          {request.type === 'CASH' && (
            <>
              {request.requestedAmount && (
                <InfoRow
                  label="Montant demandé"
                  value={`${request.requestedAmount.toLocaleString('fr-FR')} FCFA`}
                />
              )}
              {request.requestReason && (
                <InfoRow label="Motif du règlement" value={request.requestReason} />
              )}
            </>
          )}
          {request.type === 'SUPPLY' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Rubrique d'imputation" value={request.allocationSection || '—'} />
                {((request.linkedAssets && request.linkedAssets.length > 0) || request.linkedAssetRequestRef) && (
                  <div className="space-y-1.5 md:col-span-2">
                    <span className="text-gray-500 block font-semibold text-xs uppercase tracking-wide">Demandes d'actifs liées :</span>
                    <div className="flex flex-wrap gap-2">
                      {request.linkedAssets && request.linkedAssets.length > 0 ? (
                        request.linkedAssets.map((asset, idx) => (
                          <Link
                            key={idx}
                            to={`/requests/${asset.id}`}
                            className="text-blue-600 hover:text-blue-800 font-bold underline font-mono text-xs bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1 shadow-sm transition-all hover:bg-blue-100/50"
                          >
                            🔗 {asset.ref}
                          </Link>
                        ))
                      ) : (
                        request.linkedAssetRequestRef && (
                          <Link
                            to={`/requests/${request.linkedAssetRequestId}`}
                            className="text-blue-600 hover:text-blue-800 font-bold underline font-mono text-xs bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1 shadow-sm transition-all hover:bg-blue-100/50"
                          >
                            🔗 {request.linkedAssetRequestRef}
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <span className="font-semibold text-gray-500 block mb-1">Nature des Dépenses :</span>
                <div className="flex flex-wrap gap-2">
                  {request.expenseNature && request.expenseNature.length > 0 ? (
                    request.expenseNature.map((nature, idx) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium border border-blue-100">
                        {nature}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 font-medium">Non spécifiée</span>
                  )}
                </div>
              </div>

              <div className="mt-4 border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
                    <tr>
                      <th className="p-3">Désignation article</th>
                      <th className="p-3 text-center">Quantité</th>
                      <th className="p-3 text-right">Prix Unitaire</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {request.items && request.items.length > 0 ? (
                      request.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-medium text-slate-800">{item.designation}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">{item.price ? `${item.price.toLocaleString('fr-FR')} FCFA` : '—'}</td>
                          <td className="p-3 text-right font-semibold text-slate-900">
                            {item.price ? `${(item.quantity * item.price).toLocaleString('fr-FR')} FCFA` : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-gray-400">Aucun article saisi</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="font-bold text-gray-700 text-xs uppercase tracking-wide block mb-2">Fournisseurs possibles</span>
                  <div className="space-y-1 text-sm text-slate-600">
                    {request.possibleSuppliers && request.possibleSuppliers.length > 0 ? (
                      request.possibleSuppliers.map((s, idx) => (
                        <div key={idx} className="font-medium text-slate-800">{idx + 1}. {s}</div>
                      ))
                    ) : (
                      <span className="text-gray-400 font-medium">Aucun fournisseur renseigné</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="font-bold text-gray-700 text-xs uppercase tracking-wide block mb-2">Sous-traitants consultés</span>
                  <div className="space-y-1 text-sm text-slate-600">
                    {request.consultedSubcontractors && request.consultedSubcontractors.length > 0 ? (
                      request.consultedSubcontractors.map((s, idx) => (
                        <div key={idx} className="font-medium text-slate-800">{idx + 1}. {s}</div>
                      ))
                    ) : (
                      <span className="text-gray-400 font-medium">Aucun sous-traitant renseigné</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <InfoRow label="Adresse de livraison" value={request.deliveryAddress || '—'} />
                {request.offersAmount !== undefined && (
                  <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100/60 font-semibold text-blue-900">
                    <InfoRow label="Montant des Offres" value={`${(request.offersAmount || 0).toLocaleString('fr-FR')} FCFA`} />
                  </div>
                )}
              </div>
            </div>
          )}
          {request.type === 'OTHER' && request.description && (
            <InfoRow label="Description" value={request.description} />
          )}
        </div>
      </div>

      {/* Mémo d'attribution */}
      {request.type === 'ASSET' && request.memoMaterial && (
        <div className="card border-l-4 border-blue-500 bg-blue-50/10 space-y-3">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <h2 className="font-bold text-blue-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <span className="p-1 bg-blue-500 text-white rounded text-[10px] leading-none">MEMO</span>
              Mémo d'attribution d'actifs
            </h2>
            {request.memoSentAt && (
              <span className="text-xs text-blue-600 bg-blue-100/60 px-2.5 py-1 rounded-full font-medium">
                Transmis aux Moyens Généraux
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoRow label="Modèle / Matériel" value={request.memoMaterial} />
            <InfoRow label="Taille écran" value={request.memoScreenSize || '—'} />
          </div>
          <div className="text-sm space-y-2 border-t border-gray-100/60 pt-2">
            <div className="flex flex-col md:flex-row gap-1 md:gap-4 pb-2">
              <span className="font-medium text-gray-500 min-w-[150px]">Caractéristiques :</span>
              <span className="text-gray-800 bg-white border border-gray-100 rounded-lg p-2.5 font-mono text-xs flex-1 whitespace-pre-wrap">
                {request.memoSpecs}
              </span>
            </div>
            <div className="flex flex-col md:flex-row gap-1 md:gap-4">
              <span className="font-medium text-gray-500 min-w-[150px]">Accessoires fournis :</span>
              <span className="text-gray-800 flex-1">{request.memoAccessories || '—'}</span>
            </div>
          </div>
        </div>
      )}

      <RequestDocumentsCard
        request={request}
        onPreview={handlePreviewFile}
        onDownload={handleDownloadFile}
        onDownloadMainPdf={handlePDF}
      />

      {/* Commentaires contextualisés */}
      <CommentSection
        requestId={request.id}
        currentStep={request.currentStep}
        requestStatus={request.status}
      />

      {/* Payment details card */}
      {request.paymentAmount !== null && request.paymentAmount !== undefined && (
        <div className="card space-y-3 bg-purple-50/50 border-purple-200">
          <h2 className="font-semibold text-purple-700 text-sm uppercase tracking-wide flex items-center gap-2">
            <CurrencyDollarIcon className="w-5 h-5 text-purple-600" />
            Informations de Règlement (Trésorerie)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <InfoRow label="Montant réglé" value={`${request.paymentAmount.toLocaleString('fr-FR')} FCFA`} />
            <InfoRow label="Référence du paiement" value={request.paymentReference || '—'} />
            {request.paymentComment && <div className="col-span-2"><InfoRow label="Commentaire Trésorerie" value={request.paymentComment} /></div>}
            {request.paymentValidatedAt && (
              <div className="col-span-2">
                <InfoRow
                  label="Date de validation"
                  value={format(new Date(request.paymentValidatedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comparateur visuel de révisions si plusieurs versions existent */}
      <RevisionDiffViewer request={request} />

      {/* Bannière de demande de correction pour le demandeur */}
      {request.status === 'CORRECTION_REQUESTED' && request.requesterId === user?.id && (
        <div className="card border-amber-200 bg-amber-50 space-y-3 rounded-2xl shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-amber-900 text-sm">Une correction a été demandée sur votre dossier</h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Motif indiqué par le valideur : <span className="font-semibold">{request.rejectionReason || 'Merci de revoir les informations transmises.'}</span>
              </p>
              <div className="pt-2">
                <button
                  onClick={() => navigate(`/requests/${id}/edit`)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  ✏️ Modifier & Resoumettre une révision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Journal d'audit cryptographique & preuve de signature native */}
      <SignatureAuditTrail request={request} />

      {/* Actions de l'auteur de la demande */}
      {request.requesterId === user?.id && request.status === 'DRAFT' && (

        <div className="card space-y-4 border-red-150 bg-red-50/10 rounded-2xl shadow-sm">
          <h2 className="font-semibold text-red-800 text-sm uppercase tracking-wide flex items-center gap-2">
            ⚙️ Options de l'Auteur
          </h2>
          <p className="text-xs text-gray-600">
            En tant que créateur de cette demande, vous pouvez l'annuler définitivement ou modifier ses informations tant qu'elle est en cours de validation.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCancelRequest}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {cancelling ? 'Annulation...' : '❌ Annuler la demande'}
            </button>
            <button
              onClick={() => navigate(`/requests/${id}/edit`)}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold px-4 py-2 rounded-xl text-xs transition-colors border border-blue-200 flex items-center gap-1.5"
            >
              ✏️ Modifier la demande
            </button>
          </div>
        </div>
      )}

      <RequestValidationActions
        request={request}
        visible={canValidate()}
        validating={validating}
        comment={comment}
        onCommentChange={setComment}
        onValidate={handleValidate}
        onPayment={handlePaymentValidation}
        onClose={handleCloseRequest}
        onOpenReject={() => setShowRejectModal(true)}
      />

        </div> {/* Fin Colonne Gauche */}

        <RequestWorkflowPanel request={request} />

      </div> {/* Fin Grid */}

      <RequestDetailDialogs
        showReject={showRejectModal}
        comment={comment}
        validating={validating}
        previewUrl={previewUrl}
        previewName={previewName}
        previewType={previewType}
        onCommentChange={setComment}
        onCancelReject={() => setShowRejectModal(false)}
        onConfirmReject={() => handleValidate('REJECTED')}
        onClosePreview={closePreview}
      />
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
