import { useMemo, useState } from 'react'
import { useReporting } from '../hooks/useReporting'

const TYPE_LABELS: Record<string, string> = {
  ASSET: 'Actifs informatiques',
  ENR_SI_008: 'Actifs informatiques',
  EMAIL: 'Adresses électroniques',
  ENR_SI_005: 'Adresses électroniques',
  PRINT: 'Impressions couleur',
  ENR_SI_006: 'Impressions couleur',
  CASH: 'Bons de caisse',
  ENR_RF_002: 'Bons de caisse',
  SUPPLY: 'Approvisionnements',
  ENR_GA_003: 'Approvisionnements',
  OTHER: 'Autres demandes',
  AUTRE: 'Autres demandes',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillons',
  SUBMITTED: 'Soumises',
  VALIDATION_N1: 'Validation N+1',
  VALIDATION_N2: 'Validation N+2',
  VALIDATION_DG: 'Validation DG',
  PENDING_PAYMENT: 'Paiement attendu',
  IN_PROGRESS_IT: 'En cours IT',
  PROCESSING: 'En traitement',
  CLOSED: 'Clôturées',
  REJECTED: 'Rejetées',
}

function toDateInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function getDefaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return { from: toDateInput(from), to: toDateInput(to) }
}

function formatHours(hours: number | null) {
  if (hours === null || !Number.isFinite(hours)) return '—'
  if (hours < 24) return `${hours.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h`
  return `${(hours / 24).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} j`
}

function formatPercentage(value: number | null) {
  return value === null ? '—' : `${value.toLocaleString('fr-FR')} %`
}

