import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import toast from 'react-hot-toast'
import type { RequestType, Request } from '../types'
import { isRequestType, TYPE_LABELS } from '../types'
import { useAuth } from '../contexts/AuthContext'
import {
  createDraft,
  getLatestDraft,
  submitDraft,
  updateDraft,
  type DraftPayload,
  type DraftRecord,
} from '../services/draft.service'
import FormProgress, { FormErrorSummary } from '../components/FormProgress'
import {
  findSectionForField,
  REQUEST_FORM_SECTIONS,
} from '../config/request-form-sections'
import { fileToBase64, validateUpload } from '../utils/upload'
import { validateFormData } from '../types/formData'
import RequestTypeSelector from '../components/requests/forms/RequestTypeSelector'
import TemplateInfo from '../components/requests/TemplateInfo'
import RequesterInformationFields, {
  type DepartmentOption,
} from '../components/requests/forms/RequesterInformationFields'
import {
  CashRequestFields,
  StandardRequestFields,
} from '../components/requests/forms/RequestBusinessFields'
import SubmissionProgress from '../components/requests/forms/SubmissionProgress'
import SupplyItemsForm from '../components/requests/forms/SupplyItemsForm'
import FileUploadZone from '../components/requests/forms/FileUploadZone'

type Step = 'type' | 'template' | 'form'

