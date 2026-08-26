import { useEffect, useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { canAccessRoute } from '../../constants/routes'
import type { Role } from '../../constants/roles'
import {
  HomeIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  CurrencyDollarIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarSquareIcon,
  UserGroupIcon,
  FolderIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline'

const navItems = [
  { to: '/', icon: HomeIcon, label: 'Tableau de bord', exact: true },
  { to: '/new-request', icon: PlusCircleIcon, label: 'Nouvelle demande' },
  { to: '/documents', icon: FolderIcon, label: 'Centre Documentaire' },
  { to: '/obligations', icon: CheckBadgeIcon, label: 'Obligations' },
  { to: '/delegations', icon: UserGroupIcon, label: 'Délégations' },
  { to: '/treasury', icon: CurrencyDollarIcon, label: 'Paiements Trésorerie', routeKey: '/treasury' },
  { to: '/moyens-generaux', icon: ClipboardDocumentListIcon, label: 'Moyens Généraux', routeKey: '/moyens-generaux' },
  { to: '/reporting', icon: ChartBarSquareIcon, label: 'Reporting SLA', routeKey: '/reporting' },
  { to: '/admin', icon: Cog6ToothIcon, label: 'Administration', routeKey: '/admin' },
]



export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <header className="fixed inset-x-0 top-0 z-40 h-16 bg-mct-blue text-white flex items-center justify-between px-4 shadow-md md:hidden">
        <div>
          <p className="font-bold text-sm">ERP NATIF MCT</p>
          <p className="text-[11px] text-blue-200">Gestion des demandes IT</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="p-2 rounded-lg hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
          aria-label={menuOpen ? 'Fermer le menu principal' : 'Ouvrir le menu principal'}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          {menuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
        </button>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      {/* Sidebar */}
      <aside
        id="main-navigation"
        aria-label="Navigation principale"
        className={`fixed inset-y-0 left-0 w-64 bg-mct-blue text-white flex flex-col flex-shrink-0 z-50 transform transition-transform duration-200 md:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-xl font-bold">ERP NATIF MCT</h1>
          <p className="text-blue-300 text-sm mt-1">Gestion des demandes IT</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems
            .filter(({ routeKey }) => !routeKey || canAccessRoute(user?.role as Role, routeKey))
            .map(({ to, icon: Icon, label, exact }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to, exact)
                    ? 'bg-white/20 text-white'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </Link>
            ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-blue-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-blue-300 truncate">
                {typeof user?.department === 'object' ? user.department?.name : user?.department}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-blue-200 hover:text-white text-sm w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 ml-0 md:ml-64 pt-16 md:pt-0 min-h-screen overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
