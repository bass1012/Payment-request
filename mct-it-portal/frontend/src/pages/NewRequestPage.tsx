import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../lib/api'
import toast from 'react-hot-toast'
import type { RequestType } from '../types'
import { TYPE_LABELS } from '../types'

const DEPARTMENTS = [
  'Direction Générale',
  'Direction des Opérations',
  'Direction des Moyens et des Biens Durables',
  'Direction des Ressources Humaines',
  'Direction Administrative et Financière',
  'Service Informatique',
  'Service Comptabilité',
  'Service Commercial',
  'Service Technique',
  'Service Logistique',
  'Service Qualité',
  'Service Administratif',
]

type Step = 'type' | 'form'

export default function NewRequestPage() {
  const [step, setStep] = useState<Step>('type')
  const [requestType, setRequestType] = useState<RequestType | null>(null)
  const navigate = useNavigate()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouvelle demande IT</h1>

      {step === 'type' ? (
        <TypeSelector
          onSelect={(t) => {
            setRequestType(t)
            setStep('form')
          }}
        />
      ) : (
        requestType && (
          <RequestForm
            type={requestType}
            departments={DEPARTMENTS}
            onBack={() => setStep('type')}
            onSuccess={(id) => {
              toast.success('Demande soumise avec succès !')
              navigate(`/requests/${id}`)
            }}
          />
        )
      )}
    </div>
  )
}

function TypeSelector({ onSelect }: { onSelect: (t: RequestType) => void }) {
  const types: RequestType[] = ['ASSET', 'EMAIL', 'PRINT', 'OTHER']
  const descriptions: Record<RequestType, string> = {
    ASSET: 'Matériel, licences logiciels, accès réseau, privilèges',
    EMAIL: 'Création d\'une nouvelle adresse email professionnelle',
    PRINT: 'Demande d\'impression couleur A4 ou A3',
    OTHER: 'Toute autre demande auprès du service informatique',
  }
  const refs: Record<RequestType, string> = {
    ASSET: 'ENR.SI.008',
    EMAIL: 'ENR.SI.005',
    PRINT: 'ENR.SI.006',
    OTHER: '—',
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-600 mb-4">Choisissez le type de demande :</p>
      {types.map((t) => (
        <button
          key={t}
          onClick={() => onSelect(t)}
          className="w-full text-left card hover:border-mct-blue hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900 group-hover:text-mct-blue">
                {TYPE_LABELS[t]}
              </p>
              <p className="text-sm text-gray-500 mt-1">{descriptions[t]}</p>
            </div>
            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded ml-4 flex-shrink-0">
              {refs[t]}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Form by type ───────────────────────────────────────────────────────────

interface FormProps {
  type: RequestType
  departments: string[]
  onBack: () => void
  onSuccess: (id: string) => void
}

function RequestForm({ type, departments, onBack, onSuccess }: FormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const navigate = useNavigate()

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      const { data: res } = await api.post('/requests', { ...data, type })
      onSuccess(res.id)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Erreur lors de la soumission'
          : 'Erreur de connexion'
      toast.error(msg)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={onBack} className="btn-secondary text-sm py-1.5">
          ← Retour
        </button>
        <h2 className="text-lg font-semibold text-gray-800">{TYPE_LABELS[type]}</h2>
      </div>

      {/* Common fields */}
      <div className="card space-y-4">
        <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wide">
          Informations demandeur
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Matricule (optionnel)</label>
            <input className="input" {...register('matricule')} placeholder="MCT-XXX" />
          </div>
          <div>
            <label className="label">Département / Service *</label>
            <select className="input" {...register('department', { required: true })}>
              <option value="">Sélectionner...</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {errors.department && (
              <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Prénom *</label>
            <input
              className="input"
              {...register('firstName', { required: true })}
              placeholder="Prénom"
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>
            )}
          </div>
          <div>
            <label className="label">Nom *</label>
            <input
              className="input"
              {...register('lastName', { required: true })}
              placeholder="Nom de famille"
            />
            {errors.lastName && (
              <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>
            )}
          </div>
        </div>
        {(type === 'ASSET') && (
          <div>
            <label className="label">Fonction *</label>
            <input
              className="input"
              {...register('position', { required: type === 'ASSET' })}
              placeholder="Ex: Technicien, Comptable..."
            />
            {errors.position && (
              <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>
            )}
          </div>
        )}
      </div>

      {/* Type-specific fields */}
      <div className="card space-y-4">
        <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wide">
          Détails de la demande
        </h3>

        {type === 'EMAIL' && (
          <div>
            <label className="label">Numéro Mémo (optionnel)</label>
            <input className="input" {...register('memoNumber')} placeholder="Référence mémo interne" />
          </div>
        )}

        {type === 'PRINT' && (
          <>
            <div>
              <label className="label">Objet de la demande *</label>
              <textarea
                className="input"
                rows={4}
                {...register('printObject', { required: true })}
                placeholder="Décrivez l'objet de votre demande d'impression..."
              />
              {errors.printObject && (
                <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre de copies A4 *</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  {...register('copiesA4', { required: true, min: 0, valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.copiesA4 && (
                  <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>
                )}
              </div>
              <div>
                <label className="label">Nombre de copies A3 *</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  {...register('copiesA3', { required: true, min: 0, valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.copiesA3 && (
                  <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>
                )}
              </div>
            </div>
          </>
        )}

        {type === 'ASSET' && (
          <>
            <div>
              <label className="label">Demandes informatiques</label>
              <textarea
                className="input"
                rows={3}
                {...register('itAssets')}
                placeholder="Énumérez les matériels demandés (PC portable, écran, souris...)"
              />
            </div>
            <div>
              <label className="label">Licences / Applications / Logiciels</label>
              <textarea
                className="input"
                rows={3}
                {...register('softwareLicenses')}
                placeholder="Logiciels et applications à installer..."
              />
            </div>
            <div>
              <label className="label">Accès et privilèges utilisateur</label>
              <textarea
                className="input"
                rows={3}
                {...register('accessPrivileges')}
                placeholder="Imprimantes, lecteurs partagés, accès réseau..."
              />
            </div>
            <div>
              <label className="label">Motif de la demande *</label>
              <textarea
                className="input"
                rows={3}
                {...register('requestReason', { required: true })}
                placeholder="Justifiez votre demande..."
              />
              {errors.requestReason && (
                <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>
              )}
            </div>
          </>
        )}

        {type === 'OTHER' && (
          <div>
            <label className="label">Description de la demande *</label>
            <textarea
              className="input"
              rows={5}
              {...register('description', { required: true })}
              placeholder="Décrivez votre demande en détail..."
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onBack} className="btn-secondary">
          Annuler
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Envoi en cours...' : 'Soumettre la demande'}
        </button>
      </div>
    </form>
  )
}
