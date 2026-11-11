<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Protected screens live under the pathless `_app` layout (`src/routes/_app.tsx`, `ssr: false`), which checks session, pressing and role access; SSR is disabled globally in `src/start.ts` because the app is device-first (offline, Tauri/Capacitor).
- Use the generated Lovable Cloud client `@/integrations/supabase/client`; never replace it with a hand-written client (it is regenerated).
- Database totals for deposits are computed by triggers; the UI never sends them.
- Schema reference SQL lives in `database/`; schema changes go through reviewed migrations only.
- Advanced billing uses shared cart calculations and mode-specific catalogue/counter modules, while database triggers remain authoritative for saved line totals, to keep previews and stored deposits consistent.
- Management screens share browser-side queries and report calculations; cash expenses create cash movements through database triggers rather than UI inserts, preventing duplicate withdrawals.
- Team screens use shared salary calculations for previews; membership assignment, self-attendance and salary payment use database functions so privileged operations are checked at the database boundary.
- Delivery screens use shared zone pricing and browser queries; delivery status changes and completion use database functions that validate course access, while deposit totals remain trigger-computed.
