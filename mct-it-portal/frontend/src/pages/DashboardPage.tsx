import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import type { Request, RequestStatus } from '../types'
import { STATUS_LABELS, STATUS_BADGE_CLASS, TYPE_LABELS } from '../types'
import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Stats {
  total: number
  pending: number
  inProgress: number
  closed: number
  rejected: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<Request[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      api.get('/requests?limit=10&page=1'),
      api.get('/requests/stats'),
    ])
      .then(([reqRes, statsRes]) => {
        if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data.data ?? [])
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {user?.firstName} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <Link to="/new-request" className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Nouvelle demande
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} color="blue" />
          <StatCard label="En attente" value={stats.pending} color="orange" />
          <StatCard label="En cours IT" value={stats.inProgress} color="sky" />
          <StatCard label="Clôturées" value={stats.closed} color="green" />
        </div>
      )}

      {/* Requests table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Mes demandes récentes
          </h2>
          <span className="text-sm text-gray-500">{requests.length} demandes</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune demande pour le moment</p>
            <Link to="/new-request" className="btn-primary inline-flex mt-4">
              Créer ma première demande
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-3 font-medium text-gray-500">Référence</th>
                  <th className="text-left pb-3 font-medium text-gray-500">Type</th>
                  <th className="text-left pb-3 font-medium text-gray-500">Statut</th>
                  <th className="text-left pb-3 font-medium text-gray-500">Date</th>
                  <th className="text-right pb-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-mono text-xs text-gray-600">
                      {r.referenceNumber}
                    </td>
                    <td className="py-3 text-gray-700 max-w-[200px] truncate">
                      {TYPE_LABELS[r.type]}
                    </td>
                    <td className="py-3">
                      <span className={STATUS_BADGE_CLASS[r.status]}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {format(new Date(r.createdAt), 'dd/MM/yyyy')}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/requests/${r.id}`}
                        className="text-mct-blue hover:underline font-medium"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'blue' | 'orange' | 'sky' | 'green'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
    sky: 'bg-sky-50 text-sky-700',
    green: 'bg-green-50 text-green-700',
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-1 opacity-80">{label}</p>
    </div>
  )
}
