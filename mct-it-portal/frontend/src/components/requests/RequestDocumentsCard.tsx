import {
  ArrowDownTrayIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import type { Request } from '../../types'

type DocumentsRequest = Pick<
  Request,
  'uploadedPdfPath' | 'attachments' | 'proformas' | 'referenceNumber'
>

interface RequestDocumentsCardProps {
  request: DocumentsRequest
  onPreview: (filePath: string, fileName: string, isMainPdf?: boolean) => void
  onDownload: (filePath: string, fileName: string) => void
  onDownloadMainPdf: () => void
}

export default function RequestDocumentsCard({
  request,
  onPreview,
  onDownload,
  onDownloadMainPdf,
}: RequestDocumentsCardProps) {
  const hasDocuments = Boolean(
    request.uploadedPdfPath
    || request.attachments?.length
    || request.proformas?.length
  )

  if (!hasDocuments) return null

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        Documents joints
      </h2>
      <div className="space-y-2">
        {request.uploadedPdfPath && (
          <div className="flex items-center justify-between p-2.5 bg-blue-50/40 hover:bg-blue-50 transition-colors border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-900 font-semibold truncate max-w-md">
              📄 Formulaire Bon de Caisse (ENR.RF.002) uploade
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onPreview(
                  request.uploadedPdfPath!,
                  `MCT-${request.referenceNumber}.pdf`,
                  true
                )}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                Visualiser
              </button>
              <button
                onClick={onDownloadMainPdf}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 hover:underline"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                Télécharger
              </button>
            </div>
          </div>
        )}

        {request.attachments?.map((attachment, index) => (
          <div key={attachment.id || `${attachment.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
            <span className="text-sm text-gray-700 font-medium truncate max-w-md">
              📄 Pièce justificative : {attachment.name}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onPreview(`/${attachment.path}`, attachment.name)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                Visualiser
              </button>
              <button
                onClick={() => onDownload(`/${attachment.path}`, attachment.name)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 hover:underline"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                Télécharger
              </button>
            </div>
          </div>
        ))}

        {request.proformas?.map((proforma, index) => (
          <div key={`${proforma.name}-${index}`} className="flex items-center justify-between p-2 bg-blue-50/50 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200">
            <span className="text-sm text-blue-800 font-semibold truncate max-w-md">
              📁 Proforma IT : {proforma.name}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onPreview(`/${proforma.path}`, proforma.name)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                Visualiser
              </button>
              <button
                onClick={() => onDownload(`/${proforma.path}`, proforma.name)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 hover:underline"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                Télécharger
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
