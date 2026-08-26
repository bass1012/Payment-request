import React, { useEffect, useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface DocumentItem {
  id: string
  requestId: string
  requestRef: string
  docKind: 'PDF_REQUEST' | 'AUDIT_CERTIFICATE' | 'PROFORMA' | 'ATTACHMENT'
  title: string
  fileName: string
  filePath: string | null
  department: string
  createdAt: string
  downloadUrl: string
}

export default function DocumentCenterPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKind, setSelectedKind] = useState<string>('')

  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null)

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const res = await api.get('/documents', {
        params: { query: searchQuery, docKind: selectedKind },
      })
      setDocuments(res.data)
    } catch {
      toast.error('Erreur lors du chargement du centre documentaire.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [selectedKind])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchDocuments()
  }

  const handleDownload = async (doc: DocumentItem) => {
    setDownloadingDocId(doc.id)
    try {
      const response = await api.get(doc.downloadUrl, {
        responseType: 'blob',
      })

      const contentType = String(response.headers['content-type'] || 'application/pdf')
      const blob = new Blob([response.data], { type: contentType })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.fileName || `${doc.title}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      // Pas de fallback ?token= : exposer un JWT dans une URL est un risque de
      // sécurité (logs serveur, historique navigateur, en-tête Referer).
      // L'authentification se fait exclusivement via l'en-tête Authorization: Bearer.
      toast.error('Échec du téléchargement. Veuillez réessayer ou contacter l\'administrateur.')
    } finally {
      setDownloadingDocId(null)
    }
  }


  const getDocKindBadge = (kind: DocumentItem['docKind']) => {
    switch (kind) {
      case 'PDF_REQUEST':
        return <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">Formulaire Signé</span>
      case 'AUDIT_CERTIFICATE':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Preuve SHA-256</span>
      case 'PROFORMA':
        return <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">Offre Proforma</span>
      case 'ATTACHMENT':
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">Pièce Jointe</span>
      default:
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">{kind}</span>
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Centre Documentaire Unifié & Archivage</h1>
          <p className="text-xs text-slate-600 mt-1">
            Recherche centralisée des formulaires signés, certificats d'audit SHA-256, factures proforma et pièces annexes.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 pt-2">
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Rechercher par référence, nom de document, département..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
            className="text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
          >
            <option value="">Tous les types de documents</option>
            <option value="PDF_REQUEST">Formulaires Officiels Signés</option>
            <option value="AUDIT_CERTIFICATE">Certificats de Preuve SHA-256</option>
            <option value="PROFORMA">Offres Proforma</option>
            <option value="ATTACHMENT">Pièces Jointes Annexes</option>
          </select>

          <button type="submit" className="btn-primary text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm">
            Rechercher
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs font-semibold">Chargement des documents...</div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Aucun document trouvé</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Aucun document ne correspond à vos critères de recherche.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4">Document</th>
                  <th className="p-4">Référence Demande</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Département</th>
                  <th className="p-4">Date de Création</th>
                  <th className="p-4 text-right">Téléchargement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">
                      {doc.title}
                      <span className="block text-[11px] text-slate-500 font-mono font-normal">{doc.fileName}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-800 font-bold">{doc.requestRef}</td>
                    <td className="p-4">{getDocKindBadge(doc.docKind)}</td>
                    <td className="p-4 text-slate-700">{doc.department}</td>
                    <td className="p-4 text-slate-600 font-mono text-[11px]">
                      {format(new Date(doc.createdAt), 'dd MMMM yyyy', { locale: fr })}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingDocId === doc.id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors disabled:opacity-50"
                      >
                        {downloadingDocId === doc.id ? (
                          <svg className="animate-spin w-3.5 h-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        )}
                        {downloadingDocId === doc.id ? 'Chargement...' : 'Télécharger'}
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
