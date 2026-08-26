import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import toast from 'react-hot-toast'
import logoMct from '../images/logo-mct.png'

interface Department {
  id: string
  name: string
  code: string
  directionName: string
  directionCode: string
  selectable?: boolean
}

/** Grouper les départements par direction */
function groupByDirection(depts: Department[]): Map<string, Department[]> {
  const map = new Map<string, Department[]>()
  for (let d of depts) {
    // Les directions déclarées comme « services » sont masquées via le flag
    // selectable fourni par l'API — plus aucun code en dur côté frontend.
    if (d.selectable === false) {
      continue
    }

    const key = d.directionName || 'Autre'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(d)
  }
  return map
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    matricule: '',
    fonction: '',
    departmentId: '',
  })
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  useEffect(() => {
    api.get('/auth/departments').then(r => setDepartments(r.data)).catch(() => {})
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value
    setForm(f => ({ ...f, [field]: val }))
    if (field === 'password') {
      let strength = 0
      if (val.length >= 8) strength++
      if (/[A-Z]/.test(val)) strength++
      if (/[0-9]/.test(val)) strength++
      if (/[^A-Za-z0-9]/.test(val)) strength++
      setPasswordStrength(strength)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (form.password.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        matricule: form.matricule || undefined,
        fonction: form.fonction || undefined,
        departmentId: form.departmentId || undefined,
      })
      setSuccess(true)
      toast.success('Compte créé ! Vérifiez votre email.')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Erreur'
          : 'Erreur de création'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const strengthColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
  const strengthLabels = ['Faible', 'Moyen', 'Bon', 'Excellent']

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      {/* Left Column – Decorative */}
      <div className="hidden md:flex md:w-2/5 bg-gradient-to-tr from-slate-950 via-blue-950 to-slate-900 text-white relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full filter blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500 rounded-full filter blur-[120px] opacity-20 animate-pulse delay-700"></div>

        <div className="relative z-10 max-w-sm space-y-8 text-center">
          <div className="inline-flex p-4 bg-white/10 border border-white/20 rounded-3xl backdrop-blur-md mb-4">
            <img src={logoMct} alt="MCT Logo" className="h-20 object-contain drop-shadow-xl" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
            Rejoignez la plateforme <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">ERP NATIF MCT</span>
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            Créez votre espace collaborateur pour soumettre et suivre vos demandes informatiques en toute simplicité.
          </p>

          <div className="space-y-3 text-left">
            {[
              { icon: '🔒', text: 'Accès sécurisé par authentification email' },
              { icon: '📋', text: 'Suivi en temps réel de vos demandes' },
              { icon: '📄', text: 'Documents officiels générés automatiquement' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-base">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column – Form */}
      <div className="w-full md:w-3/5 flex items-center justify-center p-6 bg-slate-50 relative overflow-y-auto">
        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-200 rounded-full filter blur-[100px] opacity-30 pointer-events-none"></div>

        <div className="w-full max-w-lg space-y-6 relative z-10 py-6">
          {/* Logo mobile */}
          <div className="text-center md:hidden">
            <img src={logoMct} alt="MCT" className="h-12 object-contain mx-auto mb-2" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Créer un compte</h1>
            <p className="text-slate-500 text-sm mt-1">Remplissez le formulaire pour accéder au portail ERP NATIF MCT</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8">
            {success ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto text-4xl">
                  📧
                </div>
                <h2 className="text-xl font-bold text-slate-900">Vérifiez votre email</h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Un lien de confirmation a été envoyé à<br />
                  <strong className="text-slate-800">{form.email}</strong>.<br />
                  Cliquez sur le lien pour activer votre compte.
                </p>
                <Link
                  to="/login"
                  className="inline-block mt-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-2.5 px-8 rounded-xl shadow-lg shadow-blue-500/10 transition-all"
                >
                  Aller à la connexion
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Prénom / Nom */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Prénom <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={form.firstName}
                      onChange={set('firstName')}
                      placeholder="Issouf"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Nom <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={form.lastName}
                      onChange={set('lastName')}
                      placeholder="TRAORE"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Adresse email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="prenom.nom@mct.ci"
                  />
                </div>

                {/* Département */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Département / Service
                  </label>
                  <select
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.departmentId}
                    onChange={set('departmentId')}
                  >
                    <option value="">— Sélectionner votre service —</option>
                    {Array.from(groupByDirection(departments)).map(([dirName, depts]) => (
                      <optgroup key={dirName} label={dirName}>
                        {depts.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Matricule / Fonction */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Matricule
                    </label>
                    <input
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={form.matricule}
                      onChange={set('matricule')}
                      placeholder="MCT-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Fonction
                    </label>
                    <input
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={form.fonction}
                      onChange={set('fonction')}
                      placeholder="Technicien"
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Mot de passe <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Min. 8 caractères"
                  />
                  {form.password && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map(i => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">
                        Force : <span className="font-medium">{strengthLabels[passwordStrength - 1] || 'Trop court'}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirmer */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Confirmer le mot de passe <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    className={`w-full bg-slate-50/50 border rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      form.confirmPassword && form.password !== form.confirmPassword
                        ? 'border-red-300 focus:ring-red-400'
                        : 'border-slate-200 focus:ring-blue-500'
                    }`}
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    placeholder="••••••••"
                  />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                  )}
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
                      Création en cours...
                    </span>
                  ) : 'Créer mon compte'}
                </button>

                <p className="text-center text-sm text-slate-600 pt-2">
                  Déjà inscrit ?{' '}
                  <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                    Se connecter
                  </Link>
                </p>
              </form>
            )}
          </div>

          <p className="text-center text-slate-400 text-xs">
            © {new Date().getFullYear()} MCT — Maintenance Climatisation Technique. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  )
}
