import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'

import '@fontsource/newsreader/latin-400.css'
import '@fontsource/newsreader/latin-400-italic.css'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import './styles/tokens.css'
import './styles/index.css'
import App from './App.jsx'
import StartupScreen from './pages/StartupScreen'
import RouteError from './pages/RouteError'
import { configurationReady } from './lib/supabase'
import PwaStatus from './components/PwaStatus'
import { startPwa } from './utils/pwaRuntime'
import { startTheme } from './utils/theme'
startTheme()
startPwa({ production: import.meta.env.PROD })
import './styles/Alignment.css'

// A data router provides navigation blocking for unsaved journal drafts.
const router = createBrowserRouter([
  {
    path: '*',
    element: configurationReady ? <App /> : <StartupScreen />,
    errorElement: <RouteError />,
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PwaStatus />
    <RouterProvider router={router} />
  </StrictMode>,
)
