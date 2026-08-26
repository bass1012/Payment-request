import { useEffect } from 'react'
import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import type { Request } from '../../../types'

interface SupplyItem {
  designation: string
  quantity: string | number
  price: string | number
}

interface SupplyItemsFormProps {
  register: UseFormRegister<any>
  errors: FieldErrors
  items: SupplyItem[]
  validatedAssets: Request[]
  selectedAssetIds: string[]
  expenseNature: string[]
  onAddItem: () => void
  onRemoveItem: (index: number) => void
  onItemChange: (index: number, field: string, value: any) => void
  onAssetLinkChange: (id: string, checked: boolean) => void
  onNatureChange: (nature: string, checked: boolean) => void
  itemsTotal: number
}

const NATURE_OPTIONS = [
  'Fournitures Consommables',
  'Outillage',
  'Travaux Sous Traité',
  'Investissements',
  'Autres',
]

export default function SupplyItemsForm({
  register,
  errors,
  items,
  validatedAssets,
  selectedAssetIds,
  expenseNature,
  onAddItem,
  onRemoveItem,
  onItemChange,
  onAssetLinkChange,
  onNatureChange,
  itemsTotal,
}: SupplyItemsFormProps) {
  return (
    <div className="space-y-5">
      {/* Linked validated assets */}
      <div className="md:col-span-2">
        <label className="label block font-semibold text-gray-700 mb-2">
          Rattacher des demandes d'actifs validées (Optionnel)
        </label>
        {validatedAssets.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Aucune demande d'actif validée disponible.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-48 overflow-y-auto">
            {validatedAssets.map((asset) => (
              <label
                key={asset.id}
                className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer hover:text-gray-900 bg-white p-2 rounded-xl border border-slate-100 shadow-sm transition-all hover:border-blue-200"
              >
                <input
                  type="checkbox"
                  checked={selectedAssetIds.includes(asset.id)}
                  onChange={(e) => onAssetLinkChange(asset.id, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <span className="leading-tight">
                  <strong className="font-mono text-xs text-blue-900 block mb-0.5">
                    {asset.referenceNumber}
                  </strong>
                  <span className="text-gray-800 text-[11px] block truncate font-medium">
                    {asset.requesterName}
                  </span>
                  <span className="text-gray-500 text-[10px] block truncate">
                    {asset.itAssets || 'Ordinateur / Licences'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Allocation section */}
      <div className="md:col-span-2">
        <label className="label">Rubrique d'imputation / Section *</label>
        <select className="input" {...register('allocationSection', { required: true })}>
          <option value="">Sélectionnez la rubrique</option>
          <option value="Frais commun Direction Générale">Frais commun Direction Générale</option>
          <option value="Frais commun Siège">Frais commun Siège</option>
          <option value="Frais Travaux neufs">Frais Travaux neufs</option>
          <option value="Frais commun S.A.V">Frais commun S.A.V</option>
          <option value="Magasin">Magasin</option>
          <option value="Garage / Véhicule">Garage / Véhicule</option>
          <option value="Atelier S.A.V">Atelier S.A.V</option>
          <option value="Travaux neufs">Travaux neufs</option>
          <option value="Contrat (0)">Contrat (0)</option>
          <option value="Dépannage (1)">Dépannage (1)</option>
          <option value="Garantie totale (2)">Garantie totale (2)</option>
        </select>
        {errors.allocationSection && (
          <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>
        )}
      </div>

      {/* Expense nature */}
      <div data-field="expenseNature">
        <label className="label block font-semibold text-gray-700 mb-2">
          Nature Dépenses *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {NATURE_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
            >
              <input
                type="checkbox"
                checked={expenseNature.includes(opt)}
                onChange={(e) => onNatureChange(opt, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {opt}
            </label>
          ))}
        </div>
        {errors.expenseNature && (
          <p className="text-red-500 text-xs mt-1">Sélectionnez au moins une nature de dépense.</p>
        )}
      </div>

      {/* Items table */}
      <div id="request-section-items" data-field="items" className="scroll-mt-6 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
          <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
            Articles à commander
          </h4>
          <button
            type="button"
            onClick={onAddItem}
            className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            + Ajouter un article
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row gap-3 sm:items-end bg-slate-50 p-3 rounded-xl border border-slate-100"
            >
              <div className="flex-1">
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Désignation *
                </label>
                <input
                  type="text"
                  required
                  value={item.designation}
                  onChange={(e) => onItemChange(idx, 'designation', e.target.value)}
                  placeholder="Ex: Fournitures de bureau..."
                  className="input bg-white text-sm"
                />
              </div>
              <div className="w-full sm:w-24">
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Quantité *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onItemChange(idx, 'quantity', e.target.value)}
                  className="input bg-white text-sm"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Prix unitaire (FCFA) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={item.price}
                  onChange={(e) => onItemChange(idx, 'price', e.target.value)}
                  className="input bg-white text-sm"
                />
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveItem(idx)}
                  className="text-red-500 hover:text-red-700 bg-red-50 p-2.5 rounded-lg mb-1 hover:bg-red-100 transition-colors"
                  title="Supprimer la ligne"
                  aria-label={`Supprimer l'article ${idx + 1}`}
                >
                  ❌
                </button>
              )}
            </div>
          ))}
        </div>

        {errors.items && (
          <p className="text-red-500 text-xs">{errors.items?.message as string}</p>
        )}

        <div className="flex justify-end p-2 text-sm font-bold text-slate-700 bg-slate-100 rounded-lg">
          Montant Total : {itemsTotal.toLocaleString('fr-FR')} FCFA
        </div>
      </div>

      {/* Suppliers & subcontractors */}
      <div
        id="request-section-consultation"
        className="scroll-mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 mt-4"
      >
        <div className="card space-y-3">
          <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
            Fournisseurs possibles
          </h4>
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">
              Fournisseur 1 * (Obligatoire)
            </label>
            <input
              type="text"
              className="input text-sm"
              {...register('supplier1', { required: true })}
              placeholder="Ex: CFAO Motors"
            />
            {errors.supplier1 && (
              <p className="text-red-500 text-xs mt-1">Au moins un fournisseur est requis</p>
            )}
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">
              Fournisseur 2 (Optionnel)
            </label>
            <input
              type="text"
              className="input text-sm"
              {...register('supplier2')}
              placeholder="Ex: Autre fournisseur"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">
              Fournisseur 3 (Optionnel)
            </label>
            <input
              type="text"
              className="input text-sm"
              {...register('supplier3')}
              placeholder="Ex: Autre fournisseur"
            />
          </div>
        </div>

        <div className="card space-y-3">
          <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
            Sous-traitants consultés (Optionnel)
          </h4>
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">
              Sous-traitant 1
            </label>
            <input
              type="text"
              className="input text-sm"
              {...register('subcontractor1')}
              placeholder="Ex: Partenaire technique"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">
              Sous-traitant 2
            </label>
            <input
              type="text"
              className="input text-sm"
              {...register('subcontractor2')}
              placeholder="Ex: Partenaire technique"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">
              Sous-traitant 3
            </label>
            <input
              type="text"
              className="input text-sm"
              {...register('subcontractor3')}
              placeholder="Ex: Partenaire technique"
            />
          </div>
        </div>
      </div>

      {/* Delivery address */}
      <div id="request-section-delivery" className="scroll-mt-6">
        <label className="label">Adresse de livraison *</label>
        <textarea
          className="input"
          rows={2}
          {...register('deliveryAddress', { required: true })}
          placeholder="Ex: Bureau MCT Marcory, Zone 4..."
        />
        {errors.deliveryAddress && (
          <p className="text-red-500 text-xs mt-1">Ce champ est requis</p>
        )}
      </div>

      {/* Offers amount */}
      <div>
        <label className="label">Montant Offres (Joindre Devis) (FCFA) *</label>
        <input
          type="number"
          min="0"
          className="input font-semibold"
          {...register('offersAmount', { required: true, min: 0, valueAsNumber: true })}
          placeholder="Ex: 150000"
        />
        {errors.offersAmount && (
          <p className="text-red-500 text-xs mt-1">Ce champ est requis (supérieur ou égal à 0)</p>
        )}
        <p className="text-[11px] text-gray-500 mt-0.5">
          Note : Ce montant est pré-rempli avec le total des articles, mais vous pouvez l'ajuster
          en fonction du devis choisi.
        </p>
      </div>
    </div>
  )
}
