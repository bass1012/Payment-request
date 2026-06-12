import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'

type Status = 'loading' | 'success' | 'error'

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Lien de vérification manquant ou invalide.')
      return
    }
    api
      .get(`/auth/verify/${token}`)
      .then(r => {
        setMessage(r.data.message || 'Email vérifié avec succès.')
        setStatus('success')
      })
      .catch(err => {
        let msg = 'Lien de vérification invalide ou expiré.'
        if (!err?.response) {
          msg = 'Impossible de joindre le serveur. Réessayez dans quelques instants.'
        } else if (err.response?.data?.error) {
          msg = err.response.data.error
        }
        setMessage(msg)
        setStatus('error')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-mct-blue to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-4">
            <span className="text-2xl font-black text-mct-blue">MCT</span>
          </div>
          <h1 className="text-2xl font-bold text-white">MCT IT Portal</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="text-4xl mb-4 animate-spin inline-block">⏳</div>
              <p className="text-gray-600">Vérification en cours…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email vérifié !</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link to="/login" className="btn-primary inline-block px-8 py-2.5">
                Se connecter
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Vérification échouée</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link to="/login" className="text-mct-blue font-medium hover:underline">
                Retour à la connexion
              </Link>
            </>
          )}
        </div>

        <p className="text-center text-blue-300 text-sm mt-6">
          MCT — Maintenance Climatisation Technique
        </p>
      </div>
    </div>
  )
}
