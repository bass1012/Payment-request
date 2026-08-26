import { useEffect, useState } from 'react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import type { Request } from '../types'
import { STATUS_LABELS, STATUS_BADGE_CLASS, TYPE_LABELS, getStatusLabel, isUserTurnMatch } from '../types'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

export default function MoyensGenerauxDashboardPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PROCESSING' | 'CLOSED'>('PROCESSING')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, processing: 0, closed: 0 })

  const loadData = async () => {
    setLoading(true)
    try {
      // Récupérer toutes les demandes visibles par l'utilisateur
      const reqsRes = await api.get('/requests?limit=200')
      const allReqs: Request[] = reqsRes.data.data

      // Moyens Généraux accèdent aux demandes validées (PROCESSING et CLOSED)
      const validatedReqs = allReqs.filter(r => r.status === 'PROCESSING' || r.status === 'CLOSED')
      const processingReqs = validatedReqs.filter(r => r.status === 'PROCESSING')
      const closedReqs = validatedReqs.filter(r => r.status === 'CLOSED')

      setStats({
        total: validatedReqs.length,
        processing: processingReqs.length,
        closed: closedReqs.length,
      })

      // Filtrer pour l'affichage selon l'onglet
      let displayReqs = validatedReqs
      if (filter === 'PROCESSING') {
        displayReqs = processingReqs
      } else if (filter === 'CLOSED') {
        displayReqs = closedReqs
      }

      // Appliquer la recherche (référence ou nom du demandeur)
      if (search) {
        const s = search.toLowerCase()
        displayReqs = displayReqs.filter(
          r =>
            r.referenceNumber.toLowerCase().includes(s) ||
            r.requesterName.toLowerCase().includes(s) ||
            (r.department && r.department.toLowerCase().includes(s))
        )
      }

      setRequests(displayReqs)
    } catch {
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filter, search])

  const handleExport = async () => {
    try {
      const res = await api.get('/requests/export/csv', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `mct-demandes-validees-mg-${format(new Date(), 'yyyy-MM-dd')}.csv`)
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
          <h1 className="text-2xl font-bold text-gray-900">Espace Moyens Généraux</h1>
          <p className="text-gray-500 text-sm mt-1">
            Suivi des demandes IT validées et prêtes pour mise à disposition des équipements
          </p>
        </div>
        <button
          onClick={handleExport}
          className="btn-primary flex items-center justify-center gap-2 py-2.5 px-4 shadow-sm"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          Exporter les demandes (CSV)
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="En cours de traitement"
          value={stats.processing}
          icon={ClockIcon}
          color="bg-blue-50 text-blue-700 border-blue-100"
        />
        <StatCard
          title="Demandes clôturées"
          value={stats.closed}
          icon={CheckBadgeIcon}
          color="bg-green-50 text-green-700 border-green-100"
        />
        <StatCard
          title="Total des dossiers validés"
          value={stats.total}
          icon={ClipboardDocumentListIcon}
          color="bg-gray-50 text-gray-700 border-gray-100"
        />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('PROCESSING')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              filter === 'PROCESSING'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            À traiter ({stats.processing})
          </button>
          <button
            onClick={() => setFilter('CLOSED')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              filter === 'CLOSED'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Clôturées ({stats.closed})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              filter === 'ALL'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Toutes ({stats.total})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder="Rechercher par réf., demandeur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement des données...</div>
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
                  <th className="pb-3 font-medium">Date validation</th>
                  <th className="pb-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {requests.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-3 font-mono text-xs text-gray-600 font-semibold">{r.referenceNumber}</td>
                    <td className="py-3 font-medium text-gray-900">{r.requesterName}</td>
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
                    <td className="py-3 text-gray-500">
                      {r.memoSentAt ? format(new Date(r.memoSentAt), 'dd/MM/yyyy HH:mm') : format(new Date(r.updatedAt), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/requests/${r.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium hover:underline"
                      >
                        Consulter
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && (
              <p className="text-center py-8 text-gray-400">Aucune demande trouvée</p>
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
    <div className="p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 bg-white hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-lg ${color.split(' ')[0]} ${color.split(' ')[1]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  )
}
