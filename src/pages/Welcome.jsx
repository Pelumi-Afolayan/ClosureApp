import { useState } from 'react'
import { ArrowRight, BookOpen, Heart, Leaf, Sun } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
const moods = ['Sad', 'Angry', 'Relieved', 'Hopeful', 'Numb']
export default function Welcome() {
  const [mood, setMood] = useState('')
  const [notice, setNotice] = useState('')
  function account(action) { setNotice(`${action} is our next milestone. This preview does not create accounts or save personal information yet.`) }
  return <div className="min-h-screen bg-cream text-ink">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-7 sm:px-10">
      <a href="#" aria-label="Closure home" className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Leaf className="text-sage" aria-hidden="true" />closure.</a>
      <Button secondary onClick={() => account('Log in')}>Log in <ArrowRight size={16} aria-hidden="true" /></Button>
    </header>
    <main id="main" className="mx-auto max-w-6xl px-6 sm:px-10">
      <section aria-labelledby="welcome-title" className="grid items-center gap-14 pb-16 pt-10 lg:grid-cols-2 lg:gap-20 lg:pb-24 lg:pt-20">
        <div>
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-sage-dark">A little space for you</p>
          <h1 id="welcome-title" className="font-display text-5xl leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">After the ending,<br />there’s still <em className="font-normal text-sage-dark">you.</em></h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-muted">A gentle space to process a breakup, put your feelings into words, and take the next day at your own pace.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4"><Button onClick={() => account('Create an account')}>Begin your journey <ArrowRight size={17} aria-hidden="true" /></Button><a href="#preview" className="rounded text-sm font-semibold underline decoration-sage/40 underline-offset-4">Take a look inside</a></div>
          <p className="mt-4 text-sm text-muted">No perfect words. No pressure to feel okay.</p>
          <p role="status" className="mt-5 max-w-md text-sm leading-relaxed text-sage-dark">{notice}</p>
        </div>
        <div id="preview" className="scroll-mt-8 rounded-[2.5rem] bg-mist p-5 sm:p-8">
          <div className="mb-5 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-sage-dark"><span>A glimpse of Today</span><span className="rounded-full border border-sage/25 px-3 py-1">Sample</span></div>
          <Card className="shadow-sm"><Sun size={25} className="mb-5 text-sage" aria-hidden="true" /><p className="text-xs font-semibold uppercase tracking-widest text-muted">A moment of encouragement</p><p className="mt-4 font-display text-3xl leading-snug">You don’t have to figure everything out today.</p><p className="mt-4 text-sm leading-relaxed text-muted">Give yourself room to feel what you feel. One small moment is enough to begin.</p></Card>
          <Card className="mt-4"><fieldset><legend className="font-semibold">What’s here for you today?</legend><p className="mb-4 mt-1 text-sm text-muted">Try a feeling in this preview.</p><div className="flex flex-wrap gap-2">{moods.map(item => <button type="button" key={item} aria-pressed={mood === item} onClick={() => setMood(mood === item ? '' : item)} className={`min-h-11 rounded-full border px-4 py-2 text-sm ${mood === item ? 'border-sage bg-sage text-white' : 'border-sage/25 hover:bg-mist'}`}>{item}</button>)}</div></fieldset><p aria-live="polite" className="mt-4 text-xs leading-relaxed text-muted">{mood ? `${mood} selected. All feelings are welcome. This sample isn’t saved.` : 'Preview only · No check-in is saved.'}</p></Card>
        </div>
      </section>
      <section aria-labelledby="space-title" className="border-t border-sage/20 py-12">
        <h2 id="space-title" className="font-display text-3xl">Room for your own kind of progress.</h2><p className="mt-2 text-sm text-muted">What we’re building, one step at a time</p>
        <div className="mt-8 grid gap-8 md:grid-cols-3">{[{ icon: BookOpen, title: 'Let the words out', text: 'A private journal, your story, and letters you don’t have to send.' }, { icon: Heart, title: 'Meet yourself where you are', text: 'Daily encouragement and mood check-ins, even on the difficult days.' }, { icon: Leaf, title: 'Make it your journey', text: 'Choose every goal that matters to you, and build a gentle check-in habit.' }].map(({ icon: Icon, title, text }) => <article key={title}><Icon size={22} className="mb-4 text-sage-dark" aria-hidden="true" /><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{text}</p></article>)}</div>
      </section>
    </main>
    <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-6 py-8 text-xs text-muted sm:px-10"><span>Closure · A little more room to be you.</span><span>Welcome preview · Accounts and private saving coming next</span></footer>
  </div>
}
