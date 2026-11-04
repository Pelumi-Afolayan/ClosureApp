import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { BookOpen, Heart, Leaf, LogOut, Menu, MessageCircle, Settings, Sun, Target, X } from 'lucide-react'
import '../styles/AppLayout.css'

const navigation = [
  { to: '/today', label: 'Today', icon: Sun },
  { to: '/today#encouragement-title', label: 'Words for today', icon: Leaf },
  { to: '/today#today-feelings', label: 'A moment to check in', icon: Heart },
  { to: '/today#today-next', label: 'What’s next', icon: Target },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/journal?type=unsent_letter', label: 'Unsent Letters', icon: MessageCircle },
  { to: '/my-story', label: 'My Story', icon: Leaf },
]

export default function AppLayout({ user }) {
  const location = useLocation()
  const [openLocation, setOpenLocation] = useState(null)
  const menuOpen = openLocation === location.key
  const currentPath = location.pathname + location.search + location.hash

  useEffect(() => {
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.key, location.hash])

  function isCurrent(to) {
    if (to === '/journal') {
      return location.pathname.startsWith('/journal') &&
        new URLSearchParams(location.search).get('type') !== 'unsent_letter'
    }
    return currentPath === to
  }

  return (
    <div className="app-layout">
      <a className="skip-link" href="#app-content">Skip to content</a>

      <aside className="app-sidebar" aria-label="Your space">
        <div className="app-sidebar-heading">
          <Link to="/today" className="app-brand" aria-label="Closure home">
            <Leaf size={25} aria-hidden="true" />
            closure.
          </Link>
          <button
            type="button"
            className="app-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="app-sidebar-menu"
            onClick={() => setOpenLocation(menuOpen ? null : location.key)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>

        <div id="app-sidebar-menu" className={`app-sidebar-menu${menuOpen ? ' is-open' : ''}`}>
          <p className="app-sidebar-label">YOUR SPACE</p>
          <nav className="app-navigation" aria-label="Your space pages">
            {navigation.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={isCurrent(to) ? 'app-navigation-current' : undefined}
                aria-current={isCurrent(to) ? (to.includes('#') ? 'location' : 'page') : undefined}
              >
                <Icon size={19} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="app-sidebar-note">
            <Leaf size={24} aria-hidden="true" />
            <p>There’s no deadline for finding your footing.</p>
          </div>

          <div className="app-account">
            <span className="app-account-label">Signed in as</span>
            <span className="app-account-email">{user.email}</span>
            <Link to="/onboarding">
              <Settings size={16} aria-hidden="true" />
              Edit name and goals
            </Link>
            <Link to="/sign-out">
              <LogOut size={16} aria-hidden="true" />
              Sign out of all devices
            </Link>
          </div>
        </div>
      </aside>

      <div id="app-content" className="app-content" tabIndex={-1}>
        <Outlet />
      </div>
    </div>
  )
}
