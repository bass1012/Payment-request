import api from '../lib/api'
import type { RequestType } from '../types'

export interface DraftRecord {
  id: string
  type: RequestType
  formData: Record<string, unknown> | string
  version: number
  updatedAt: string
}

export interface DraftPayload {
  type: RequestType
  formData: Record<string, unknown>
}

function unwrapDraft(data: DraftRecord | { draft?: DraftRecord } | null): DraftRecord | null {
  if (!data) return null
  const isEnvelope = Object.prototype.hasOwnProperty.call(data, 'draft')
  const raw = isEnvelope
    ? (data as { draft?: DraftRecord }).draft
    : data as DraftRecord
  if (!raw) return null

  let formData: Record<string, unknown>
  if (typeof raw.formData === 'string') {
    try {
      formData = JSON.parse(raw.formData)
    } catch {
      formData = {}
    }
  } else if (raw.formData && typeof raw.formData === 'object') {
    formData = raw.formData
  } else {
    // Les routes de détail peuvent renvoyer les champs de formulaire à plat.
    formData = { ...raw }
  }

  return { ...raw, formData }
}

export async function getLatestDraft(type: RequestType): Promise<DraftRecord | null> {
  try {
    const response = await api.get('/requests/drafts/latest', { params: { type } })
    return unwrapDraft(response.data)
  } catch (error: unknown) {
    if (
      error
      && typeof error === 'object'
      && 'response' in error
      && (error as { response?: { status?: number } }).response?.status === 404
    ) {
      return null
    }
    throw error
  }
}

export async function createDraft(payload: DraftPayload): Promise<DraftRecord> {
  const response = await api.post('/requests/drafts', payload)
  const draft = unwrapDraft(response.data)
  if (!draft) throw new Error('Réponse brouillon invalide')
  return draft
}

export async function updateDraft(
  id: string,
  payload: DraftPayload,
  expectedVersion: number,
): Promise<DraftRecord> {
  const response = await api.put(`/requests/drafts/${id}`, {
    formData: payload.formData,
    expectedVersion,
  })
  const draft = unwrapDraft(response.data)
  if (!draft) throw new Error('Réponse brouillon invalide')
  return draft
}

export async function submitDraft(
  id: string,
  payload: {
    formData: Record<string, unknown>
    uploadedPdf?: string
    attachments?: Array<{ name: string; base64: string }>
  },
  expectedVersion: number,
  onUploadProgress?: (loaded: number, total?: number) => void,
): Promise<{ id: string }> {
  const response = await api.post(`/requests/drafts/${id}/submit`, {
    ...payload,
    expectedVersion,
  }, {
    onUploadProgress: (event) => onUploadProgress?.(event.loaded, event.total),
  })
  return response.data
}
