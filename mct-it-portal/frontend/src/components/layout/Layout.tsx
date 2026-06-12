import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  HomeIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'

const navItems = [
  { to: '/', icon: HomeIcon, label: 'Tableau de bord', exact: true },
  { to: '/new-request', icon: PlusCircleIcon, label: 'Nouvelle demande' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to)

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-mct-blue text-white flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-xl font-bold">MCT IT Portal</h1>
          <p className="text-blue-300 text-sm mt-1">Gestion des demandes IT</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
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

          {['IT_ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '') && (
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/admin')
                  ? 'bg-white/20 text-white'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
              Administration
            </Link>
          )}
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
            onClick={handleLogout}
            className="flex items-center gap-2 text-blue-200 hover:text-white text-sm w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
