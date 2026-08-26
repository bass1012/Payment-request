import type { FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form'
import type { RequestType } from '../../../types'

export interface DepartmentOption {
  id: string
  name: string
  code: string
  directionName: string
  directionCode: string
  selectable?: boolean
}

interface RequesterInformationFieldsProps {
  type: RequestType
  departments: DepartmentOption[]
  correctionEnabled: boolean
  onToggleCorrection: () => void
  register: UseFormRegister<FieldValues>
  errors: FieldErrors<FieldValues>
}

function groupByDirection(departments: DepartmentOption[]) {
  const groups = new Map<string, DepartmentOption[]>()
  for (const department of departments) {
    // Les directions déclarées comme « services » sont masquées côté serveur
    // via le flag selectable (config organisationnelle) — plus aucun code en dur.
    if (department.selectable === false) {
      continue
    }
    const key = department.directionName || 'Autre'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(department)
  }
  return groups
}

export default function RequesterInformationFields({
  type,
  departments,
  correctionEnabled,
  onToggleCorrection,
  register,
  errors,
}: RequesterInformationFieldsProps) {
  const readonlyClass = correctionEnabled ? '' : 'bg-slate-100 text-slate-600'

  return (
    <div id="request-section-profile" className="card scroll-mt-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wide">
            Informations demandeur
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Ces valeurs viennent de votre profil. Une correction ici ne modifie pas votre compte.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleCorrection}
          className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline"
          aria-pressed={correctionEnabled}
        >
          {correctionEnabled ? 'Annuler la correction' : 'Corriger pour cette demande'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Matricule (optionnel)</label>
          <input
            className={`input ${readonlyClass}`}
            {...register('matricule')}
            readOnly={!correctionEnabled}
            aria-readonly={!correctionEnabled}
            placeholder="0123"
          />
        </div>
        <div>
          <label className="label">Département / Service *</label>
          {correctionEnabled ? (
            <select className="input" {...register('department', { required: true })}>
              <option value="">— Sélectionner votre service —</option>
              {Array.from(groupByDirection(departments)).map(([directionName, options]) => (
                <optgroup key={directionName} label={directionName}>
                  {options.map((department) => (
                    <option key={department.id} value={department.name}>{department.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <input
              className="input bg-slate-100 text-slate-600"
              {...register('department', { required: true })}
              readOnly
              aria-readonly="true"
            />
          )}
          {errors.department && <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Prénom *</label>
          <input
            className={`input ${readonlyClass}`}
            {...register('firstName', { required: true })}
            readOnly={!correctionEnabled}
            aria-readonly={!correctionEnabled}
            placeholder="Prénom"
          />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>}
        </div>
        <div>
          <label className="label">Nom *</label>
          <input
            className={`input ${readonlyClass}`}
            {...register('lastName', { required: true })}
            readOnly={!correctionEnabled}
            aria-readonly={!correctionEnabled}
            placeholder="Nom de famille"
          />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>}
        </div>
      </div>

      {(type === 'ASSET' || type === 'CASH') && (
        <div>
          <label className="label">Fonction *</label>
          <input
            className={`input ${readonlyClass}`}
            {...register('position', { required: true })}
            readOnly={!correctionEnabled}
            aria-readonly={!correctionEnabled}
            placeholder="Ex: Technicien, Comptable..."
          />
          {errors.position && <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>}
        </div>
      )}
    </div>
  )
}
