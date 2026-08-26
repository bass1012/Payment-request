import React, { useEffect, useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ObligationItem {
  id: string
  requestId: string
  title: string
  description?: string
  assigneeEmail: string
  dueDate: string
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE'
  effectiveStatus: 'PENDING' | 'COMPLETED' | 'OVERDUE'
  completedAt?: string
  isOverdue: boolean
  request: { id: string; reference: string; type: string }
}

export default function ObligationsPage() {
  const [obligations, setObligations] = useState<ObligationItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchObligations = async () => {
    setLoading(true)
    try {
      const res = await api.get('/obligations')
      setObligations(res.data)
    } catch {
      toast.error('Erreur lors du chargement des obligations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchObligations()
  }, [])

  const handleComplete = async (id: string) => {
    try {
      await api.patch(`/obligations/${id}/complete`)
      toast.success('Obligation marquée comme exécutée !')
      fetchObligations()
    } catch {
      toast.error('Erreur lors de la mise à jour de l\'obligation.')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Suivi des Obligations Post-Approbation</h1>
          <p className="text-xs text-slate-600 mt-1">
            Suivez l'exécution des engagements, livraisons de matériel et règlements d'achats consécutifs aux demandes approuvées.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs font-semibold">Chargement des obligations...</div>
      ) : obligations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Aucune obligation en attente</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Toutes les obligations d'exécution post-approbation sont actuellement à jour.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4">Obligation / Engagement</th>
                  <th className="p-4">Dossier Associé</th>
                  <th className="p-4">Responsable</th>
                  <th className="p-4">Date Limite (Échéance)</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {obligations.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-slate-900 font-semibold">
                      {item.title}
                      {item.description && (
                        <span className="block text-[11px] text-slate-500 font-normal">{item.description}</span>
                      )}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-800">{item.request.reference}</td>
                    <td className="p-4 text-slate-700 font-mono text-[11px]">{item.assigneeEmail}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-700">
                      {format(new Date(item.dueDate), 'dd MMMM yyyy', { locale: fr })}
                    </td>
                    <td className="p-4">
                      {item.status === 'COMPLETED' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ✓ Exécutée
                        </span>
                      ) : item.effectiveStatus === 'OVERDUE' ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                          En Retard
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          En cours
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {item.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleComplete(item.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                        >
                          Marquer exécutée
                        </button>
                      )}
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
