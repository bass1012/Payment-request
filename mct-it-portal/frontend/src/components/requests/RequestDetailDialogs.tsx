import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'

type PreviewType = 'pdf' | 'image' | 'other'

interface RequestDetailDialogsProps {
  showReject: boolean
  comment: string
  validating: boolean
  previewUrl: string | null
  previewName: string
  previewType: PreviewType
  onCommentChange: (value: string) => void
  onCancelReject: () => void
  onConfirmReject: () => void
  onClosePreview: () => void
}

export default function RequestDetailDialogs({
  showReject,
  comment,
  validating,
  previewUrl,
  previewName,
  previewType,
  onCommentChange,
  onCancelReject,
  onConfirmReject,
  onClosePreview,
}: RequestDetailDialogsProps) {
  return (
    <>
      {showReject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="reject-dialog-title">
            <h3 id="reject-dialog-title" className="text-lg font-bold text-gray-900 mb-4">
              Motif de rejet
            </h3>
            <label htmlFor="rejection-comment" className="sr-only">Motif de rejet</label>
            <textarea
              id="rejection-comment"
              autoFocus
              className="input mb-4"
              rows={4}
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              placeholder="Indiquez le motif du rejet (optionnel)..."
            />
            <div className="flex justify-end gap-3">
              <button onClick={onCancelReject} className="btn-secondary">Annuler</button>
              <button onClick={onConfirmReject} disabled={validating} className="btn-danger">
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-gray-100" role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Aperçu du document</span>
                <h3 id="preview-dialog-title" className="text-base font-bold text-gray-900 truncate max-w-lg">
                  {previewName}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <a href={previewUrl} download={previewName} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5">
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                  Télécharger
                </a>
                <button type="button" onClick={onClosePreview} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600 font-bold" aria-label="Fermer l’aperçu">
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-auto p-4">
              {previewType === 'pdf' ? (
                <iframe src={previewUrl} title="Prévisualisation PDF" className="w-full h-full rounded-lg border border-gray-200 shadow-sm bg-white" />
              ) : previewType === 'image' ? (
                <img src={previewUrl} alt="Aperçu" className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
                  <p className="text-gray-500 mb-4">Aperçu non disponible pour ce type de fichier.</p>
                  <a href={previewUrl} download={previewName} className="btn-primary">
                    Télécharger pour lire
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
