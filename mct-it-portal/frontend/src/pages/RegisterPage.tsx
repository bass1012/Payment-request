import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface Department {
  id: string
  name: string
  code: string
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

  useEffect(() => {
    api.get('/auth/departments').then(r => setDepartments(r.data)).catch(() => {})
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-mct-blue to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-4">
            <span className="text-2xl font-black text-mct-blue">MCT</span>
          </div>
          <h1 className="text-2xl font-bold text-white">MCT IT Portal</h1>
          <p className="text-blue-200 mt-1">Créer un compte employé</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Vérifiez votre email</h2>
              <p className="text-gray-600 mb-6">
                Un lien de confirmation a été envoyé à <strong>{form.email}</strong>.<br />
                Cliquez sur le lien dans l'email pour activer votre compte.
              </p>
              <Link to="/login" className="btn-primary inline-block px-8 py-2.5">Aller à la connexion</Link>
            </div>
          ) : (
            <>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Inscription</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom <span className="text-red-500">*</span></label>
                <input className="input" required value={form.firstName} onChange={set('firstName')} placeholder="Issouf" />
              </div>
              <div>
                <label className="label">Nom <span className="text-red-500">*</span></label>
                <input className="input" required value={form.lastName} onChange={set('lastName')} placeholder="TRAORE" />
              </div>
            </div>
            <div>
              <label className="label">Adresse email <span className="text-red-500">*</span></label>
              <input className="input" type="email" required value={form.email} onChange={set('email')} placeholder="e-mail" />
            </div>
            <div>
              <label className="label">Département / Service</label>
              <select className="input" value={form.departmentId} onChange={set('departmentId')}>
                <option value="">— Sélectionner —</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Matricule</label>
                <input className="input" value={form.matricule} onChange={set('matricule')} placeholder="0000" />
              </div>
              <div>
                <label className="label">Fonction</label>
                <input className="input" value={form.fonction} onChange={set('fonction')} placeholder="Technicien" />
              </div>
            </div>
            <div>
              <label className="label">Mot de passe <span className="text-red-500">*</span></label>
              <input className="input" type="password" required value={form.password} onChange={set('password')} placeholder="Min. 8 caractères" />
            </div>
            <div>
              <label className="label">Confirmer le mot de passe <span className="text-red-500">*</span></label>
              <input className="input" type="password" required value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-2.5">
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-mct-blue font-medium hover:underline">
              Se connecter
            </Link>
          </p>
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
