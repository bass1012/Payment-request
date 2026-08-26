import { useRef } from 'react'
import type { Request } from '../../../types'
import AttachmentUploadField from '../../AttachmentUploadField'
import { UPLOAD_ACCEPT } from '../../../utils/upload'

interface FileUploadZoneProps {
  type: string
  uploadedPdfFile: File | null
  pdfError: string | null
  existingAttachments: Request['attachments'] | undefined
  attachmentFiles: File[]
  attachmentErrors: string[]
  hasExistingPdf: boolean
  submissionBusy: boolean
  onSelectPdf: (file?: File) => void
  onRemovePdf: () => void
  onAddAttachments: (files: File[]) => void
  onRemoveAttachment: (index: number) => void
}

export default function FileUploadZone({
  type,
  uploadedPdfFile,
  pdfError,
  existingAttachments,
  attachmentFiles,
  attachmentErrors,
  hasExistingPdf,
  submissionBusy,
  onSelectPdf,
  onRemovePdf,
  onAddAttachments,
  onRemoveAttachment,
}: FileUploadZoneProps) {
  const pdfInputRef = useRef<HTMLInputElement>(null)

  return (
    <div id="request-section-documents" className="card scroll-mt-6 space-y-4">
      <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wide">
        Documents joints
      </h3>

      {/* CASH PDF upload */}
      {type === 'CASH' && (
        <div id="request-section-cash-pdf" className="scroll-mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="cash-pdf" className="label font-semibold text-gray-700">
              Fichier Bon de Caisse (ENR.RF.002) rempli (PDF) *
            </label>
            <a
              href="/templates/ENR.RF.002 Bon de caisse.pdf"
              download
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
            >
              📥 Télécharger le modèle vierge
            </a>
          </div>

          {hasExistingPdf && !uploadedPdfFile && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              📄 Le Bon de Caisse déjà joint sera conservé.
            </p>
          )}

          <input
            ref={pdfInputRef}
            id="cash-pdf"
            type="file"
            disabled={submissionBusy}
            accept=".pdf,application/pdf"
            required={!hasExistingPdf && !uploadedPdfFile}
            onChange={(event) => onSelectPdf(event.target.files?.[0])}
            aria-describedby="cash-pdf-help cash-pdf-error"
            className="input file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p id="cash-pdf-help" className="text-xs text-slate-500">
            PDF uniquement, 10 Mo maximum.
          </p>
          {pdfError && (
            <p id="cash-pdf-error" role="alert" className="text-xs text-red-700">
              {pdfError}
            </p>
          )}
          {uploadedPdfFile && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
              <span className="truncate text-sm text-slate-700">
                📄 {uploadedPdfFile.name} · {(uploadedPdfFile.size / (1024 * 1024)).toFixed(1)} Mo
              </span>
              <button
                type="button"
                disabled={submissionBusy}
                onClick={onRemovePdf}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Retirer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Attachments */}
      <AttachmentUploadField
        existingFiles={existingAttachments ?? []}
        newFiles={attachmentFiles}
        errors={attachmentErrors}
        required={['CASH', 'SUPPLY'].includes(type)}
        accept={UPLOAD_ACCEPT}
        disabled={submissionBusy}
        onFiles={onAddAttachments}
        onRemoveNew={onRemoveAttachment}
      />
    </div>
  )
}
