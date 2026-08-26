import { useEffect, useState } from 'react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import type { Request } from '../types'
import { STATUS_LABELS, STATUS_BADGE_CLASS, TYPE_LABELS, getStatusLabel, isUserTurnMatch } from '../types'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline'

export default function TreasuryDashboardPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('PENDING')
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, totalAmount: 0 })

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch stats
      const statsRes = await api.get('/requests/stats')
      
      // Fetch requests
      const reqsRes = await api.get('/requests?limit=100')
      const allReqs: Request[] = reqsRes.data.data

      // Compute simple client-side stats for Treasury
      const pendingReqs = allReqs.filter(r => r.status === 'PENDING_PAYMENT')
      const paidReqs = allReqs.filter(r => r.paymentAmount !== null && r.paymentAmount !== undefined)
      const totalPaidAmount = paidReqs.reduce((sum, r) => sum + (r.paymentAmount ?? 0), 0)

      setStats({
        total: allReqs.length,
        pending: pendingReqs.length,
        paid: paidReqs.length,
        totalAmount: totalPaidAmount,
      })

      // Filter requests for display
      if (filter === 'PENDING') {
        setRequests(pendingReqs)
      } else if (filter === 'PAID') {
        setRequests(paidReqs)
      } else {
        setRequests(allReqs)
      }
    } catch {
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filter])

  const handleExport = async () => {
    try {
      const res = await api.get('/requests/export/csv', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `mct-demandes-it-paiements-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Export CSV téléchargé avec succès !')
    } catch {
      toast.error('Erreur lors de l\'exportation')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portail Trésorerie</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion et règlement des demandes IT validées</p>
        </div>
        <button
          onClick={handleExport}
          className="btn-primary flex items-center justify-center gap-2 py-2.5 px-4 shadow-sm"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          Exporter l'historique (CSV)
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="En attente de paiement"
          value={stats.pending}
          icon={ClockIcon}
          color="bg-purple-50 text-purple-700 border-purple-100"
        />
        <StatCard
          title="Demandes réglées"
          value={stats.paid}
          icon={CheckBadgeIcon}
          color="bg-green-50 text-green-700 border-green-100"
        />
        <StatCard
          title="Montant total payé"
          value={`${stats.totalAmount.toLocaleString('fr-FR')} FCFA`}
          icon={CurrencyDollarIcon}
          color="bg-blue-50 text-blue-700 border-blue-100"
        />
        <StatCard
          title="Total des dossiers"
          value={stats.total}
          icon={CheckBadgeIcon}
          color="bg-gray-50 text-gray-700 border-gray-100"
        />
      </div>

      {/* Tabs / Filters */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            filter === 'PENDING'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          À payer ({stats.pending})
        </button>
        <button
          onClick={() => setFilter('PAID')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            filter === 'PAID'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Déjà payées ({stats.paid})
        </button>
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            filter === 'ALL'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Toutes les demandes
        </button>
      </div>

      {/* Requests Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 font-medium">Référence</th>
                  <th className="pb-3 font-medium">Demandeur</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Département</th>
                  <th className="pb-3 font-medium">Statut</th>
                  <th className="pb-3 font-medium">Montant</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {requests.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-3 font-mono text-xs text-gray-600 font-semibold">{r.referenceNumber}</td>
                    <td className="py-3">{r.requesterName}</td>
                    <td className="py-3 text-gray-600 truncate max-w-[160px]">{TYPE_LABELS[r.type]}</td>
                    <td className="py-3 text-gray-600">{r.department}</td>
                    <td className="py-3">
                      {(() => {
                        const isUserTurn = isUserTurnMatch(r.nextValidatorEmail, user?.email);
                        const badgeClass = isUserTurn ? 'badge-decision' : STATUS_BADGE_CLASS[r.status];
                        const statusText = getStatusLabel(r, user?.email);
                        return (
                          <span className={badgeClass}>
                            {statusText}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 font-medium text-gray-900">
                      {r.paymentAmount !== null && r.paymentAmount !== undefined ? (
                        <span className="text-green-600">{r.paymentAmount.toLocaleString('fr-FR')} FCFA</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-500">{format(new Date(r.createdAt), 'dd/MM/yyyy')}</td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/requests/${r.id}`}
                        className="text-purple-600 hover:text-purple-900 font-medium hover:underline"
                      >
                        {r.status === 'PENDING_PAYMENT' ? 'Payer' : 'Consulter'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && (
              <p className="text-center py-8 text-gray-400">Aucune demande dans cette catégorie</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 bg-white`}>
      <div className={`p-3 rounded-lg ${color.split(' ')[0]} ${color.split(' ')[1]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  )
}
