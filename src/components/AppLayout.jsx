import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { BookHeart, BookOpen, Leaf, LogOut, PenLine, Settings, ShieldCheck, Sun, UserRound, X } from 'lucide-react'
import '../styles/AppLayout.css'

const navigation = [
  { to: '/today', label: 'Today', mobileLabel: 'Today', icon: Sun },
  { to: '/journal', label: 'Journal', mobileLabel: 'Journal', icon: BookOpen },
  { to: '/journal?type=unsent_letter', label: 'Unsent letters', mobileLabel: 'Letters', icon: PenLine },
  { to: '/no-contact', label: 'No contact', mobileLabel: 'No contact', icon: ShieldCheck },
  { to: '/my-story', label: 'My Story', mobileLabel: 'My Story', icon: BookHeart },
]

function AccountLinks({ onNavigate }) {
  return (
    <div className="app-account">
      <Link to="/onboarding" onClick={onNavigate}>
        <Settings size={16} aria-hidden="true" />
        Settings
      </Link>
      <Link to="/sign-out" onClick={onNavigate}>
        <LogOut size={16} aria-hidden="true" />
        Logout
      </Link>
    </div>
  )
}

export default function AppLayout() {
  const location = useLocation()
  const accountDialogRef = useRef(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const lettersSelected = new URLSearchParams(location.search).get('type') === 'unsent_letter'
  const accountSelected = ['/onboarding', '/sign-out'].includes(location.pathname)

  useEffect(() => {
    accountDialogRef.current?.close()

    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.key, location.hash])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 801px)')

    function closeOnDesktop(event) {
      if (event.matches) accountDialogRef.current?.close()
    }

    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  function isCurrent(to) {
    if (to === '/journal' || to === '/journal?type=unsent_letter') {
      return location.pathname.startsWith('/journal') &&
        lettersSelected === to.includes('unsent_letter')
    }

    return location.pathname === to
  }

  function closeAccount() {
    accountDialogRef.current?.close()
  }

  function openAccount() {
    accountDialogRef.current?.showModal()
    setAccountOpen(true)
  }

  return (
    <div className="app-layout">
      <a className="skip-link" href="#app-content">Skip to content</a>

      <aside className="app-sidebar" aria-label="Your space">
        <Link to="/today" className="app-brand" aria-label="Closure home">
          <Leaf size={25} aria-hidden="true" />
          closure.
        </Link>

        <div className="app-sidebar-menu">
          <p className="app-sidebar-label">Your space</p>
          <nav className="app-navigation" aria-label="Your space pages">
            {navigation.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                aria-current={isCurrent(to) ? 'page' : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <AccountLinks />
        </div>
      </aside>

      <div id="app-content" className="app-content" tabIndex={-1}>
        <Outlet />
      </div>

      <nav className="app-bottom-navigation" aria-label="Your space pages">
        {navigation.map(({ to, mobileLabel, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-current={isCurrent(to) ? 'page' : undefined}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{mobileLabel}</span>
          </Link>
        ))}
        <button
          type="button"
          aria-label="You: account options"
          aria-haspopup="dialog"
          aria-controls="app-account-dialog"
          aria-expanded={accountOpen}
          className={accountSelected || accountOpen ? 'app-you-current' : undefined}
          onClick={openAccount}
        >
          <UserRound size={22} aria-hidden="true" />
          <span>You</span>
        </button>
      </nav>

      <dialog
        ref={accountDialogRef}
        id="app-account-dialog"
        className="app-account-dialog"
        aria-labelledby="app-account-title"
        onClose={() => setAccountOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeAccount()
        }}
      >
        <div className="app-account-sheet">
          <header className="app-account-sheet-heading">
            <h2 id="app-account-title">Your account</h2>
            <button type="button" onClick={closeAccount} aria-label="Close account options" autoFocus>
              <X size={22} aria-hidden="true" />
            </button>
          </header>
          <AccountLinks onNavigate={closeAccount} />
        </div>
      </dialog>
    </div>
  )
}
