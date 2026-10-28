# Meowix Clicker

A mobile-first cat clicker inspired by the broad gameplay loop of tap-to-earn games. It has its own Meowix branding and uses **virtual game coins only**.

## Included
- Responsive dark UI with animated cat tap feedback
- English/Persian interface toggle
- Supabase Auth email/password signup and sign-in
- Server-validated tap, upgrade, and daily-reward RPC functions
- Player energy, tap power, upgrades, and public leaderboard view
- GitHub Pages-friendly static frontend (no build step)

## 1. Configure Supabase
Create a **dedicated** Supabase project for the game. Do not delete existing projects just to make room; check your organization/project limits first.

1. Open the new project's SQL Editor.
2. Run `supabase/schema.sql`.
3. In `config.js`, set `SUPABASE_URL` and the project's **publishable/anon key**.
4. Never put a `service_role` or secret key in this repository.
5. In Supabase Auth settings, configure the site's URL and redirect URLs for your GitHub Pages URL. For a project site, it will look like `https://YOUR_GITHUB_NAME.github.io/Meowix-mini-app/`.
6. If email confirmation is enabled, users need to confirm their email before signing in.

The schema enables RLS and prevents clients from directly changing coin balances. Game-changing actions use database functions.

## 2. Publish with GitHub Pages
1. Push these files to the root of the `main` branch.
2. Open **Settings → Pages** in this repository.
3. Choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
4. Wait for the Pages deployment and open the URL shown there.

## Notes
- Before Supabase is configured, the frontend can be previewed in demo mode. Demo progress is not persistent and should not be considered a secure game account.
- The first version includes daily rewards and a basic leaderboard. Referral reward validation, a full mission editor, and passive coin accrual need additional server-side work before being considered production-ready.
- Coins are fictional in-game points, not cryptocurrency and not redeemable for cash.
- The existing MeowBot bot repository is not modified by this project.