export default function ReportingPage() {
  const defaults = useMemo(getDefaultRange, [])
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [appliedRange, setAppliedRange] = useState(defaults)

  const rangeError = useMemo(() => {
    if (!from || !to) return 'Sélectionnez une date de début et une date de fin.'
    const fromDate = new Date(`${from}T00:00:00`)
    const toDate = new Date(`${to}T00:00:00`)
    if (fromDate > toDate) return 'La date de début doit précéder la date de fin.'
    const days = Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1
    if (days > 366) return 'La période ne peut pas dépasser 366 jours.'
    return ''
  }, [from, to])

  const { data, isLoading: loading, error: queryError } = useReporting({
    from: appliedRange.from, to: appliedRange.to,
    enabled: !rangeError,
  })
  const error = queryError ? 'Le reporting ne peut pas être chargé pour le moment.' : ''

  const maxTypeTotal = Math.max(1, ...(data?.byType.map((item) => item.total) ?? []))
  const maxStepHours = Math.max(1, ...(data?.byStep.map((item) => item.averageHours ?? 0) ?? []))

  function applyPreset(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - (days - 1))
    const nextRange = { from: toDateInput(start), to: toDateInput(end) }
    setFrom(nextRange.from)
    setTo(nextRange.to)
    setAppliedRange(nextRange)
  }

  return (
    <main className="p-4 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-600">Pilotage</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">Reporting des demandes</h1>
          <p className="text-sm text-slate-500 mt-2">
            Volumes, délais de traitement et respect des engagements de service.
          </p>
        </div>

        <form
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault()
            if (!rangeError) setAppliedRange({ from, to })
          }}
        >
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <label className="text-xs font-semibold text-slate-600">
              Du
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="input mt-1"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Au
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="input mt-1"
              />
            </label>
            <button type="submit" disabled={Boolean(rangeError)} className="btn-primary h-10">
              Appliquer
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-slate-400">Périodes rapides :</span>
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => applyPreset(days)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                {days} jours
              </button>
            ))}
          </div>
          {rangeError && <p role="alert" className="text-xs text-red-600 mt-2">{rangeError}</p>}
        </form>
      </header>

      {loading ? (
        <ReportingSkeleton />
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-3xl p-10 text-center" role="alert">
          <div className="text-4xl">⚠️</div>
          <h2 className="font-bold text-slate-800 mt-3">Chargement impossible</h2>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
          <button
            type="button"
            onClick={() => setAppliedRange({ ...appliedRange })}
            className="btn-primary mt-5"
          >
            Réessayer
          </button>
        </div>
      ) : !data || data.summary.total === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
          <div className="text-5xl">📊</div>
          <h2 className="font-bold text-slate-800 mt-4">Aucune donnée sur cette période</h2>
          <p className="text-sm text-slate-500 mt-1">Élargissez les dates pour afficher les indicateurs.</p>
        </div>
      ) : (
        <>
          <section aria-label="Indicateurs clés" className="grid grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4">
            <KpiCard label="Demandes" value={data.summary.total.toLocaleString('fr-FR')} note="Volume total" color="blue" />
            <KpiCard label="Taux de rejet" value={formatPercentage(data.summary.rejectionRate)} note="Dossiers rejetés" color="rose" />
            <KpiCard label="Respect SLA" value={formatPercentage(data.summary.slaComplianceRate)} note="Clôtures dans le délai" color="emerald" />
            <KpiCard label="Retards actifs" value={data.summary.activeOverdue.toLocaleString('fr-FR')} note="Action requise" color="amber" />
            <KpiCard label="Délai moyen" value={formatHours(data.summary.averageProcessingHours)} note="Création à clôture" color="indigo" />
          </section>

          <div className="grid xl:grid-cols-2 gap-6">
            <ReportPanel title="Répartition par type" description="Volume et rejet par formulaire">
              {data.byType.length === 0 ? (
                <EmptyBreakdown />
              ) : <div className="space-y-4">
                {data.byType.map((item) => (
                  <div key={item.type}>
                    <div className="flex items-end justify-between gap-4 text-sm">
                      <span className="font-medium text-slate-700">{TYPE_LABELS[item.type] || item.type}</span>
                      <span className="text-slate-500">{item.total} · {item.rejected} rejet(s)</span>
                    </div>
                    <div
                      className="h-3 rounded-full bg-slate-100 overflow-hidden mt-2"
                      role="meter"
                      aria-label={`${TYPE_LABELS[item.type] || item.type} : ${item.total} demandes`}
                      aria-valuemin={0}
                      aria-valuemax={maxTypeTotal}
                      aria-valuenow={item.total}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        style={{ width: `${Math.max(2, item.total / maxTypeTotal * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Délai moyen : {formatHours(item.averageProcessingHours)}</p>
                  </div>
                ))}
              </div>}
            </ReportPanel>

            <ReportPanel title="Temps moyen par étape" description="Étapes qui concentrent le plus d’attente">
              {data.byStep.length === 0 ? (
                <EmptyBreakdown />
              ) : <div className="space-y-4">
                {data.byStep.map((item) => (
                  <div key={item.stepLabel}>
                    <div className="flex items-end justify-between gap-4 text-sm">
                      <span className="font-medium text-slate-700">{item.stepLabel}</span>
                      <span className="text-slate-500">{formatHours(item.averageHours)}</span>
                    </div>
                    <div
                      className="h-3 rounded-full bg-slate-100 overflow-hidden mt-2"
                      role="meter"
                      aria-label={`${item.stepLabel} : ${formatHours(item.averageHours)}, ${item.samples} observations`}
                      aria-valuemin={0}
                      aria-valuemax={maxStepHours}
                      aria-valuenow={item.averageHours ?? 0}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                        style={{ width: `${Math.max(2, (item.averageHours ?? 0) / maxStepHours * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{item.samples} observation(s)</p>
                  </div>
                ))}
              </div>}
            </ReportPanel>
          </div>

          <ReportPanel title="État du portefeuille" description="Nombre de dossiers par statut">
            {data.byStatus.length === 0 ? (
              <EmptyBreakdown />
            ) : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 text-xs uppercase tracking-wider text-slate-400">Statut</th>
                    <th className="text-right py-3 text-xs uppercase tracking-wider text-slate-400">Dossiers</th>
                    <th className="text-right py-3 text-xs uppercase tracking-wider text-slate-400">Part</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.byStatus.map((item) => (
                    <tr key={item.status}>
                      <td className="py-3 font-medium text-slate-700">{STATUS_LABELS[item.status] || item.status}</td>
                      <td className="py-3 text-right text-slate-600">{item.total}</td>
                      <td className="py-3 text-right text-slate-500">
                        {(item.total / data.summary.total * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </ReportPanel>
        </>
      )}
    </main>
  )
}

function KpiCard({
  label,
  value,
  note,
  color,
}: {
  label: string
  value: string
  note: string
  color: 'blue' | 'rose' | 'emerald' | 'amber' | 'indigo'
}) {
  const colors = {
    blue: 'border-blue-100 bg-blue-50 text-blue-800',
    rose: 'border-rose-100 bg-rose-50 text-rose-800',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-100 bg-amber-50 text-amber-800',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-800',
  }
  return (
    <article className={`rounded-2xl border p-4 md:p-5 ${colors[color]}`}>
      <p className="text-xs font-semibold opacity-70">{label}</p>
      <p className="text-2xl md:text-3xl font-extrabold mt-2">{value}</p>
      <p className="text-[11px] opacity-60 mt-1">{note}</p>
    </article>
  )
}

function ReportPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm">
      <h2 className="font-bold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-400 mt-1 mb-6">{description}</p>
      {children}
    </section>
  )
}

function ReportingSkeleton() {
  return (
    <div aria-label="Chargement du reporting" role="status" className="space-y-6">
      <span className="sr-only">Chargement des indicateurs</span>
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-28 bg-white rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="grid xl:grid-cols-2 gap-6">
        <div className="h-80 bg-white rounded-3xl animate-pulse" />
        <div className="h-80 bg-white rounded-3xl animate-pulse" />
      </div>
    </div>
  )
}

function EmptyBreakdown() {
  return <p className="text-sm text-slate-400 py-8 text-center">Pas assez de données pour ce détail.</p>
}
