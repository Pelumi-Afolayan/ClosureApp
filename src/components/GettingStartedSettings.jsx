import { Link } from 'react-router'
import { BookOpen, MessageSquare, ExternalLink } from 'lucide-react'
import Card from './ui/Card'
import { getFeedbackUrl } from '../utils/feedback'
import '../styles/GettingStarted.css'

export default function GettingStartedSettings() {
  const feedbackUrl = getFeedbackUrl(import.meta.env.VITE_FEEDBACK_FORM_URL)
  return (
    <Card className="getting-started-settings">
      <h2>A little help with Closure</h2>
      <Link to="/today?guide=1" className="getting-started-settings__link"><BookOpen size={20} aria-hidden="true" />Take the quick tour</Link>
      <div className="getting-started-settings__feedback">
        <h3>Help us improve Closure</h3>
        <p>Something confusing or not working? You can share feedback without including your private writing.</p>
        {feedbackUrl ? (
          <a href={feedbackUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="getting-started-settings__link">
            <MessageSquare size={20} aria-hidden="true" />Share feedback<ExternalLink size={16} aria-hidden="true" /><span className="writing-accessible-label"> (opens an external form in a new tab)</span>
          </a>
        ) : <p className="getting-started-settings__hint">The feedback form isn’t available yet.</p>}
        <p className="getting-started-settings__hint">No writing, moods or account details are automatically attached. The external form may have its own privacy settings. Please leave out passwords and private entries.</p>
      </div>
    </Card>
  )
}
