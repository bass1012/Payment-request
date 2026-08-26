import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import logoMct from '../images/logo-mct.png'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as any)?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      {/* Left Column - Decorative Info Panel (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-slate-950 via-blue-950 to-slate-900 text-white relative overflow-hidden items-center justify-center p-12">
        {/* Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full filter blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full filter blur-[120px] opacity-20 animate-pulse delay-700"></div>
        
        {/* Content */}
        <div className="relative z-10 max-w-lg space-y-8">
          <div className="space-y-4">
            <span className="px-3 py-1 text-xs font-semibold tracking-wider text-blue-300 uppercase bg-blue-500/10 border border-blue-500/20 rounded-full inline-block">
              MCT Portal v2.0
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Simplifiez vos <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">demandes et validations IT</span> en un clic.
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Une interface intuitive pour les collaborateurs, validateurs, la Trésorerie et les Moyens Généraux.
            </p>
          </div>

          {/* Feature Cards (Glassmorphism) */}
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                ⚡
              </div>
              <div>
                <h3 className="font-semibold text-white">Traitement Instantané</h3>
                <p className="text-xs text-slate-400">Suivi en temps réel des approbations de vos demandes informatiques.</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                ✍️
              </div>
              <div>
                <h3 className="font-semibold text-white">Signature Numérique</h3>
                <p className="text-xs text-slate-400">Génération automatique de PDF officiels signés par tous les valideurs.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-slate-50 relative">
        {/* Soft color blob on background */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-200 rounded-full filter blur-[100px] opacity-30 pointer-events-none"></div>
        
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center">
            {/* Logo container with micro-shadow and border */}
            <div className="inline-flex p-3 bg-white rounded-3xl shadow-md border border-slate-100 mb-4 transition-transform hover:scale-105 duration-300">
              <img src={logoMct} alt="MCT Logo" className="h-16 object-contain" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Bienvenue sur ERP NATIF MCT</h2>
            <p className="text-slate-500 text-sm mt-1">Veuillez vous authentifier pour accéder à votre espace</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@mct.ci"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connexion en cours...
                  </span>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs">Nouveau collaborateur ?</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <p className="text-center text-sm text-slate-600">
              Pas encore inscrit ?{' '}
              <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>

          <p className="text-center text-slate-400 text-xs mt-6">
            © {new Date().getFullYear()} MCT — Maintenance Climatisation Technique. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  )
}
