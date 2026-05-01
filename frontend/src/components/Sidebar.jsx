import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRightOnRectangleIcon,
  UserGroupIcon, ShieldCheckIcon, AcademicCapIcon,
  ClipboardDocumentListIcon, HomeIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const adminNav = [
  { to: '/admin',       icon: HomeIcon,       label: 'Overview' },
  { to: '/admin/users', icon: UserGroupIcon,  label: 'Users' },
]

const teacherNav = [
  { to: '/teacher', icon: ClipboardDocumentListIcon, label: 'My Reports' },
]

export default function Sidebar() {
  const { logout, user, isAdmin } = useAuth()
  const { reset }                 = useData()
  const navigate                  = useNavigate()

  const navItems = isAdmin ? adminNav : teacherNav

  const handleLogout = () => {
    reset()
    logout()
    navigate('/')
  }

  const roleLabel = user?.role === 'admin' ? 'Administrator'
                  : user?.role === 'mentor' ? 'Mentor'
                  : 'Class Teacher'

  const roleColor = isAdmin
    ? 'from-orange-500 to-red-600'
    : 'from-blue-500 to-violet-600'

  return (
    <aside className="fixed left-0 top-0 h-full w-16 md:w-60 bg-navy-800/80
                      backdrop-blur-xl border-r border-white/5 z-50 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 md:px-5 py-5 border-b border-white/5">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleColor}
                         flex items-center justify-center flex-shrink-0`}>
          {isAdmin
            ? <ShieldCheckIcon className="w-4 h-4 text-white" />
            : <AcademicCapIcon className="w-4 h-4 text-white" />}
        </div>
        <div className="hidden md:block">
          <p className="text-xs font-bold gradient-text">AnalytiData</p>
          <p className="text-[10px] text-slate-500">{roleLabel}</p>
        </div>
      </div>

      {/* User badge */}
      {user && (
        <div className="hidden md:flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${roleColor}
                           flex items-center justify-center text-white text-xs
                           font-bold flex-shrink-0`}>
            {user.username?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{user.username}</p>
            <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/admin' || to === '/teacher'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
               transition-all duration-200 relative
               ${isActive
                  ? `${isAdmin ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20'
                               : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'}`
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 flex-shrink-0`} />
                <span className="hidden md:block">{label}</span>
                {isActive && (
                  <motion.div layoutId="activeNav"
                    className={`absolute left-0 w-0.5 h-8 rounded-r-full
                                ${isAdmin ? 'bg-orange-500' : 'bg-blue-500'}`}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-white/5">
        <button id="logout-btn" onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                     text-slate-400 hover:text-red-400 hover:bg-red-500/10
                     transition-all w-full">
          <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          <span className="hidden md:block">Logout</span>
        </button>
      </div>
    </aside>
  )
}
