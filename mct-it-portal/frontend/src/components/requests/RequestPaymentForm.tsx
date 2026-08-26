import type { FormEvent } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

export interface PaymentValidationPayload {
  paymentAmount: number
  paymentReference: string
  comment: string | null
}

interface RequestPaymentFormProps {
  validating: boolean
  onSubmit: (payload: PaymentValidationPayload) => void
  onReject: () => void
  onInvalid: () => void
}

export default function RequestPaymentForm({
  validating,
  onSubmit,
  onReject,
  onInvalid,
}: RequestPaymentFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const amount = formData.get('paymentAmount') as string
    const reference = formData.get('paymentReference') as string
    const comment = formData.get('paymentComment') as string

    if (!amount || !reference) {
      onInvalid()
      return
    }

    onSubmit({
      paymentAmount: Number.parseFloat(amount),
      paymentReference: reference,
      comment: comment || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="payment-amount" className="label text-xs">Montant payé (FCFA) *</label>
          <input
            id="payment-amount"
            type="number"
            name="paymentAmount"
            required
            min="0"
            placeholder="Ex: 50000"
            className="input py-2"
          />
        </div>
        <div>
          <label htmlFor="payment-reference" className="label text-xs">
            Référence de transaction (N° Virement, chèque, pièce...) *
          </label>
          <input
            id="payment-reference"
            type="text"
            name="paymentReference"
            required
            placeholder="Ex: VIR-928172"
            className="input py-2"
          />
        </div>
      </div>
      <div>
        <label htmlFor="payment-comment" className="label text-xs">
          Commentaire / Notes de paiement (Optionnel)
        </label>
        <textarea
          id="payment-comment"
          name="paymentComment"
          rows={2}
          placeholder="Notes comptables ou observations..."
          className="input py-2"
        />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={validating} className="btn-primary flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5" />
          Valider le Paiement & Transmettre
        </button>
        <button type="button" onClick={onReject} disabled={validating} className="btn-danger flex items-center gap-2">
          <XCircleIcon className="w-5 h-5" />
          Rejeter
        </button>
      </div>
    </form>
  )
}
