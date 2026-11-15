import { Link } from 'react-router'
import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import '../styles/Privacy.css'

export default function Privacy({ signedIn = false }) {
  return (
    <PageShell width="narrow" className="privacy-page">
      <PageHeader title="Your privacy" subtitle="A plain-language look at what happens to your information." />
      <div className="privacy-sections">
        <section aria-labelledby="privacy-stored">
          <h2 id="privacy-stored">What is saved</h2>
          <p>Closure uses Supabase to manage your account and save your preferred name, email, goals, timezone and settings. Your saved moods and notes, journal entries, unsent letters, story, reflections and reasons for no contact are stored there too.</p>
          <p>Opening Closure while signed in records an app-visit date. No-contact dates are saved only when you confirm them. The tracker does not read your messages or monitor whether you contact anyone.</p>
          <p>If you enable reminders, we also save a browser push subscription, a device identifier and your chosen reminder time so a reminder can reach that device. Your browser keeps a sign-in session so you can stay signed in. While you write, unsaved drafts are kept in a separate device-only database. They are never synced or put in the public offline cache. Closure does not encrypt these local drafts; anyone who can access your browser profile may be able to read them. Drafts are removed after saving, explicit discard, sign-out or account deletion on this device. Browser storage limits, a full disk or device-data cleanup can remove drafts.</p>
        </section>
        <section aria-labelledby="privacy-access">
          <h2 id="privacy-access">Who can access your writing</h2>
          <p>The app is designed to let each signed-in person access their own saved data. Other people using Closure cannot browse your writing through the app.</p>
          <p>Your writing is not end-to-end encrypted. That means it is not locked with a key that only you hold. People with the appropriate backend administrator permissions can access saved data, including writing. Closure does not promise that only you can read it.</p>
        </section>
        <section aria-labelledby="privacy-reminders">
          <h2 id="privacy-reminders">Notifications stay general</h2>
          <p>Closure reminder notifications use fixed, general text. They never include your name, moods, notes, writing, no-contact reasons or counts. Your browser or device may still show the Closure app name or icon on a lock screen.</p>
          <p>Reminders are optional and apply to the device where you enable them. You can turn them off in Settings or your browser. Signing out tries to remove that deviceâ€™s reminder registration. If it cannot finish, you can block notifications in your browser. Delivery can be delayed.</p>
        </section>
        <section aria-labelledby="privacy-choice">
          <h2 id="privacy-choice">Take a copy or leave</h2>
          <p>In Settings, choose Download my data for a readable Markdown file or a JSON file. The file is prepared in your browser from your saved rows. Unsaved device drafts are not included; save them to your account first if you want them in the download. It includes writing and letters, so keep the downloaded copy somewhere private.</p>
          <p>Delete my account asks you to type DELETE and confirm that the action is permanent. It removes your live account and its saved app data, including reminder registrations. You can download a copy first.</p>
          <p>Account deletion does not remove files you downloaded, your Google account, browser history, or provider-managed backups and logs. This page does not promise a retention period for those provider copies. A reminder already on its way may still arrive.</p>
        </section>
        <section aria-labelledby="privacy-support">
          <h2 id="privacy-support">A little room to pause</h2>
          <p>The support exercise does not save what you do there. The urge-to-text flow does not record that you felt an urge or keep a timer history. Reasons and reflections you choose to save are saved to your account like your other writing.</p>
          <p>You decide what to write and whether to use reminders or celebrations. You can return in your own time.</p>
        </section>
      </div>
      <Link className="privacy-back" to={signedIn ? '/onboarding' : '/'}>{signedIn ? 'Back to Settings' : 'Back to Welcome'}</Link>
    </PageShell>
  )
}
