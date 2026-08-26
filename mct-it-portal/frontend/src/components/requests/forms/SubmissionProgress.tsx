import { useCallback } from 'react'

interface SubmissionProgressProps {
  phase: 'idle' | 'preparing' | 'uploading' | 'error'
  progress: number
  error: string
  onRetry: () => void
  retryDisabled?: boolean
}

export default function SubmissionProgress({
  phase,
  progress,
  error,
  onRetry,
  retryDisabled = false,
}: SubmissionProgressProps) {
  const isBusy = phase === 'preparing' || phase === 'uploading'
  if (!isBusy && phase !== 'error') return null

  const isError = phase === 'error'

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isError
          ? 'border-red-200 bg-red-50'
          : 'border-blue-200 bg-blue-50'
      }`}
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
    >
      {isError ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-red-900">L'envoi n'a pas abouti</p>
            <p className="text-sm text-red-700 mt-1">
              {error} Vos saisies et fichiers sont conservés.
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            className="btn-danger shrink-0"
          >
            Réessayer l'envoi
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-blue-900">
              {phase === 'preparing'
                ? 'Préparation des fichiers…'
                : 'Envoi sécurisé de la demande…'}
            </span>
            <span className="font-mono text-blue-700">{progress} %</span>
          </div>
          <div
            className="h-2.5 bg-blue-100 rounded-full overflow-hidden mt-3"
            role="progressbar"
            aria-label={phase === 'preparing' ? 'Préparation des fichiers' : 'Envoi de la demande'}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-[width] rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Ne fermez pas cette page avant la fin de l'envoi.
          </p>
        </>
      )}
    </div>
  )
}
