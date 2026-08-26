export interface FormSectionProgress {
  id: string
  label: string
  description?: string
  errorCount?: number
  completed?: boolean
}

export interface FormErrorItem {
  field: string
  message: string
}

interface FormProgressProps {
  sections: FormSectionProgress[]
  activeSectionId: string
  onNavigate: (sectionId: string) => void
}

export default function FormProgress({
  sections,
  activeSectionId,
  onNavigate,
}: FormProgressProps) {
  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === activeSectionId),
  )
  const percentage = sections.length > 0
    ? Math.round(((activeIndex + 1) / sections.length) * 100)
    : 0

  return (
    <nav
      aria-label="Progression du formulaire"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">
          Étape {activeIndex + 1} sur {sections.length}
        </p>
        <span className="text-xs font-medium text-slate-500">{percentage}%</span>
      </div>

      <div
        className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Progression de la saisie"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <ol className="grid gap-2 sm:grid-cols-3">
        {sections.map((section, index) => {
          const isActive = section.id === activeSectionId
          const hasErrors = Boolean(section.errorCount)
          const isCompleted = section.completed || index < activeIndex

          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onNavigate(section.id)}
                aria-current={isActive ? 'step' : undefined}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : hasErrors
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                      hasErrors
                        ? 'bg-red-600 text-white'
                        : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {hasErrors ? '!' : isCompleted ? '✓' : index + 1}
                  </span>
                  {section.label}
                </span>
                {section.description && (
                  <span className="mt-1 block pl-8 text-xs opacity-75">
                    {section.description}
                  </span>
                )}
                {hasErrors && (
                  <span className="mt-1 block pl-8 text-xs font-medium">
                    {section.errorCount} champ{section.errorCount === 1 ? '' : 's'} à corriger
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface FormErrorSummaryProps {
  errors: FormErrorItem[]
  onSelect: (field: string) => void
}

export function FormErrorSummary({ errors, onSelect }: FormErrorSummaryProps) {
  if (errors.length === 0) return null

  return (
    <div
      role="alert"
      aria-labelledby="form-error-summary-title"
      tabIndex={-1}
      className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900"
    >
      <h3 id="form-error-summary-title" className="text-sm font-semibold">
        Vérifiez {errors.length} champ{errors.length === 1 ? '' : 's'} avant de continuer
      </h3>
      <ul className="mt-2 space-y-1 text-sm">
        {errors.map((error) => (
          <li key={error.field}>
            <button
              type="button"
              onClick={() => onSelect(error.field)}
              className="text-left underline decoration-red-300 underline-offset-2 hover:decoration-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
              {error.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
