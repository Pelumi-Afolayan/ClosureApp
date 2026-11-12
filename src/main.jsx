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
import './styles/Alignment.css'
import './styles/Polish.css'

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
