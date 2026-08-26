export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024

export const ACCEPTED_UPLOAD_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
] as const

const ACCEPTED_UPLOAD_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export const UPLOAD_ACCEPT = ACCEPTED_UPLOAD_EXTENSIONS.join(',')

export function validateUpload(file: File, pdfOnly = false) {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
  if (file.size > MAX_UPLOAD_SIZE) {
    return `${file.name} dépasse la limite de 10 Mo.`
  }
  if (pdfOnly && (extension !== '.pdf' || file.type !== 'application/pdf')) {
    return `${file.name} doit être un fichier PDF.`
  }
  if (
    !ACCEPTED_UPLOAD_EXTENSIONS.includes(
      extension as (typeof ACCEPTED_UPLOAD_EXTENSIONS)[number],
    )
    || !ACCEPTED_UPLOAD_MIMES.has(file.type)
  ) {
    return `${file.name} utilise un format non accepté.`
  }
  return null
}

export function fileToBase64(
  file: File,
  onProgress?: (loaded: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Lecture impossible : ${file.name}`))
    reader.onprogress = (event) => onProgress?.(event.loaded)
    reader.readAsDataURL(file)
  })
}