export default function NewRequestPage() {
  const { id } = useParams()
  const isEdit = !!id
  const [searchParams] = useSearchParams()
  const requestedType = searchParams.get('type')
  const initialRequestType = !isEdit && isRequestType(requestedType) ? requestedType : null
  const [step, setStep] = useState<Step>(isEdit || initialRequestType ? 'form' : 'type')
  const [requestType, setRequestType] = useState<RequestType | null>(initialRequestType)
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [editRequest, setEditRequest] = useState<any>(null)
  const [loading, setLoading] = useState(isEdit)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    api.get('/auth/departments').then(r => setDepartments(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (isEdit || requestedType === null) return

    if (isRequestType(requestedType)) {
      setRequestType(requestedType)
      setStep('template')
      return
    }

    setRequestType(null)
    setStep('type')
    toast.error('Type de demande inconnu. Veuillez choisir un type valide.')
  }, [isEdit, requestedType])

  useEffect(() => {
    if (isEdit) {
      setLoading(true)
      api.get(`/requests/${id}`)
        .then((res) => {
          setEditRequest(res.data)
          setRequestType(res.data.type)
          setStep('form')
        })
        .catch(() => {
          toast.error('Erreur lors du chargement de la demande')
          navigate('/')
        })
        .finally(() => setLoading(false))
    }
  }, [id, isEdit, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-500 font-medium">Chargement...</span>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Modifier la demande' : 'Nouvelle demande'}
      </h1>

      {step === 'type' ? (
        <RequestTypeSelector
          onSelect={(t) => {
            setRequestType(t)
            setStep('template')
          }}
        />
      ) : step === 'template' && requestType ? (
        <TemplateInfo
          requestType={requestType}
          onConfirm={() => setStep('form')}
          onBack={() => setStep('type')}
        />
      ) : (
        requestType && (
          <RequestForm
            type={requestType}
            departments={departments}
            editRequest={editRequest}
            onBack={() => {
              if (isEdit) navigate(`/requests/${id}`)
              else setStep('type')
            }}
            onSuccess={(savedId) => {
              toast.success(isEdit ? 'Demande modifiée avec succès !' : 'Demande soumise avec succès !')
              navigate(`/requests/${savedId}`)
            }}
          />
        )
      )}
    </div>
  )
}

// ─── Form by type ───────────────────────────────────────────────────────────

interface FormProps {
  type: RequestType
  departments: DepartmentOption[]
  editRequest?: any
  onBack: () => void
  onSuccess: (id: string) => void
}

function RequestForm({ type, departments, editRequest, onBack, onSuccess }: FormProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const profileDepartment = user?.department && typeof user.department === 'object'
    ? user.department.name
    : user?.department || ''
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    defaultValues: {
      matricule: editRequest?.matricule || user?.matricule || '',
      department: editRequest?.department && typeof editRequest.department === 'object' ? editRequest.department.name : (editRequest?.department || profileDepartment),
      firstName: editRequest?.firstName || user?.firstName || '',
      lastName: editRequest?.lastName || user?.lastName || '',
      position: editRequest?.position || user?.fonction || '',
    }
  })
  const navigate = useNavigate()
  const [profileCorrectionEnabled, setProfileCorrectionEnabled] = useState(false)
  const [draftStatus, setDraftStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading')
  const [availableDraft, setAvailableDraft] = useState<DraftRecord | null>(null)
  const [restoredFileNames, setRestoredFileNames] = useState<string[]>([])
  const [draftReady, setDraftReady] = useState(false)
  const [draftRevision, setDraftRevision] = useState(0)
  const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'preparing' | 'uploading' | 'error'>('idle')
  const [submissionProgress, setSubmissionProgress] = useState(0)
  const [submissionError, setSubmissionError] = useState('')
  const sections = REQUEST_FORM_SECTIONS[type]
  const [activeSectionId, setActiveSectionId] = useState(sections[0].id)
  const submissionLockRef = useRef(false)
  const draftIdRef = useRef<string | null>(editRequest?.status === 'DRAFT' ? editRequest.id : null)
  const draftVersionRef = useRef<number>(editRequest?.version || 0)
  const saveTimerRef = useRef<number | null>(null)
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve())

  const [uploadedPdfFile, setUploadedPdfFile] = useState<File | null>(null)
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([])
  const [pdfError, setPdfError] = useState<string | null>(null)
  const existingAttachments = editRequest?.attachments ?? []
  const hasExistingPdf = Boolean(editRequest?.uploadedPdfPath)

  // SUPPLY-specific state
  const [items, setItems] = useState<Array<{ designation: string; quantity: string | number; price: string | number }>>([
    { designation: '', quantity: '1', price: '0' }
  ])
  const [expenseNature, setExpenseNature] = useState<string[]>([])
  const [validatedAssets, setValidatedAssets] = useState<Request[]>([])
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const dynamicStateRef = useRef({ items, expenseNature, selectedAssetIds })
  dynamicStateRef.current = { items, expenseNature, selectedAssetIds }

  const buildDraftFormData = (baseValues = getValues()) => ({
    ...baseValues,
    items: dynamicStateRef.current.items,
    expenseNature: dynamicStateRef.current.expenseNature,
    selectedAssetIds: dynamicStateRef.current.selectedAssetIds,
    uploadedPdfName: uploadedPdfFile?.name || null,
    attachmentNames: attachmentFiles.map((file) => file.name),
  })

  const persistDraft = (formData: Record<string, unknown>) => {
    const payload: DraftPayload = { type, formData }
    setDraftStatus('saving')

    const operation = saveQueueRef.current.catch(() => undefined).then(async () => {
      const saved = draftIdRef.current
        ? await updateDraft(draftIdRef.current, payload, draftVersionRef.current)
        : await createDraft(payload)
      draftIdRef.current = saved.id
      draftVersionRef.current = saved.version
      setDraftStatus('saved')
      return saved
    }).catch((error) => {
      setDraftStatus('error')
      throw error
    })

    saveQueueRef.current = operation.catch(() => undefined)
    return operation
  }

  useEffect(() => {
    if (editRequest?.status === 'DRAFT') {
      let active = true
      getLatestDraft(type)
        .then((draft) => {
          if (!active) return
          if (draft?.id === editRequest.id) {
            setAvailableDraft(draft)
            setDraftReady(false)
            setDraftStatus('idle')
          } else {
            setDraftReady(true)
            setDraftStatus('saved')
          }
        })
        .catch(() => {
          if (!active) return
          setDraftReady(true)
          setDraftStatus('error')
        })
      return () => { active = false }
    }
    if (editRequest) {
      setDraftStatus('idle')
      return
    }

    let active = true
    getLatestDraft(type)
      .then((draft) => {
        if (!active) return
        if (draft) {
          setAvailableDraft(draft)
          setDraftStatus('idle')
        } else {
          setDraftReady(true)
          setDraftStatus('idle')
        }
      })
      .catch(() => {
        if (!active) return
        setDraftReady(true)
        setDraftStatus('error')
      })
    return () => { active = false }
  }, [editRequest, type])

  useEffect(() => {
    const subscription = watch(() => setDraftRevision((revision) => revision + 1))
    return () => subscription.unsubscribe()
  }, [watch])

  useEffect(() => {
    if (!draftReady || editRequest?.status && editRequest.status !== 'DRAFT' || draftRevision === 0) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      persistDraft(buildDraftFormData()).catch(() => {})
    }, 1200)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [draftReady, draftRevision])

  const handleAssetLinkChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAssetIds([...selectedAssetIds, id])
    } else {
      setSelectedAssetIds(selectedAssetIds.filter((x) => x !== id))
    }
    setDraftRevision((revision) => revision + 1)
  }

  const resumeAvailableDraft = () => {
    if (!availableDraft) return
    const saved = availableDraft.formData as Record<string, any>
    reset({
      ...saved,
      supplier1: saved.supplier1 || saved.possibleSuppliers?.[0] || '',
      supplier2: saved.supplier2 || saved.possibleSuppliers?.[1] || '',
      supplier3: saved.supplier3 || saved.possibleSuppliers?.[2] || '',
      subcontractor1: saved.subcontractor1 || saved.consultedSubcontractors?.[0] || '',
      subcontractor2: saved.subcontractor2 || saved.consultedSubcontractors?.[1] || '',
      subcontractor3: saved.subcontractor3 || saved.consultedSubcontractors?.[2] || '',
    })
    if (Array.isArray(saved.items) && saved.items.length > 0) setItems(saved.items)
    if (Array.isArray(saved.expenseNature)) setExpenseNature(saved.expenseNature)
    if (Array.isArray(saved.selectedAssetIds)) setSelectedAssetIds(saved.selectedAssetIds)
    else if (Array.isArray(saved.linkedAssets)) {
      setSelectedAssetIds(saved.linkedAssets.map((asset: { id: string }) => asset.id))
    }
    setRestoredFileNames([
      ...(saved.uploadedPdfName ? [saved.uploadedPdfName] : []),
      ...(Array.isArray(saved.attachmentNames) ? saved.attachmentNames : []),
    ])
    draftIdRef.current = availableDraft.id
    draftVersionRef.current = availableDraft.version
    setAvailableDraft(null)
    setDraftReady(true)
    setDraftStatus('saved')
  }

  const startWithoutDraft = () => {
    setAvailableDraft(null)
    draftIdRef.current = editRequest?.status === 'DRAFT' ? editRequest.id : null
    draftVersionRef.current = editRequest?.status === 'DRAFT' ? editRequest.version : 0
    setDraftReady(true)
    setDraftStatus('idle')
    setDraftRevision((revision) => revision + 1)
  }

  useEffect(() => {
    if (editRequest) {
      let firstName = ''
      let lastName = ''
      if (editRequest.requesterName) {
        const parts = editRequest.requesterName.trim().split(' ')
        firstName = parts[0] || ''
        lastName = parts.slice(1).join(' ') || ''
      }
      if (!firstName && user?.firstName) firstName = user.firstName
      if (!lastName && user?.lastName) lastName = user.lastName

      reset({
        matricule: editRequest.matricule || user?.matricule || '',
        department: typeof editRequest.department === 'object' ? editRequest.department?.name : (editRequest.department || profileDepartment || ''),
        firstName: editRequest.firstName || firstName,
        lastName: editRequest.lastName || lastName,
        position: editRequest.position || editRequest.fonction || user?.fonction || '',
        description: editRequest.description || '',
        itAssets: editRequest.itAssets || '',
        softwareLicenses: editRequest.softwareLicenses || '',
        accessPrivileges: editRequest.accessPrivileges || '',
        memoNumber: editRequest.memoNumber || '',
        printObject: editRequest.printObject || '',
        copiesA4: editRequest.copiesA4 ?? '',
        copiesA3: editRequest.copiesA3 ?? '',
        requestedAmount: editRequest.requestedAmount || editRequest.paymentAmount || '',
        requestReason: editRequest.requestReason || '',
        imputation: editRequest.imputation || '',
        allocationSection: editRequest.allocationSection || '',
        supplier1: editRequest.possibleSuppliers?.[0] || '',
        supplier2: editRequest.possibleSuppliers?.[1] || '',
        supplier3: editRequest.possibleSuppliers?.[2] || '',
        subcontractor1: editRequest.consultedSubcontractors?.[0] || '',
        subcontractor2: editRequest.consultedSubcontractors?.[1] || '',
        subcontractor3: editRequest.consultedSubcontractors?.[2] || '',
        deliveryAddress: editRequest.deliveryAddress || '',
        offersAmount: editRequest.offersAmount || '',
      })

      if (Array.isArray(editRequest.items) && editRequest.items.length > 0) {
        setItems(editRequest.items)
      }
      if (Array.isArray(editRequest.expenseNature)) {
        setExpenseNature(editRequest.expenseNature)
      }
      if (Array.isArray(editRequest.linkedAssets)) {
        setSelectedAssetIds(editRequest.linkedAssets.map((a: any) => a.id))
      }
      setProfileCorrectionEnabled(true)
    } else if (user) {
      const currentValues = getValues()
      if (!currentValues.firstName && !currentValues.lastName) {
        setValue('matricule', user.matricule || '')
        setValue('department', profileDepartment)
        setValue('firstName', user.firstName || '')
        setValue('lastName', user.lastName || '')
        setValue('position', user.fonction || '')
      }
    }
  }, [editRequest, user, profileDepartment, reset, setValue, getValues])

  useEffect(() => {
    if (type === 'SUPPLY') {
      api.get('/requests?limit=100').then((res) => {
        const allReqs: Request[] = res.data.data ?? []
        const filtered = allReqs.filter(
          (r) =>
            r.type === 'ASSET' &&
            ['IN_PROGRESS_IT', 'PROCESSING', 'CLOSED'].includes(r.status)
        )
        setValidatedAssets(filtered)
      }).catch(() => {})
    }
  }, [type])

  const handleAddItem = () => {
    setItems([...items, { designation: '', quantity: '1', price: '0' }])
    setDraftRevision((revision) => revision + 1)
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index))
    setDraftRevision((revision) => revision + 1)
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
    if (newItems.every((item) => item.designation.trim())) clearErrors('items')
    setDraftRevision((revision) => revision + 1)
  }

  const itemsTotal = items.reduce((sum, item) => {
    const q = parseInt(item.quantity as string) || 0
    const p = parseFloat(item.price as string) || 0
    return sum + (q * p)
  }, 0)

  useEffect(() => {
    if (type === 'SUPPLY') {
      setValue('offersAmount', itemsTotal)
    }
  }, [itemsTotal, type, setValue])

  const handleNatureChange = (nature: string, checked: boolean) => {
    if (checked) {
      setExpenseNature([...expenseNature, nature])
    } else {
      setExpenseNature(expenseNature.filter((n) => n !== nature))
    }
    if (checked) clearErrors('expenseNature')
    setDraftRevision((revision) => revision + 1)
  }

  const addAttachmentFiles = (files: File[]) => {
    const errorsForFiles: string[] = []
    const validFiles = files.filter((file) => {
      const error = validateUpload(file)
      if (error) errorsForFiles.push(error)
      return !error
    })

    setAttachmentErrors(errorsForFiles)
    if (validFiles.length > 0) clearErrors('attachments')
    setAttachmentFiles((current) => {
      const known = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`))
      return [
        ...current,
        ...validFiles.filter((file) => !known.has(`${file.name}:${file.size}:${file.lastModified}`)),
      ]
    })
    setDraftRevision((revision) => revision + 1)
  }

  const selectCashPdf = (file?: File) => {
    if (!file) return
    const error = validateUpload(file, true)
    setPdfError(error)
    setUploadedPdfFile(error ? null : file)
    if (!error) clearErrors('uploadedPdf')
    setDraftRevision((revision) => revision + 1)
  }

  const removePdf = () => {
    setUploadedPdfFile(null)
    setPdfError(null)
    setDraftRevision((revision) => revision + 1)
  }

  const removeAttachment = (index: number) => {
    setAttachmentFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))
    setDraftRevision((revision) => revision + 1)
    setAttachmentErrors([])
  }

  const focusField = (field: string) => {
    const section = findSectionForField(type, field)
    if (section) setActiveSectionId(section.id)

    window.requestAnimationFrame(() => {
      const specialTargetId = field === 'uploadedPdf'
        ? 'cash-pdf'
        : field === 'attachments'
          ? 'supporting-documents'
          : null
      const target = document.querySelector<HTMLElement>(
        `[name="${field}"], ${specialTargetId ? `#${specialTargetId}, ` : ''}#${field}, [data-field="${field}"]`,
      )
      const sectionElement = section
        ? document.getElementById(`request-section-${section.id}`)
        : null
      sectionElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      target?.focus({ preventScroll: true })
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const setContextualError = (field: string, message: string) => {
    setError(field, { type: 'manual', message })
    focusField(field)
  }

  const onSubmit = async (data: Record<string, unknown>) => {
    if (submissionLockRef.current) return
    if (availableDraft && !draftReady) {
      toast.error('Choisissez d\'abord de reprendre ou d\'ignorer le brouillon existant.')
      return
    }
    if (!editRequest && !draftReady) {
      toast.error('Vérification des brouillons en cours. Réessayez dans un instant.')
      return
    }

    if (type === 'CASH') {
      if (!uploadedPdfFile && !hasExistingPdf) {
        setContextualError('uploadedPdf', 'Ajoutez le Bon de Caisse rempli au format PDF.')
        return
      }
      if (attachmentFiles.length === 0 && existingAttachments.length === 0) {
        setContextualError('attachments', 'Ajoutez au moins une pièce justificative.')
        return
      }
    }

    if (type === 'SUPPLY') {
      if (expenseNature.length === 0) {
        setContextualError('expenseNature', 'Sélectionnez au moins une nature de dépense.')
        return
      }
      if (items.some(item => !item.designation.trim())) {
        setContextualError('items', 'Renseignez la désignation de chaque article.')
        return
      }
      if (attachmentFiles.length === 0 && existingAttachments.length === 0) {
        setContextualError('attachments', 'Ajoutez le devis ou la proforma obligatoire.')
        return
      }
    }

    submissionLockRef.current = true
    setSubmissionError('')
    setSubmissionPhase('preparing')
    setSubmissionProgress(3)

    try {
      const filesToPrepare = [
        ...(uploadedPdfFile ? [uploadedPdfFile] : []),
        ...attachmentFiles,
      ]
      const loadedByFile = filesToPrepare.map(() => 0)
      const totalBytes = Math.max(1, filesToPrepare.reduce((sum, file) => sum + file.size, 0))
      const encodedFiles = await Promise.all(
        filesToPrepare.map((file, index) => fileToBase64(file, (loaded) => {
          loadedByFile[index] = loaded
          const preparedBytes = loadedByFile.reduce((sum, current) => sum + current, 0)
          setSubmissionProgress(Math.min(60, 5 + Math.round(preparedBytes / totalBytes * 55)))
        }))
      )
      const uploadedPdfBase64 = uploadedPdfFile ? encodedFiles[0] : null
      const attachmentOffset = uploadedPdfFile ? 1 : 0
      const attachmentsBase64 = attachmentFiles.map((file, index) => ({
        name: file.name,
        base64: encodedFiles[index + attachmentOffset],
      }))
      setSubmissionPhase('uploading')
      setSubmissionProgress(65)

      const trackUpload = (loaded: number, total?: number) => {
        if (!total) return
        setSubmissionProgress(Math.min(95, 65 + Math.round(loaded / total * 30)))
      }

      const linkedAssets = selectedAssetIds.map(id => {
        const found = validatedAssets.find(a => a.id === id)
        return {
          id,
          ref: found ? found.referenceNumber : ''
        }
      }).filter(x => x.ref)

      const payload = {
        ...data,
        type,
        ...(uploadedPdfBase64 ? { uploadedPdf: uploadedPdfBase64 } : {}),
        attachments: attachmentsBase64,
        ...(type === 'SUPPLY' ? {
          items: items.map(item => ({
            designation: item.designation,
            quantity: parseInt(item.quantity as string) || 1,
            price: parseFloat(item.price as string) || 0
          })),
          expenseNature,
          possibleSuppliers: [data.supplier1, data.supplier2, data.supplier3].filter(Boolean),
          consultedSubcontractors: [data.subcontractor1, data.subcontractor2, data.subcontractor3].filter(Boolean),
          linkedAssets,
          linkedAssetRequestId: linkedAssets[0]?.id || null,
          linkedAssetRequestRef: linkedAssets[0]?.ref || null,
        } : {})
      }

      const { type: _ignoredType, uploadedPdf: _ignoredPdf, attachments: _ignoredAttachments, ...formDataOnly } = payload
      const clientFormError = validateFormData(type, formDataOnly)
      if (clientFormError) {
        setSubmissionPhase('error')
        setSubmissionError(clientFormError)
        toast.error(clientFormError)
        return
      }

      let response
      if (draftReady && (!editRequest || editRequest.status === 'DRAFT')) {
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
        await saveQueueRef.current
        const {
          uploadedPdf,
          attachments,
          type: _submittedType,
          ...submittedFormData
        } = payload
        const savedDraft = await persistDraft(submittedFormData)
        response = {
          data: await submitDraft(savedDraft.id, {
            formData: submittedFormData,
            ...(typeof uploadedPdf === 'string' ? { uploadedPdf } : {}),
            ...(Array.isArray(attachments) ? { attachments } : {}),
          }, savedDraft.version, trackUpload),
        }
      } else if (editRequest && editRequest.status !== 'DRAFT') {
        const { uploadedPdf, attachments, type: _t, ...formDataOnly } = payload
        response = await api.post(`/requests/${editRequest.id}/revisions`, {
          expectedVersion: editRequest.version ?? 0,
          reason: 'Mise à jour et resoumission du dossier après demande de correction',
          formData: formDataOnly,
          ...(typeof uploadedPdf === 'string' ? { uploadedPdf } : {}),
          ...(Array.isArray(attachments) ? { attachments } : {}),
        }, {
          onUploadProgress: (event) => trackUpload(event.loaded, event.total),
        })
      } else if (editRequest) {
        response = await api.put(`/requests/${editRequest.id}`, payload, {
          onUploadProgress: (event) => trackUpload(event.loaded, event.total),
        })
      } else {
        response = await api.post('/requests', payload, {
          onUploadProgress: (event) => trackUpload(event.loaded, event.total),
        })
      }

      setSubmissionProgress(100)
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] })
      onSuccess(response.data?.id || editRequest?.id)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Erreur lors de la soumission'
          : 'Erreur de connexion'
      setSubmissionPhase('error')
      setSubmissionError(msg)
      toast.error(msg)
    } finally {
      submissionLockRef.current = false
    }
  }

  const submissionBusy = submissionPhase === 'preparing' || submissionPhase === 'uploading'
  const retrySubmission = () => {
    if (!submissionLockRef.current) void handleSubmit(onSubmit)()
  }
  const errorItems = Object.entries(errors).map(([field, error]) => ({
    field,
    message: typeof error?.message === 'string'
      ? error.message
      : `Le champ « ${field} » doit être vérifié.`,
  }))
  const progressSections = sections.map((section) => ({
    ...section,
    errorCount: section.fields.filter((field) => Boolean(errors[field])).length,
  }))
  const navigateToSection = (sectionId: string) => {
    setActiveSectionId(sectionId)
    document
      .getElementById(`request-section-${sectionId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const handleInvalid = (invalidErrors: Record<string, unknown>) => {
    const orderedFields = sections.flatMap((section) => section.fields)
    const firstInvalidField = orderedFields.find((field) => Boolean(invalidErrors[field]))
      || Object.keys(invalidErrors)[0]
    if (firstInvalidField) focusField(firstInvalidField)
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit, handleInvalid)}
      className={`space-y-5 ${submissionBusy ? 'cursor-wait' : ''}`}
      aria-busy={submissionBusy}
    >
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={onBack} className="btn-secondary text-sm py-1.5">
          ← Retour
        </button>
        <h2 className="text-lg font-semibold text-gray-800">{TYPE_LABELS[type]}</h2>
        {(!editRequest || editRequest.status === 'DRAFT') && (
          <span
            className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${
              draftStatus === 'error'
                ? 'bg-red-50 text-red-700'
                : draftStatus === 'saving'
                  ? 'bg-amber-50 text-amber-700'
                  : draftStatus === 'saved'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-slate-100 text-slate-500'
            }`}
            role="status"
            aria-live="polite"
          >
            {draftStatus === 'saving' && 'Enregistrement…'}
            {draftStatus === 'saved' && 'Brouillon enregistré'}
            {draftStatus === 'error' && 'Échec de l\'enregistrement'}
            {draftStatus === 'loading' && 'Recherche d\'un brouillon…'}
            {draftStatus === 'idle' && (availableDraft ? 'Brouillon disponible' : 'Autosauvegarde active')}
          </span>
        )}
      </div>

      <FormProgress
        sections={progressSections}
        activeSectionId={activeSectionId}
        onNavigate={navigateToSection}
      />
      <FormErrorSummary errors={errorItems} onSelect={focusField} />

      {availableDraft && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4" role="status">
          <p className="font-semibold text-blue-900">Un brouillon existe pour ce formulaire</p>
          <p className="text-sm text-blue-700 mt-1">
            Dernière sauvegarde le {new Date(availableDraft.updatedAt).toLocaleString('fr-FR')}.
            Souhaitez-vous reprendre cette saisie ?
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" onClick={resumeAvailableDraft} className="btn-primary text-sm">
              Reprendre le brouillon
            </button>
            <button type="button" onClick={startWithoutDraft} className="btn-secondary text-sm">
              Commencer sans le reprendre
            </button>
          </div>
        </div>
      )}

      {restoredFileNames.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          Les fichiers précédemment sélectionnés ({restoredFileNames.join(', ')}) doivent être joints
          à nouveau pour des raisons de sécurité du navigateur.
        </div>
      )}

      {/* Common fields */}
      <RequesterInformationFields
        type={type}
        departments={departments}
        correctionEnabled={profileCorrectionEnabled}
        onToggleCorrection={() => {
          if (profileCorrectionEnabled) {
            setValue('matricule', user?.matricule || '')
            setValue('department', profileDepartment)
            setValue('firstName', user?.firstName || '')
            setValue('lastName', user?.lastName || '')
            setValue('position', user?.fonction || '')
          }
          setProfileCorrectionEnabled((enabled) => !enabled)
        }}
        register={register}
        errors={errors}
      />

      {/* CASH specifics */}
      {type === 'CASH' && (
        <CashRequestFields register={register} errors={errors} />
      )}

      {/* Type-specific fields (others) */}
      {type !== 'CASH' && (
        <div
          id={`request-section-${type === 'SUPPLY' ? 'allocation' : 'details'}`}
          className="card scroll-mt-6 space-y-4"
        >
          <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wide">
            Détails de la demande
          </h3>

          {type !== 'SUPPLY' && (
            <StandardRequestFields type={type} register={register} errors={errors} />
          )}

          {type === 'SUPPLY' && (
            <SupplyItemsForm
              register={register}
              errors={errors}
              items={items}
              validatedAssets={validatedAssets}
              selectedAssetIds={selectedAssetIds}
              expenseNature={expenseNature}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onItemChange={handleItemChange}
              onAssetLinkChange={handleAssetLinkChange}
              onNatureChange={handleNatureChange}
              itemsTotal={itemsTotal}
            />
          )}
        </div>
      )}

      {/* Uploads Zone */}
      <FileUploadZone
        type={type}
        uploadedPdfFile={uploadedPdfFile}
        pdfError={pdfError}
        existingAttachments={existingAttachments}
        attachmentFiles={attachmentFiles}
        attachmentErrors={attachmentErrors}
        hasExistingPdf={hasExistingPdf}
        submissionBusy={submissionBusy}
        onSelectPdf={selectCashPdf}
        onRemovePdf={removePdf}
        onAddAttachments={addAttachmentFiles}
        onRemoveAttachment={removeAttachment}
      />

      {/* Submission progress */}
      <SubmissionProgress
        phase={submissionPhase}
        progress={submissionProgress}
        error={submissionError}
        onRetry={retrySubmission}
        retryDisabled={isSubmitting}
      />

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onBack} disabled={submissionBusy} className="btn-secondary">
          Annuler
        </button>
        <button type="submit" disabled={isSubmitting || submissionBusy} className="btn-primary">
          {submissionBusy ? 'Envoi en cours…' : 'Soumettre la demande'}
        </button>
      </div>
    </form>
  )
}
