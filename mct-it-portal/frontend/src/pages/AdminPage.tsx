import { useEffect, useState } from 'react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import type { Request } from '../types'
import { STATUS_LABELS, STATUS_BADGE_CLASS, TYPE_LABELS } from '../types'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

type Tab = 'requests' | 'users'

interface Department { id: string; name: string; code: string }
interface User {
  id: string; email: string; firstName: string; lastName: string;
  role: string; matricule: string | null; fonction: string | null;
  isActive: boolean; department: Department | null; createdAt: string
}

const ROLES = ['EMPLOYEE', 'CHEF_DEPT', 'DIRECTOR', 'DG', 'DRH', 'IT', 'ADMIN']
const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Employé', CHEF_DEPT: 'Chef de département', DIRECTOR: 'Directeur',
  DG: 'Directeur Général', DRH: 'DRH', IT: 'Informatique', ADMIN: 'Administrateur',
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('requests')

  // --- Demandes ---
  const [requests, setRequests] = useState<Request[]>([])
  const [loadingReq, setLoadingReq] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const loadRequests = () => {
    setLoadingReq(true)
    const params = new URLSearchParams({
      page: String(page), limit: '20',
      ...(statusFilter && { status: statusFilter }),
      ...(typeFilter && { type: typeFilter }),
    })
    api.get(`/admin/requests?${params}`)
      .then(r => { setRequests(r.data.data); setTotalPages(r.data.totalPages) })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoadingReq(false))
  }

  // --- Utilisateurs ---
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    role: 'EMPLOYEE', matricule: '', fonction: '', departmentId: '', isActive: true,
  })

  const loadUsers = () => {
    setLoadingUsers(true)
    Promise.all([api.get('/admin/users'), api.get('/admin/departments')])
      .then(([u, d]) => { setUsers(u.data); setDepartments(d.data) })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoadingUsers(false))
  }

  const openCreate = () => {
    setEditingUser(null)
    setUserForm({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE', matricule: '', fonction: '', departmentId: '', isActive: true })
    setShowUserModal(true)
  }

  const openEdit = (u: User) => {
    setEditingUser(u)
    setUserForm({
      firstName: u.firstName, lastName: u.lastName, email: u.email, password: '',
      role: u.role, matricule: u.matricule ?? '', fonction: u.fonction ?? '',
      departmentId: u.department?.id ?? '', isActive: u.isActive,
    })
    setShowUserModal(true)
  }

  const setF = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setUserForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      firstName: userForm.firstName, lastName: userForm.lastName, role: userForm.role,
      matricule: userForm.matricule || null, fonction: userForm.fonction || null,
      departmentId: userForm.departmentId || null, isActive: userForm.isActive,
    }
    if (!editingUser) { payload.email = userForm.email; payload.password = userForm.password }
    else if (userForm.password) { payload.password = userForm.password }
    try {
      if (editingUser) { await api.patch(`/admin/users/${editingUser.id}`, payload); toast.success('Utilisateur mis à jour') }
      else { await api.post('/admin/users', payload); toast.success('Utilisateur créé') }
      setShowUserModal(false); loadUsers()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Erreur' : 'Erreur'
      toast.error(msg)
    }
  }

  useEffect(() => { if (tab === 'requests') loadRequests() }, [page, statusFilter, typeFilter, tab])
  useEffect(() => { if (tab === 'users') loadUsers() }, [tab])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Administration</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('requests')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'requests' ? 'border-mct-blue text-mct-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Demandes
        </button>
        <button
          onClick={() => setTab('users')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'users' ? 'border-mct-blue text-mct-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Utilisateurs
        </button>
      </div>

      {/* ===== ONGLET DEMANDES ===== */}
      {tab === 'requests' && (
        <>
          <div className="card flex flex-wrap gap-4">
            <div>
              <label className="label text-xs">Statut</label>
              <select className="input py-1.5 text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Type</label>
              <select className="input py-1.5 text-sm" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
                <option value="">Tous les types</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            {loadingReq ? (
              <div className="text-center py-12 text-gray-400">Chargement...</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left pb-3 font-medium text-gray-500">Référence</th>
                        <th className="text-left pb-3 font-medium text-gray-500">Demandeur</th>
                        <th className="text-left pb-3 font-medium text-gray-500">Type</th>
                        <th className="text-left pb-3 font-medium text-gray-500">Département</th>
                        <th className="text-left pb-3 font-medium text-gray-500">Statut</th>
                        <th className="text-left pb-3 font-medium text-gray-500">Date</th>
                        <th className="text-right pb-3 font-medium text-gray-500">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {requests.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="py-3 font-mono text-xs text-gray-600">{r.referenceNumber}</td>
                          <td className="py-3 text-gray-700">{r.requesterName}</td>
                          <td className="py-3 text-gray-600 max-w-[160px] truncate">{TYPE_LABELS[r.type]}</td>
                          <td className="py-3 text-gray-600 max-w-[140px] truncate">{r.department}</td>
                          <td className="py-3">
                            <span className={STATUS_BADGE_CLASS[r.status]}>{STATUS_LABELS[r.status]}</span>
                          </td>
                          <td className="py-3 text-gray-500">{format(new Date(r.createdAt), 'dd/MM/yyyy')}</td>
                          <td className="py-3 text-right">
                            <Link to={`/requests/${r.id}`} className="text-mct-blue hover:underline font-medium">Voir</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {requests.length === 0 && <p className="text-center py-8 text-gray-400">Aucune demande trouvée</p>}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">Page {page} / {totalPages}</p>
                    <div className="flex gap-2">
                      <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm py-1.5 disabled:opacity-40">← Précédent</button>
                      <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm py-1.5 disabled:opacity-40">Suivant →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ===== ONGLET UTILISATEURS ===== */}
      {tab === 'users' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
            <button onClick={openCreate} className="btn-primary text-sm py-1.5 px-4">+ Nouvel utilisateur</button>
          </div>
          {loadingUsers ? (
            <div className="text-center py-12 text-gray-400">Chargement...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-3 font-medium text-gray-500">Nom</th>
                    <th className="text-left pb-3 font-medium text-gray-500">Email</th>
                    <th className="text-left pb-3 font-medium text-gray-500">Rôle</th>
                    <th className="text-left pb-3 font-medium text-gray-500">Département</th>
                    <th className="text-left pb-3 font-medium text-gray-500">Statut</th>
                    <th className="text-right pb-3 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-800">{u.firstName} {u.lastName}</td>
                      <td className="py-3 text-gray-600">{u.email}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">{u.department?.name ?? '—'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {u.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => openEdit(u)} className="text-mct-blue hover:underline font-medium">Modifier</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="text-center py-8 text-gray-400">Aucun utilisateur</p>}
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL UTILISATEUR ===== */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">
              {editingUser ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
            </h3>
            <form onSubmit={saveUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Prénom *</label>
                  <input className="input py-1.5" required value={userForm.firstName} onChange={setF('firstName')} />
                </div>
                <div>
                  <label className="label text-xs">Nom *</label>
                  <input className="input py-1.5" required value={userForm.lastName} onChange={setF('lastName')} />
                </div>
              </div>
              {!editingUser && (
                <div>
                  <label className="label text-xs">Email *</label>
                  <input className="input py-1.5" type="email" required value={userForm.email} onChange={setF('email')} />
                </div>
              )}
              <div>
                <label className="label text-xs">Mot de passe {editingUser ? '(laisser vide = inchangé)' : '*'}</label>
                <input className="input py-1.5" type="password" required={!editingUser} value={userForm.password} onChange={setF('password')} placeholder="Min. 8 caractères" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Rôle *</label>
                  <select className="input py-1.5" required value={userForm.role} onChange={setF('role')}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Département</label>
                  <select className="input py-1.5" value={userForm.departmentId} onChange={setF('departmentId')}>
                    <option value="">— Aucun —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Matricule</label>
                  <input className="input py-1.5" value={userForm.matricule} onChange={setF('matricule')} />
                </div>
                <div>
                  <label className="label text-xs">Fonction</label>
                  <input className="input py-1.5" value={userForm.fonction} onChange={setF('fonction')} />
                </div>
              </div>
              {editingUser && (
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={userForm.isActive} onChange={setF('isActive')} className="w-4 h-4" />
                  Compte actif
                </label>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary flex-1 py-2">Annuler</button>
                <button type="submit" className="btn-primary flex-1 py-2">{editingUser ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
