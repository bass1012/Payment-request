import React, { useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface OtpVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [code, setCode] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  if (!isOpen) return null

  const handleSendOtp = async () => {
    setIsSending(true)
    try {
      await api.post('/auth/otp/send')
      toast.success('Un code de validation OTP à 6 chiffres a été envoyé sur votre e-mail !')
      setOtpSent(true)
    } catch {
      toast.error('Erreur lors de l\'envoi du code OTP.')
    } finally {
      setIsSending(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || code.trim().length !== 6) {
      toast.error('Veuillez saisir un code à 6 chiffres.')
      return
    }

    setIsVerifying(true)
    try {
      await api.post('/auth/otp/verify', { code: code.trim() })
      toast.success('Code OTP vérifié avec succès !')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Code OTP invalide ou expiré.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 text-base">Authentification Renforcée (OTP)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Pour des raisons de sécurité, la signature de ce montant ou de cette étape requiert la saisie d'un code temporaire à 6 chiffres transmis sur votre adresse de messagerie professionnelle.
        </p>

        {!otpSent ? (
          <div className="text-center py-4 space-y-3">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isSending}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 text-xs font-semibold"
            >
              {isSending ? 'Génération du code...' : 'Recevoir mon code OTP par email'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="otp-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Code secret à 6 chiffres
              </label>
              <input
                id="otp-input"
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full text-center text-2xl font-mono tracking-widest py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSending}
                className="w-1/2 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Renvoyer le code
              </button>
              <button
                type="submit"
                disabled={isVerifying || code.length !== 6}
                className="w-1/2 btn-primary py-2 text-xs font-semibold disabled:opacity-50"
              >
                {isVerifying ? 'Vérification...' : 'Confirmer le code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
