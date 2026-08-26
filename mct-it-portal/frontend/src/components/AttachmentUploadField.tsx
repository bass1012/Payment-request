import type { DragEvent } from 'react'
import type { RequestAttachment } from '../types'

interface AttachmentUploadFieldProps {
  existingFiles: RequestAttachment[]
  newFiles: File[]
  errors: string[]
  required: boolean
  accept: string
  onFiles: (files: File[]) => void
  onRemoveNew: (index: number) => void
  disabled?: boolean
}

function formatSize(size?: number) {
  if (size === undefined) return null
  if (size < 1024) return `${size} o`
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} Ko`
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

export default function AttachmentUploadField({
  existingFiles,
  newFiles,
  errors,
  required,
  accept,
  onFiles,
  onRemoveNew,
  disabled = false,
}: AttachmentUploadFieldProps) {
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    if (disabled) return
    onFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <div>
      <label className="label font-semibold text-gray-700" htmlFor="supporting-documents">
        Pièces justificatives / Proforma (devis, factures, mémos…) {required ? '*' : '(optionnel)'}
      </label>

      {existingFiles.length > 0 && (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-800">
            Documents déjà joints — ils seront conservés
          </p>
          <ul className="mt-2 space-y-2" aria-label="Documents existants conservés">
            {existingFiles.map((file, index) => (
              <li key={`${file.id || file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-slate-700">📎 {file.name}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {formatSize(file.size) || 'Existant'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-emerald-700">
            Pour protéger le dossier, les documents existants ne peuvent pas être supprimés depuis ce formulaire.
          </p>
        </div>
      )}

      <label
        htmlFor="supporting-documents"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className={`block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center transition-colors ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50'
        } focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2`}
      >
        <span className="block text-sm font-semibold text-slate-700">
          Ajouter des documents
        </span>
        <span className="mt-1 block text-xs text-slate-500">
          Cliquez ou déposez vos fichiers ici
        </span>
        <span className="mt-2 block text-xs text-slate-500">
          PDF, JPG, PNG, GIF, WEBP, Word ou Excel — 10 Mo maximum par fichier
        </span>
        <input
          id="supporting-documents"
          type="file"
          disabled={disabled}
          multiple
          accept={accept}
          required={required && existingFiles.length === 0 && newFiles.length === 0}
          onChange={(event) => {
            onFiles(Array.from(event.target.files || []))
            event.target.value = ''
          }}
          className="sr-only"
          aria-describedby="supporting-documents-help supporting-documents-errors"
        />
      </label>
      <p id="supporting-documents-help" className="mt-2 text-xs text-slate-500">
        Seuls les nouveaux fichiers peuvent être retirés avant l’envoi.
      </p>

      {errors.length > 0 && (
        <ul id="supporting-documents-errors" role="alert" className="mt-2 space-y-1 text-xs text-red-700">
          {errors.map((error) => <li key={error}>• {error}</li>)}
        </ul>
      )}

      {newFiles.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Nouveaux documents à envoyer">
          {newFiles.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-700">{file.name}</span>
                <span className="block text-xs text-slate-500">
                  {file.type || 'Type inconnu'} · {formatSize(file.size)}
                </span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveNew(index)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-label={`Retirer le nouveau fichier ${file.name}`}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
