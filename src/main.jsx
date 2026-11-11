import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'

import '@fontsource/newsreader/latin-400.css'
import '@fontsource/newsreader/latin-600.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import './styles/tokens.css'
import './styles/index.css'
import App from './App.jsx'

// A data router provides navigation blocking for unsaved journal drafts.
const router = createBrowserRouter([
  {
    path: '*',
    element: <App />,
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
