import { useState, useEffect } from 'react'
import api from '../../lib/api'

interface TemplateField {
  key: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  min?: number
  options?: string[]
}

interface Template {
  type: string
  code: string
  title: string
  description: string
  version: string
  versionDate: string
  fields: TemplateField[]
  sections: string[]
  requirements?: string[]
}

interface TemplateInfoProps {
  requestType: string
  onConfirm: () => void
  onBack: () => void
}

export default function TemplateInfo({ requestType, onConfirm, onBack }: TemplateInfoProps) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplate()
  }, [requestType])

  async function loadTemplate() {
    try {
      setLoading(true)
      const { data } = await api.get(`/templates/${requestType}`)
      setTemplate(data)
    } catch {
      // Template not found — proceed without info
      onConfirm()
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card animate-pulse space-y-3">
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
    )
  }

  if (!template) return null

  const requiredFields = template.fields.filter(f => f.required)
  const optionalFields = template.fields.filter(f => !f.required)

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {template.code}
            </span>
            {template.version && (
              <span className="text-[10px] text-gray-500">
                Version {template.version} du {template.versionDate}
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-900">{template.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
        </div>
      </div>

      {/* Sections */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Sections du formulaire
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {template.sections.map((section, idx) => (
            <span
              key={idx}
              className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
            >
              {idx + 1}. {section}
            </span>
          ))}
        </div>
      </div>

      {/* Required fields */}
      {requiredFields.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
            Champs obligatoires ({requiredFields.length})
          </h4>
          <div className="space-y-1">
            {requiredFields.map(field => (
              <div key={field.key} className="flex items-center gap-2 text-sm">
                <span className="text-red-500">*</span>
                <span className="font-medium text-gray-700">{field.label}</span>
                <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                  {field.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional fields */}
      {optionalFields.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Champs optionnels ({optionalFields.length})
          </h4>
          <div className="space-y-1">
            {optionalFields.map(field => (
              <div key={field.key} className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-3" />
                <span>{field.label}</span>
                <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                  {field.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements */}
      {template.requirements && template.requirements.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
            ⚠️ Pièces requises
          </h4>
          <ul className="space-y-1">
            {template.requirements.map((req, idx) => (
              <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onBack} className="btn-secondary flex-1 py-2">
          ← Changer de type
        </button>
        <button type="button" onClick={onConfirm} className="btn-primary flex-1 py-2">
          Remplir le formulaire →
        </button>
      </div>
    </div>
  )
}
