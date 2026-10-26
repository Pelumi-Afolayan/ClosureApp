# Closure — milestone 1

A React JavaScript app created with Vite and styled with Tailwind CSS v4.

## Run it

Open a terminal in this folder, then run:

```sh
npm install
npm run dev
```

Open the local address printed by Vite. For a production build, run `npm run build`.

## What we built, step by step

1. Created the official Vite React JavaScript starter. Vite runs the development server and produces the production build. `src/main.jsx` mounts React; `src/App.jsx` displays the Welcome page.
2. Installed `tailwindcss@4` and `@tailwindcss/vite@4`. `vite.config.js` connects the Tailwind plugin. `src/index.css` imports Tailwind and defines the cream, sage, charcoal, and font theme. No older Tailwind configuration or v3 directives are needed.
3. Added `src/components/ui/Button.jsx` and `Card.jsx`. These keep shared styling consistent. Input and Modal components can be introduced when a screen needs them.
4. Built `src/pages/Welcome.jsx`. It contains the responsive Welcome layout, sample encouragement, mood preview, and explanations for the future account actions. The sample mood lives in React state and resets on refresh.

## Verify this milestone

- At desktop width, the introduction and Today sample sit side by side.
- Narrow the browser to 375px: content should stack without horizontal scrolling.
- Choose Hopeful, then choose it again: it selects and clears. Nothing is saved.
- Try Begin your journey and Log in: each explains the next account milestone.
- Use Tab to reach links and buttons and check the visible focus outline.
- Use Take a look inside to reach the sample.
- Run `npm run build` to check the production bundle.

Verified during creation: production build passed; local page returned HTTP 200; rendered desktop screen inspected; mood interaction updated the visible message. Narrow phone viewport and real-device testing remain to do.

## Next milestones

1. Account screens, routing, Supabase authentication, email verification and recovery.
2. Onboarding with editable MULTI-SELECT goals, including selecting every goal; personal profiles and timezone.
3. Today: curated daily encouragement, saved mood check-ins, optional notes, and streaks. Final mood labels and streak rules need to be settled when implementing them.
4. Private My Story, journal CRUD, and unsent letters. Enforce ownership using database row-level security and test with two accounts.
5. Mood history and progress, settings, export, and authenticated account/data deletion.
6. PWA manifest, icons, install guidance, deliberate caching/logout behaviour, mobile testing, and deployment.

No accounts, database, private storage, streak calculation, installation, or offline support are implemented in this milestone. Do not enter sensitive writing in a future demo until privacy has been implemented and verified.

The original handoff is preserved in `PROJECT-SPEC.txt`.
