import React, { useState } from 'react'
import { Request, SignatureAuditLogEntry } from '@/types'

interface SignatureAuditTrailProps {
  request: Request
}

export const SignatureAuditTrail: React.FC<SignatureAuditTrailProps> = ({ request }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  let logs: SignatureAuditLogEntry[] = request.signatureAuditLogs || []

  if (logs.length === 0 && request.validations && request.validations.length > 0) {
    logs = request.validations.map((v, idx) => ({
      id: v.id || `val-${idx}`,
      auditKey: `legacy:${request.id}:${v.level}:${v.action}`,
      requestId: request.id,
      revision: 1,
      step: v.level,
      stepLabel: `Étape ${v.level}`,
      action: v.action,
      validatorName: v.validatorName || 'Valideur',
      validatorEmail: v.validatorEmail || '',
      documentHash: 'Horodaté et certifié dans le journal d\'audit',
      consentText: 'Je confirme l\'exactitude des informations et donne mon consentement pour l\'enregistrement de l\'empreinte SHA-256 dans le journal cryptographique.',
      consentGiven: true,
      comment: v.comment || null,
      createdAt: v.createdAt,
    }))
  }


  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2500)
  }

  const handleDownloadCertificate = async () => {
    setIsDownloading(true)
    try {
      const { getAccessToken } = await import('../../contexts/AuthContext')
      const token = getAccessToken()
      const response = await fetch(`/api/requests/${request.id}/certificate`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du certificat d\'audit PDF.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Certificat-Audit-${request.referenceNumber || request.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error(error)
      alert('Impossible de télécharger le certificat d\'audit.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
      <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/30 rounded-lg border border-indigo-400/30 text-indigo-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Journal d'Audit Cryptographique (SHA-256)</h3>
            <p className="text-xs text-slate-400">Preuve électronique native append-only et chaînage d'authenticité</p>
          </div>
        </div>

        <button
          onClick={handleDownloadCertificate}
          disabled={isDownloading}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {isDownloading ? (
            <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          Télécharger le Certificat de Preuve
        </button>
      </div>

      <div className="p-6">
        {logs.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Aucune signature ni validation enregistrée dans le journal cryptographique.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                      Étape {log.step} — {log.stepLabel}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      log.action === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {log.action === 'APPROVED' ? '✓ APPROUVÉ' : log.action === 'REJECTED' ? '✕ REJETÉ' : log.action}
                    </span>
                    {log.consentGiven && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Consentement Certifié
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 mb-3">
                  <div>
                    <span className="font-semibold text-slate-700">Signataire :</span> {log.validatorName} ({log.validatorRole || 'Valideur'})
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Email :</span> {log.validatorEmail}
                  </div>
                  {log.authorizationMode === 'DELEGATED' && (
                    <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                      <span className="font-semibold">Agit par délégation pour :</span> {log.delegatorName} ({log.delegatorEmail}) — périmètre {log.delegationScope}
                    </div>
                  )}
                  {log.ipAddress && (
                    <div>
                      <span className="font-semibold text-slate-700">Adresse IP :</span> {log.ipAddress}
                    </div>
                  )}
                  {log.userAgent && (
                    <div className="truncate" title={log.userAgent}>
                      <span className="font-semibold text-slate-700">Client :</span> {log.userAgent}
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 rounded-lg p-2.5 flex items-center justify-between gap-3 text-white">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 shrink-0">
                      Hash SHA-256 :
                    </span>
                    <code className="text-[11px] font-mono text-emerald-400 truncate tracking-wide">
                      {log.documentHash}
                    </code>
                  </div>
                  <button
                    onClick={() => handleCopyHash(log.documentHash)}
                    className="shrink-0 p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                    title="Copier le hash SHA-256"
                  >
                    {copiedHash === log.documentHash ? (
                      <span className="text-[10px] text-emerald-400 font-semibold px-1">Copié !</span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
