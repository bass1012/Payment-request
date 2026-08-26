import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Comment {
  id: string
  content: string
  step: number
  stepLabel: string
  createdAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    role: string
  } | null
}

interface CommentSectionProps {
  requestId: string
  currentStep: number
  requestStatus: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
  IT_ADMIN: 'IT Admin',
  IT: 'IT',
  CHEF_DEPT: 'Chef de Département',
  DIRECTOR: 'Directeur',
  DG: 'DG',
  DGOF: 'DGOF',
  DRH: 'DRH',
  DAF: 'DAF',
  TREASURY: 'Trésorerie',
  MOYENS_GENERAUX: 'Moyens Généraux',
  EMPLOYEE: 'Employé',
}

export default function CommentSection({ requestId, currentStep, requestStatus }: CommentSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadComments()
  }, [requestId])

  async function loadComments() {
    try {
      setLoading(true)
      const { data } = await api.get(`/requests/${requestId}/comments`)
      setComments(data)
    } catch {
      // Silent — comments are optional
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    try {
      setSubmitting(true)
      setError('')
      const { data } = await api.post(`/requests/${requestId}/comments`, {
        content: newComment.trim(),
      })
      setComments(prev => [...prev, data])
      setNewComment('')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Erreur'
        : 'Erreur'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm('Supprimer ce commentaire ?')) return
    try {
      await api.delete(`/requests/${requestId}/comments/${commentId}`)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch {
      // Silent
    }
  }

  // Group comments by step
  const grouped = comments.reduce((acc, comment) => {
    const key = comment.step
    if (!acc[key]) acc[key] = { step: comment.step, stepLabel: comment.stepLabel, items: [] }
    acc[key].items.push(comment)
    return acc
  }, {} as Record<number, { step: number; stepLabel: string; items: Comment[] }>)

  const groupedSteps = Object.values(grouped).sort((a, b) => a.step - b.step)
  const isClosed = ['CLOSED', 'REJECTED'].includes(requestStatus)

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
        💬 Commentaires ({comments.length})
      </h2>

      {/* Comment form */}
      {!isClosed && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`Ajouter un commentaire à l'étape ${currentStep}…`}
            rows={2}
            className="input text-sm resize-none"
            disabled={submitting}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {submitting ? 'Envoi…' : 'Publier'}
            </button>
          </div>
        </form>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Aucun commentaire pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {groupedSteps.map(group => (
            <div key={group.step} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  group.step === currentStep
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  Étape {group.step}
                </span>
                <span className="text-[11px] text-gray-500 font-medium">{group.stepLabel}</span>
              </div>
              <div className="space-y-2 ml-4 border-l-2 border-gray-100 pl-3">
                {group.items.map(comment => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">
                          {comment.author?.firstName} {comment.author?.lastName}
                        </span>
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                          {ROLE_LABELS[comment.author?.role || ''] || comment.author?.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">
                          {format(new Date(comment.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </span>
                        {(user?.id === comment.author?.id || user?.role === 'ADMIN') && (
                          <button
                            type="button"
                            onClick={() => handleDelete(comment.id)}
                            className="text-[10px] text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
