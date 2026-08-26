import React, { useEffect, useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface DelegationItem {
  id: string
  delegatorId: string
  delegateeId: string
  startDate: string
  endDate: string
  scope: string
  isActive: boolean
  note?: string
  delegator: { firstName: string; lastName: string; email: string }
  delegatee: { firstName: string; lastName: string; email: string }
}

const SCOPE_LABELS: Record<string, string> = {
  ALL: 'Toutes mes étapes de validation',
  DG: 'Étape Direction Générale uniquement',
  DGOF: 'Étape DGOF uniquement',
  TREASURY: 'Étape Trésorerie uniquement',
  IT: 'Étape Informatique uniquement',
  CASH: 'Demandes d’achat / règlement uniquement',
  ASSET: 'Demandes d’attribution de matériel uniquement',
}

export default function DelegationsPage() {
  const [delegations, setDelegations] = useState<DelegationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form states
  const [delegateeEmail, setDelegateeEmail] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [scope, setScope] = useState('ALL')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchDelegations = async () => {
    setLoading(true)
    try {
      const res = await api.get('/delegations')
      setDelegations(res.data)
    } catch {
      toast.error('Erreur lors du chargement des délégations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDelegations()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!delegateeEmail || !startDate || !endDate) {
      toast.error('Veuillez remplir tous les champs obligatoires.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/delegations', {
        delegateeEmail,
        startDate,
        endDate,
        scope,
        note,
      })
      toast.success('Délégation créée avec succès !')
      setShowModal(false)
      setDelegateeEmail('')
      setStartDate('')
      setEndDate('')
      setScope('ALL')
      setNote('')
      fetchDelegations()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création de la délégation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment révoquer cette délégation temporaire ?')) return
    try {
      await api.delete(`/delegations/${id}`)
      toast.success('Délégation révoquée.')
      fetchDelegations()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur lors de la révocation')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestion des Délégations Temporaires de Pouvoir</h1>
          <p className="text-xs text-slate-600 mt-1">
            Déclarez vos périodes de congés ou d'absence et habilitez temporairement un remplaçant à valider les dossiers en votre nom.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Créer une nouvelle délégation
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs font-semibold">Chargement des délégations...</div>
      ) : delegations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Aucune délégation enregistrée</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Vous n'avez pas encore défini de délégation temporaire ni reçu de mandat de la part d'un collègue.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4">Titulaire (Déléguant)</th>
                  <th className="p-4">Remplaçant (Délégué)</th>
                  <th className="p-4">Période de Validité</th>
                  <th className="p-4">Périmètre</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {delegations.map((d) => {
                  const now = new Date()
                  const start = new Date(d.startDate)
                  const end = new Date(d.endDate)
                  const isCurrentActive = d.isActive && now >= start && now <= end

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-900 font-semibold">
                        {d.delegator.firstName} {d.delegator.lastName}
                        <span className="block text-[11px] text-slate-500 font-normal">{d.delegator.email}</span>
                      </td>
                      <td className="p-4 text-slate-900 font-semibold">
                        {d.delegatee.firstName} {d.delegatee.lastName}
                        <span className="block text-[11px] text-slate-500 font-normal">{d.delegatee.email}</span>
                      </td>
                      <td className="p-4 text-slate-700 font-mono text-[11px]">
                        Du {format(start, 'dd/MM/yyyy')} au {format(end, 'dd/MM/yyyy')}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                          {SCOPE_LABELS[d.scope] || d.scope}
                        </span>
                      </td>
                      <td className="p-4">
                        {isCurrentActive ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            En cours
                          </span>
                        ) : d.isActive ? (
                          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">Programmé</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">Révoqué</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {d.isActive && (
                          <button
                            onClick={() => handleRevoke(d.id)}
                            className="text-red-600 hover:text-red-800 text-xs font-semibold px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                          >
                            Révoquer
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de création */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Déclarer une Délégation de Pouvoir</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail du remplaçant (Délégué) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ex: collègue@mct.ci"
                  value={delegateeEmail}
                  onChange={(e) => setDelegateeEmail(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date de début *</label>
                  <input
                    type="date"
                    required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date de fin *</label>
                  <input
                    type="date"
                    required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().slice(0, 10)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Périmètre autorisé</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="ALL">Toutes mes étapes de validation</option>
                  <option value="DG">Étape Direction Générale uniquement</option>
                  <option value="DGOF">Étape DGOF uniquement</option>
                  <option value="TREASURY">Étape Trésorerie uniquement</option>
                  <option value="IT">Étape Informatique uniquement</option>
                  <option value="CASH">Demandes d’achat / règlement uniquement</option>
                  <option value="ASSET">Demandes d’attribution de matériel uniquement</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Pour qu’un DGOF représente le DG, le DG doit créer lui-même une délégation avec le périmètre « Étape Direction Générale ».
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note explicative (optionnel)</label>
                <textarea
                  rows={2}
                  placeholder="ex: Absence pour congés annuels"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 btn-primary py-2.5 text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Enregistrement...' : 'Valider la délégation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
