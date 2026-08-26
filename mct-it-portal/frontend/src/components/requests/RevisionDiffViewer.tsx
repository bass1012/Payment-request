import React, { useState } from 'react'
import { Request, RequestRevisionEntry } from '@/types'


interface RevisionDiffViewerProps {
  request: Request
}

interface DiffItem {
  fieldKey: string
  fieldLabel: string
  oldValue: string
  newValue: string
  status: 'added' | 'modified' | 'removed' | 'unchanged'
}

const FIELD_LABELS: Record<string, string> = {
  description: 'Description / Motif',
  requestReason: 'Raison de la demande',
  items: 'Articles / Lignes de commande',
  itAssets: 'Matériel informatique sollicité',
  softwareLicenses: 'Licences & logiciels requis',
  accessPrivileges: 'Accès & privilèges réseau',
  printObject: 'Objet de l\'impression',
  copiesA4: 'Nombre de copies A4',
  copiesA3: 'Nombre de copies A3',
  offersAmount: 'Montant de l\'offre retenue',
  allocationSection: 'Section d\'imputation',
  deliveryAddress: 'Adresse de livraison',
}

export const RevisionDiffViewer: React.FC<RevisionDiffViewerProps> = ({ request }) => {
  const revisions = request.revisions || []
  const [selectedRevIndex, setSelectedRevIndex] = useState<number>(
    revisions.length > 0 ? revisions.length - 1 : 0
  )

  if (!revisions || revisions.length === 0) {
    return null
  }

  let rawSnapshot: Record<string, any> = {}
  try {
    const raw = revisions[selectedRevIndex]?.snapshot
    rawSnapshot = typeof raw === 'string' ? JSON.parse(raw) : raw || {}
  } catch {
    rawSnapshot = {}
  }

  const formDataFromSnapshot = typeof rawSnapshot.formData === 'string'
    ? JSON.parse(rawSnapshot.formData)
    : (rawSnapshot.formData || {})

  const oldBusinessData: Record<string, any> = {
    description: rawSnapshot.description || formDataFromSnapshot.description || '',
    requestReason: rawSnapshot.requestReason || formDataFromSnapshot.requestReason || '',
    itAssets: rawSnapshot.itAssets || formDataFromSnapshot.itAssets || '',
    softwareLicenses: rawSnapshot.softwareLicenses || formDataFromSnapshot.softwareLicenses || '',
    accessPrivileges: rawSnapshot.accessPrivileges || formDataFromSnapshot.accessPrivileges || '',
    printObject: rawSnapshot.printObject || formDataFromSnapshot.printObject || '',
    copiesA4: rawSnapshot.copiesA4 ?? formDataFromSnapshot.copiesA4 ?? '',
    copiesA3: rawSnapshot.copiesA3 ?? formDataFromSnapshot.copiesA3 ?? '',
    allocationSection: rawSnapshot.allocationSection || formDataFromSnapshot.allocationSection || '',
    deliveryAddress: rawSnapshot.deliveryAddress || formDataFromSnapshot.deliveryAddress || '',
    offersAmount: rawSnapshot.offersAmount || formDataFromSnapshot.offersAmount || '',
    items: rawSnapshot.items || formDataFromSnapshot.items || [],
  }

  const currentBusinessData: Record<string, any> = {
    description: request.description || '',
    requestReason: request.requestReason || '',
    itAssets: request.itAssets || '',
    softwareLicenses: request.softwareLicenses || '',
    accessPrivileges: request.accessPrivileges || '',
    printObject: request.printObject || '',
    copiesA4: request.copiesA4 ?? '',
    copiesA3: request.copiesA3 ?? '',
    allocationSection: request.allocationSection || '',
    deliveryAddress: request.deliveryAddress || '',
    offersAmount: request.offersAmount || '',
    items: request.items || [],
  }

  const allKeys = Object.keys(FIELD_LABELS)

  const diffItems: DiffItem[] = []

  for (const key of allKeys) {
    const oldValRaw = oldBusinessData[key]
    const newValRaw = currentBusinessData[key]

    const oldStr = typeof oldValRaw === 'object' && oldValRaw !== null
      ? (Array.isArray(oldValRaw) && oldValRaw.length === 0 ? '' : JSON.stringify(oldValRaw, null, 2))
      : String(oldValRaw ?? '').trim()
    const newStr = typeof newValRaw === 'object' && newValRaw !== null
      ? (Array.isArray(newValRaw) && newValRaw.length === 0 ? '' : JSON.stringify(newValRaw, null, 2))
      : String(newValRaw ?? '').trim()

    if (!oldStr && !newStr) continue

    if (!oldStr && newStr) {
      diffItems.push({
        fieldKey: key,
        fieldLabel: FIELD_LABELS[key] || key,
        oldValue: '—',
        newValue: newStr,
        status: 'added',
      })
    } else if (oldStr && !newStr) {
      diffItems.push({
        fieldKey: key,
        fieldLabel: FIELD_LABELS[key] || key,
        oldValue: oldStr,
        newValue: '—',
        status: 'removed',
      })
    } else if (oldStr !== newStr) {
      diffItems.push({
        fieldKey: key,
        fieldLabel: FIELD_LABELS[key] || key,
        oldValue: oldStr,
        newValue: newStr,
        status: 'modified',
      })
    }
  }


  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden my-6">
      <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-800 border border-amber-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Comparateur Visuel de Révisions (Diff)</h3>
            <p className="text-xs text-slate-600">
              Changements effectués entre la Révision N° {revisions[selectedRevIndex]?.revision || 1} et la Révision Active N° {request.currentRevision || 1}
            </p>
          </div>
        </div>

        {revisions.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="rev-select" className="text-xs font-semibold text-slate-700">Comparer avec :</label>
            <select
              id="rev-select"
              value={selectedRevIndex}
              onChange={(e) => setSelectedRevIndex(Number(e.target.value))}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-2 focus:ring-amber-500"
            >
              {revisions.map((rev: RequestRevisionEntry, index: number) => (
                <option key={rev.id || index} value={index}>
                  Révision N° {rev.revision} ({new Date(rev.createdAt).toLocaleDateString('fr-FR')})
                </option>
              ))}

            </select>
          </div>
        )}
      </div>

      <div className="p-6">
        {diffItems.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-xs font-medium">
            ✓ Aucune différence détectée dans les champs principaux par rapport à cette révision.
          </div>
        ) : (
          <div className="space-y-3">
            {diffItems.map((item) => (
              <div key={item.fieldKey} className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between font-semibold text-slate-800">
                  <span>{item.fieldLabel}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    item.status === 'modified' ? 'bg-amber-100 text-amber-800' :
                    item.status === 'added' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {item.status === 'modified' ? 'Modifié' : item.status === 'added' ? 'Ajouté' : 'Supprimé'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 font-mono text-[11px]">
                  <div className="p-3 bg-rose-50/40 text-rose-900">
                    <span className="text-[10px] text-rose-600 font-sans font-bold uppercase tracking-wider block mb-1">Ancienne valeur :</span>
                    <pre className="whitespace-pre-wrap font-mono">{item.oldValue}</pre>
                  </div>
                  <div className="p-3 bg-emerald-50/40 text-emerald-900">
                    <span className="text-[10px] text-emerald-600 font-sans font-bold uppercase tracking-wider block mb-1">Nouvelle valeur :</span>
                    <pre className="whitespace-pre-wrap font-mono">{item.newValue}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
