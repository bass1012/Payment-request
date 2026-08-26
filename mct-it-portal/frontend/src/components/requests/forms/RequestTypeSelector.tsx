import type { RequestType } from '../../../constants'
import { VALID_REQUEST_TYPES as REQUEST_TYPES, TYPE_LABELS } from '../../../constants'

interface RequestTypeSelectorProps {
  onSelect: (type: RequestType) => void
}

const DESCRIPTIONS: Record<RequestType, string> = {
  ASSET: 'Matériel, licences logiciels, accès réseau, privilèges',
  EMAIL: 'Création d\'une nouvelle adresse email professionnelle',
  PRINT: 'Demande d\'impression couleur A4 ou A3',
  CASH: 'Demande de règlement financier (Bon de Caisse)',
  SUPPLY: 'Demande d\'approvisionnement (fournitures, outillage, matériel, etc.)',
  OTHER: 'Toute autre demande auprès du service informatique',
}

const REFERENCES: Record<RequestType, string> = {
  ASSET: 'ENR.SI.008',
  EMAIL: 'ENR.SI.005',
  PRINT: 'ENR.SI.006',
  CASH: 'ENR.RF.002',
  SUPPLY: 'ENR.GA.003',
  OTHER: '—',
}

export default function RequestTypeSelector({ onSelect }: RequestTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-gray-600 mb-4">Choisissez le type de demande :</p>
      {REQUEST_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelect(type)}
          className="w-full text-left card hover:border-mct-blue hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900 group-hover:text-mct-blue">
                {TYPE_LABELS[type]}
              </p>
              <p className="text-sm text-gray-500 mt-1">{DESCRIPTIONS[type]}</p>
            </div>
            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded ml-4 flex-shrink-0">
              {REFERENCES[type]}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
