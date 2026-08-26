import type { FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form'
import type { RequestType } from '../../../types'

interface BusinessFieldsProps {
  register: UseFormRegister<FieldValues>
  errors: FieldErrors<FieldValues>
}

interface StandardRequestFieldsProps extends BusinessFieldsProps {
  type: Exclude<RequestType, 'CASH' | 'SUPPLY'>
}

export function CashRequestFields({ register, errors }: BusinessFieldsProps) {
  return (
    <div id="request-section-financial" className="card scroll-mt-6 space-y-4">
      <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wide">Détails financiers</h3>
      <div className="space-y-4">
        <div>
          <label className="label">Montant demandé (FCFA) *</label>
          <input
            type="number"
            min="1"
            className="input"
            {...register('paymentAmount', { required: true, min: 1, valueAsNumber: true })}
            placeholder="Ex: 50000"
          />
          {errors.paymentAmount && (
            <p className="text-red-500 text-xs mt-1">Ce champ est requis (supérieur à 0)</p>
          )}
        </div>
        <div>
          <label className="label">Motif du Bon de Caisse *</label>
          <textarea
            className="input"
            rows={4}
            {...register('requestReason', { required: true })}
            placeholder="Ex: Achat consommables climatisation..."
          />
          {errors.requestReason && <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>}
        </div>
      </div>
    </div>
  )
}

export function StandardRequestFields({ type, register, errors }: StandardRequestFieldsProps) {
  if (type === 'EMAIL') {
    return (
      <div>
        <label className="label">Numéro Mémo (optionnel)</label>
        <input className="input" {...register('memoNumber')} placeholder="Référence mémo interne" />
      </div>
    )
  }

  if (type === 'PRINT') {
    return (
      <>
        <div>
          <label className="label">Objet de la demande *</label>
          <textarea
            className="input"
            rows={4}
            {...register('printObject', { required: true })}
            placeholder="Décrivez l'objet de votre demande d'impression..."
          />
          {errors.printObject && <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre de copies A4 *</label>
            <input
              type="number"
              min={0}
              className="input"
              {...register('copiesA4', { required: true, min: 0, valueAsNumber: true })}
              placeholder="0"
            />
            {errors.copiesA4 && <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>}
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
            {errors.copiesA3 && <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>}
          </div>
        </div>
      </>
    )
  }

  if (type === 'ASSET') {
    return (
      <>
        <div>
          <label className="label">Demandes informatiques</label>
          <textarea className="input" rows={3} {...register('itAssets')} placeholder="Énumérez les matériels demandés (PC portable, écran, souris...)" />
        </div>
        <div>
          <label className="label">Licences / Applications / Logiciels</label>
          <textarea className="input" rows={3} {...register('softwareLicenses')} placeholder="Logiciels et applications à installer..." />
        </div>
        <div>
          <label className="label">Accès et privilèges utilisateur</label>
          <textarea className="input" rows={3} {...register('accessPrivileges')} placeholder="Imprimantes, lecteurs partagés, accès réseau..." />
        </div>
        <div>
          <label className="label">Motif de la demande *</label>
          <textarea className="input" rows={3} {...register('requestReason', { required: true })} placeholder="Justifiez votre demande..." />
          {errors.requestReason && <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>}
        </div>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-xs text-blue-700 mt-2">
          <span className="font-semibold">NB :</span> Un délai de 5 jours ouvrés est requis pour la livraison du matériel à compter de la réception de la dernière validation (après la validation de la Direction Générale).
        </div>
      </>
    )
  }

  return (
    <div>
      <label className="label">Description de la demande *</label>
      <textarea
        className="input"
        rows={5}
        {...register('description', { required: true })}
        placeholder="Décrivez votre demande en détail..."
      />
      {errors.description && <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>}
    </div>
  )
}
