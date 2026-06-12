import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const resp = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string; code?: string } } }).response
        : undefined
      if (resp?.data?.code === 'EMAIL_NOT_VERIFIED') {
        toast.error('Veuillez vérifier votre email avant de vous connecter.', { duration: 6000 })
      } else {
        const msg = resp?.data?.error ?? 'Identifiants invalides'
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mct-blue to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-4">
            <span className="text-2xl font-black text-mct-blue">MCT</span>
          </div>
          <h1 className="text-2xl font-bold text-white">MCT IT Portal</h1>
          <p className="text-blue-200 mt-1">Plateforme de gestion des demandes IT</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Connexion</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@mct.ci"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 py-2.5"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-mct-blue font-medium hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>

        <p className="text-center text-blue-300 text-sm mt-6">
          MCT — Maintenance Climatisation Technique
        </p>
      </div>
    </div>
  )
}
