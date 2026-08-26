import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useRequests } from '../hooks/useRequests'
import { useStats } from '../hooks/useStats'
import type { PaginatedResponse, Request, RequestType } from '../types'
import {
  VALID_REQUEST_TYPES as REQUEST_TYPES,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  TYPE_LABELS,
  getStatusLabel,
  isUserTurnMatch,
} from '../types'

interface Stats {
  total: number
  pending: number
  inProgress: number
  closed: number
  rejected: number
}

type WorkScope = 'mine' | 'action' | 'completed'

const REQUEST_TYPE_ICONS: Record<RequestType, string> = {
  ASSET: '💻',
  EMAIL: '📧',
  PRINT: '🖨️',
  CASH: '💵',
  SUPPLY: '📦',
  OTHER: '📋',
}

const EMPTY_PAGE: PaginatedResponse<Request> = {
  data: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [scope, setScope] = useState<WorkScope>('mine')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)

  // React Query hooks
  const { data: stats, isLoading: loading } = useStats()
  const { data: priorityData } = useRequests({ scope: 'action', limit: 5, page: 1 })
  const priorityRequests = priorityData?.data ?? []
  const priorityTotal = priorityData?.total ?? 0
  const { data: result = EMPTY_PAGE, isLoading: listLoading } = useRequests({
    scope, search: search || undefined, status: status || undefined,
    type: type || undefined, page, limit: 10,
    sortBy: 'createdAt', sortOrder: 'desc',
  })

  function selectScope(nextScope: WorkScope) {
    setScope(nextScope)
    setPage(1)
    setStatus('')
  }

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const isValidator = user && user.role !== 'EMPLOYEE'

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {format(now, 'EEEE d MMMM yyyy', { locale: fr })}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {greeting},{' '}
            <span className="text-mct-blue">
              {user?.firstName}
            </span>{' '}
            👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Vos demandes et décisions, organisées par priorité.
          </p>
        </div>
        <Link
          to="/new-request"
          id="btn-new-request"
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all text-sm"
        >
          <span className="text-lg">＋</span>
          Nouvelle demande
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-28 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label={isValidator ? 'Dossiers visibles' : 'Mes demandes'}
            value={stats.total}
            icon="📊"
            accent="from-blue-500 to-blue-600"
            bg="bg-blue-50"
            text="text-blue-700"
          />
          <StatCard
            label="À traiter par moi"
            value={priorityTotal}
            icon="⚡"
            accent="from-amber-500 to-orange-500"
            bg="bg-amber-50"
            text="text-amber-700"
          />
          <StatCard
            label="En traitement"
            value={stats.inProgress}
            icon="⚙️"
            accent="from-sky-500 to-cyan-500"
            bg="bg-sky-50"
            text="text-sky-700"
          />
          <StatCard
            label="Clôturées"
            value={stats.closed}
            icon="✅"
            accent="from-green-500 to-emerald-500"
            bg="bg-green-50"
            text="text-green-700"
          />
        </div>
      )}

      <section className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-white/10">
          <div>
            <h2 className="font-bold text-lg">À traiter par moi</h2>
            <p className="text-blue-200 text-xs mt-1">
              Les décisions qui attendent votre intervention
            </p>
          </div>
          <button
            type="button"
            onClick={() => selectScope('action')}
            className="text-xs font-semibold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl"
          >
            Voir tout ({priorityTotal})
          </button>
        </div>
        {priorityRequests.length === 0 ? (
          <p className="px-6 py-8 text-sm text-blue-100">Aucune action en attente.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-px bg-white/10">
            {priorityRequests.map((request) => (
              <Link
                key={request.id}
                to={`/requests/${request.id}`}
                className="bg-slate-900/80 hover:bg-blue-900/80 p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-2xl">{REQUEST_TYPE_ICONS[request.type]}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    request.sla?.isOverdue
                      ? 'bg-red-400 text-red-950'
                      : 'bg-amber-400 text-amber-950'
                  }`}>
                    {request.sla?.isOverdue
                      ? 'Délai dépassé'
                      : formatDistanceToNow(new Date(request.createdAt), { locale: fr })}
                  </span>
                </div>
                <p className="font-mono text-xs text-blue-200 mt-4">{request.referenceNumber}</p>
                <p className="font-semibold text-sm mt-1 line-clamp-2">{TYPE_LABELS[request.type]}</p>
                {request.sla?.blockerLabel && (
                  <p className="text-[11px] text-amber-200 mt-2 line-clamp-1">
                    Bloqué à : {request.sla.blockerLabel}
                  </p>
                )}
                <p className="text-xs text-slate-300 mt-3">Ouvrir le dossier →</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {([
          ['ASSET', 'Matériel informatique', 'ENR.SI.008'],
          ['EMAIL', 'Adresse email', 'ENR.SI.005'],
          ['PRINT', 'Impression couleur', 'ENR.SI.006'],
          ['CASH', 'Bon de Caisse', 'ENR.RF.002'],
          ['SUPPLY', 'Approvisionnement', 'ENR.GA.003'],
          ['OTHER', 'Autre demande', '—'],
        ] as Array<[RequestType, string, string]>).map(([requestType, label, code]) => (
          <Link
            key={requestType}
            to={`/new-request?type=${requestType}`}
            className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div className="flex justify-between gap-2">
              <span className="text-2xl">{REQUEST_TYPE_ICONS[requestType]}</span>
              <span className="text-[9px] text-slate-400 font-mono">{code}</span>
            </div>
            <p className="font-bold text-slate-800 text-xs mt-3">{label}</p>
          </Link>
        ))}
      </div>

      <section className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 md:px-6 pt-5 border-b border-slate-100">
          <div className="flex flex-wrap gap-2 mb-5">
            {([
              ['mine', 'Mes demandes'],
              ['action', 'À valider'],
              ['completed', 'Terminées'],
            ] as Array<[WorkScope, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => selectScope(value)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  scope === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
                {value === 'action' && priorityTotal > 0 ? ` (${priorityTotal})` : ''}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 pb-5">
            <label className="relative">
              <span className="sr-only">Rechercher une demande</span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Référence, demandeur, département…"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </label>
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value)
                setPage(1)
              }}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"
              aria-label="Filtrer par type"
            >
              <option value="">Tous les types</option>
              {REQUEST_TYPES.map((requestType) => (
                <option key={requestType} value={requestType}>{TYPE_LABELS[requestType]}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"
              aria-label="Filtrer par statut"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/70">
          <p className="text-sm font-semibold text-slate-700">{result.total} dossier(s)</p>
          <p className="text-xs text-slate-400">
            Page {result.page} sur {Math.max(1, result.totalPages)}
          </p>
        </div>

        {listLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="animate-pulse h-14 bg-slate-50 rounded-xl" />
            ))}
          </div>
        ) : result.data.length === 0 ? (
          <div className="text-center py-14 px-6">
            <div className="text-5xl mb-3">📂</div>
            <h3 className="font-semibold text-slate-700">Aucun dossier trouvé</h3>
            <p className="text-slate-400 text-sm mt-1">Modifiez les filtres ou créez une demande.</p>
          </div>
        ) : (
          <RequestTable requests={result.data} userEmail={user?.email} />
        )}

        {result.totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={page >= result.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function RequestTable({ requests, userEmail }: { requests: Request[]; userEmail?: string }) {
  return (
    <>
      <div className="grid gap-3 p-4 md:hidden">
        {requests.map((request) => {
          const isUserTurn = request.canCurrentUserValidate ?? isUserTurnMatch(request.nextValidatorEmail, userEmail)
          return (
            <article key={request.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-500">{request.referenceNumber}</p>
                  <h3 className="font-semibold text-slate-800 mt-1">
                    {REQUEST_TYPE_ICONS[request.type]} {TYPE_LABELS[request.type]}
                  </h3>
                </div>
                <span className={isUserTurn ? 'badge-decision' : STATUS_BADGE_CLASS[request.status]}>
                  {getStatusLabel(request, userEmail)}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div>
                  <dt className="text-slate-400">Demandeur</dt>
                  <dd className="text-slate-700 mt-0.5">{request.requesterName}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Date</dt>
                  <dd className="text-slate-700 mt-0.5">
                    {format(new Date(request.createdAt), 'dd/MM/yyyy', { locale: fr })}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-400">Délai</dt>
                  <dd className="mt-1"><SlaIndicator request={request} /></dd>
                </div>
              </dl>
              <Link
                to={`/requests/${request.id}`}
                className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-semibold"
                aria-label={`Voir la demande ${request.referenceNumber}`}
              >
                Ouvrir le dossier
              </Link>
            </article>
          )
        })}
      </div>
      <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            {['Référence', 'Type', 'Demandeur', 'Statut', 'Délai', 'Date', ''].map((label) => (
              <th key={label} className="text-left px-6 py-3 text-xs uppercase tracking-wider text-slate-400">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {requests.map((request) => {
            const isUserTurn = request.canCurrentUserValidate ?? isUserTurnMatch(request.nextValidatorEmail, userEmail)
            return (
              <tr key={request.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{request.referenceNumber}</td>
                <td className="px-6 py-4 text-slate-700">
                  {REQUEST_TYPE_ICONS[request.type]} {TYPE_LABELS[request.type]}
                </td>
                <td className="px-6 py-4 text-slate-500">{request.requesterName}</td>
                <td className="px-6 py-4">
                  <span className={isUserTurn ? 'badge-decision' : STATUS_BADGE_CLASS[request.status]}>
                    {getStatusLabel(request, userEmail)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <SlaIndicator request={request} />
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {format(new Date(request.createdAt), 'dd/MM/yyyy', { locale: fr })}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    to={`/requests/${request.id}`}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Voir →
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </>
  )
}

function SlaIndicator({ request }: { request: Request }) {
  if (!request.sla?.targetBusinessDays) {
    return <span className="text-xs text-slate-400">—</span>
  }

  return (
    <span
      className={`inline-flex flex-col text-xs ${
        request.sla.isOverdue ? 'text-red-700 font-semibold' : 'text-slate-600'
      }`}
      title={request.sla.blockerLabel || undefined}
    >
      <span>
        {request.sla.isOverdue
          ? `Retard · ${request.sla.stageAgeBusinessDays} j ouvrés`
          : `${request.sla.stageAgeBusinessDays}/${request.sla.targetBusinessDays} j ouvrés`}
      </span>
      {request.sla.blockerLabel && (
        <span className="max-w-40 truncate text-[10px] opacity-75">{request.sla.blockerLabel}</span>
      )}
    </span>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
  bg,
  text,
}: {
  label: string
  value: number
  icon: string
  accent: string
  bg: string
  text: string
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${bg} border border-white shadow-sm p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-3xl font-extrabold ${text}`}>{value}</p>
          <p className={`text-xs font-medium mt-1.5 opacity-70 ${text}`}>{label}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accent}`} />
    </div>
  )
}
