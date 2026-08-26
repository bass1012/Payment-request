import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import toast from 'react-hot-toast'
import type { Request } from '../types'
import { STATUS_LABELS, STATUS_BADGE_CLASS, TYPE_LABELS, getStatusLabel, isUserTurnMatch } from '../types'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type Tab = 'requests' | 'users'

interface Department { id: string; name: string; code: string; directionName: string; directionCode: string; selectable?: boolean }

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
import { useUsers } from '../hooks/useUsers'
import { useAdminRequests } from '../hooks/useAdminRequests'
import { VALID_ROLES as ROLES, ROLE_LABELS, Role } from '../constants'

interface User {
  id: string; email: string; firstName: string; lastName: string;
  role: Role; matricule: string | null; fonction: string | null;
  isActive: boolean; department: Department | null; createdAt: string
}


export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('requests')

  const queryClient = useQueryClient()

  // --- Demandes (React Query) ---
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const { data: reqData, isLoading: loadingReq } = useAdminRequests({
    page, limit: 20, status: statusFilter || undefined, type: typeFilter || undefined,
  })
  const requests = reqData?.data ?? []
  const totalPages = reqData?.totalPages ?? 1

  const handleDeleteRequest = async (id: string, ref: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la demande ${ref} ? Cette action est irréversible et effacera tous les justificatifs liés.`)) {
      try {
        await api.delete(`/requests/${id}`)
        toast.success('Demande supprimée avec succès')
        queryClient.invalidateQueries({ queryKey: ['admin-requests'] })
        queryClient.invalidateQueries({ queryKey: ['requests'] })
      } catch {
        toast.error('Erreur lors de la suppression de la demande')
      }
    }
  }

  // --- Utilisateurs (React Query) ---
  const { data: usersData, isLoading: loadingUsers } = useUsers({ limit: 200 })
  const users = usersData?.data ?? []
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => { const { data } = await api.get('/admin/departments'); return data },
    staleTime: 300_000,
  })
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    role: 'EMPLOYEE', matricule: '', fonction: '', departmentId: '', isActive: true,
  })

  useEffect(() => {
    const closeModalOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowUserModal(false)
    }
    document.addEventListener('keydown', closeModalOnEscape)
    return () => document.removeEventListener('keydown', closeModalOnEscape)
  }, [])

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
      setShowUserModal(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Erreur' : 'Erreur'
      toast.error(msg)
    }
  }

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
                            {(() => {
                              const isUserTurn = isUserTurnMatch(r.nextValidatorEmail, user?.email);
                              const badgeClass = isUserTurn ? 'badge-decision' : STATUS_BADGE_CLASS[r.status];
                              const statusText = getStatusLabel(r, user?.email);
                              return (
                                <span className={badgeClass}>
                                  {statusText}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 text-gray-500">{format(new Date(r.createdAt), 'dd/MM/yyyy')}</td>
                          <td className="py-3 text-right space-x-3">
                            <Link to={`/requests/${r.id}`} className="text-mct-blue hover:underline font-medium">Voir</Link>
                            <button
                              onClick={() => handleDeleteRequest(r.id, r.referenceNumber)}
                              className="text-red-600 hover:text-red-800 hover:underline font-medium"
                            >
                              Supprimer
                            </button>
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
                          {ROLE_LABELS[u.role as Role] ?? u.role}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">{u.department?.name ?? '—'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {u.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => openEdit(u as User)} className="text-mct-blue hover:underline font-medium">Modifier</button>
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
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-dialog-title"
          >
            <h3 id="user-dialog-title" className="text-lg font-semibold text-gray-900 mb-5">
              {editingUser ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
            </h3>
            <form onSubmit={saveUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    {Array.from(groupByDirection(departments)).map(([dirName, depts]) => (
                      <optgroup key={dirName} label={dirName}>
                        {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
