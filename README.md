# Task Board

A four-column Kanban board with task editing, drag and drop, search, priority filtering, due dates, progress counts, and a responsive layout.

## Run locally

1. Create a free Supabase project and enable **Authentication → Providers → Anonymous**.
2. Run `schema.sql` in the Supabase SQL editor.
3. Add the project URL and **publishable** key to `src/config.js`. Never use a service role key.
4. Run `npm ci`, then `npm run dev`.

`npm run build` creates the deployable `dist/` folder. If `src/config.js` is blank, the app runs in browser-local preview mode with sample tasks. With Supabase configured, it signs in anonymously on first launch and stores each task under the guest user's ID.

Live demo: https://task-board-assessment-gabe-eatons-projects.vercel.app

## Design notes

The board uses a neutral background, a green accent, compact cards, and status dots. On smaller screens, the columns scroll horizontally. Drag and drop moves tasks on desktop; the status selector works on touch and keyboard devices.

## Security

The client uses only a public publishable key. The `tasks` table has RLS policies for all four operations; every policy checks `auth.uid() = user_id`. Anonymous Auth users have the `authenticated` database role and get separate user IDs. The current browser's guest session is retained by Supabase Auth storage. Clearing browser data loses access to that guest's tasks.
