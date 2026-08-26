import type { FormEventHandler } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import type { RequestType } from '../../types'

interface RequestClosureFormProps {
  type: RequestType
  comment: string
  validating: boolean
  onCommentChange: (value: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
}

function closurePlaceholder(type: RequestType) {
  if (type === 'ASSET') {
    return 'Indiquez par exemple : Matériel configuré et remis en main propre au demandeur ce jour...'
  }
  if (type === 'EMAIL') {
    return 'Indiquez par exemple : Adresse e-mail créée et mot de passe transmis au demandeur...'
  }
  if (type === 'PRINT') {
    return 'Indiquez par exemple : Impression couleur effectuée et remise au demandeur...'
  }
  return 'Indiquez par exemple : Demande traitée et finalisée par le service informatique...'
}

export default function RequestClosureForm({
  type,
  comment,
  validating,
  onCommentChange,
  onSubmit,
}: RequestClosureFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="closure-comment" className="label text-xs font-semibold text-gray-700">
          {type === 'ASSET' ? 'Note de livraison / Commentaire de clôture *' : 'Commentaire de clôture *'}
        </label>
        <textarea
          id="closure-comment"
          required
          rows={3}
          placeholder={closurePlaceholder(type)}
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          className="input font-sans text-sm"
        />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={validating} className="btn-primary flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4" />
          Clôturer la demande
        </button>
      </div>
    </form>
  )
}
