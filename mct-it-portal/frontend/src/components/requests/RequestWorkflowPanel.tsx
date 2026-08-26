import { format } from 'date-fns'
import {
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import type { Request } from '../../types'

type WorkflowRequest = Pick<
  Request,
  'workflowSteps' | 'validations' | 'status' | 'currentStep'
>

export default function RequestWorkflowPanel({ request }: { request: WorkflowRequest }) {
  return (
    <div className="lg:col-span-1 space-y-6">
      {request.workflowSteps && request.workflowSteps.length > 0 && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            Circuit de validation
          </h2>
          <div className="relative border-l-2 border-gray-200 ml-4 pl-6 space-y-6 py-2">
            {request.workflowSteps.map((step) => {
              const validation = request.validations?.find((entry) => entry.level === step.step)
              const isCurrent = request.status !== 'CLOSED'
                && request.status !== 'REJECTED'
                && step.step === request.currentStep
              const isPast = step.step < request.currentStep || request.status === 'CLOSED'
              const isFuture = step.step > request.currentStep && request.status !== 'CLOSED'

              let statusColor = 'bg-gray-200 border-gray-300 text-gray-400'
              let statusText = ''
              let validatorDisplayName = step.name || step.email || 'Valideur'
              let validationDate = ''
              let validationComment = ''

              if (validation) {
                if (validation.action === 'APPROVED') {
                  statusColor = 'bg-green-500 border-green-600 ring-4 ring-green-100 text-white'
                  statusText = 'Approuvé'
                } else {
                  statusColor = 'bg-red-500 border-red-600 ring-4 ring-red-100 text-white'
                  statusText = 'Rejeté'
                }
                validatorDisplayName = validation.validatorName
                validationDate = format(new Date(validation.createdAt), 'dd/MM/yyyy à HH:mm')
                validationComment = validation.comment || ''
              } else if (isCurrent) {
                statusColor = 'bg-blue-600 border-blue-700 ring-4 ring-blue-100 text-white animate-pulse'
                statusText = 'En attente'
              } else if (isPast) {
                statusColor = 'bg-gray-300 border-gray-400 text-gray-400'
                statusText = 'Non requis'
              } else {
                statusColor = 'bg-gray-100 border-gray-200 text-gray-400'
                statusText = 'À venir'
              }

              return (
                <div key={step.step} className="relative">
                  <span className={`absolute -left-[31px] top-1 flex h-4 w-4 rounded-full border-2 ${statusColor} items-center justify-center`} />
                  <div className="flex flex-col gap-0.5">
                    <h3 className={`font-semibold text-sm ${isCurrent ? 'text-blue-700 font-bold' : isFuture ? 'text-gray-400 font-medium' : 'text-gray-900'}`}>
                      {step.label}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {statusText === 'Approuvé' && (
                        <span className="text-green-600 font-semibold">✓ Approuvé par {validatorDisplayName}</span>
                      )}
                      {statusText === 'Rejeté' && (
                        <span className="text-red-600 font-semibold">✗ Rejeté par {validatorDisplayName}</span>
                      )}
                      {statusText === 'En attente' && (
                        <span className="text-blue-600 font-semibold">En attente de : {validatorDisplayName}</span>
                      )}
                      {statusText === 'À venir' && <span>Destinataire : {validatorDisplayName}</span>}
                      {statusText === 'Non requis' && (
                        <span className="italic text-gray-400">Étape passée (non requise)</span>
                      )}
                    </p>
                    {validationComment && (
                      <p className="text-xs text-gray-500 italic bg-gray-50 rounded p-1.5 mt-1 border border-gray-100">
                        "{validationComment}"
                      </p>
                    )}
                    {validationDate && (
                      <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                        Le {validationDate}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {request.validations && request.validations.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            Historique chronologique
          </h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {request.validations.map((validation) => (
              <div key={validation.id} className="flex items-start gap-3 text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                {validation.action === 'APPROVED' ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {validation.validatorName}
                    <span className={`ml-2 font-normal ${validation.action === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>
                      {validation.action === 'APPROVED' ? 'Approuvé' : 'Rejeté'}
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {format(new Date(validation.createdAt), 'dd/MM/yyyy à HH:mm')}
                  </p>
                  {validation.comment && (
                    <p className="text-gray-500 mt-1 italic">"{validation.comment}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
