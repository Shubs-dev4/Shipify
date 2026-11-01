# Builder analytics: setup notes

Files:
- `public/index.html` : the builder (project dashboards include Analytics and Products tabs, plus a tracking snippet in exports)
- `supabase/migrations/001_init.sql` : database tables, security rules, `site_stats` function
- `supabase/functions/collect/index.ts` : the `/collect` endpoint that receives events
- `supabase/config.toml` : Supabase CLI project and function settings
- `.github/workflows/pages.yml` : publishes only `public/` to GitHub Pages

## Publish the builder on GitHub Pages

The GitHub repository can contain the builder source and Supabase files, while Pages publishes only `public/`. The included GitHub Actions workflow deploys `public/` whenever you push to `main`.

1. Create a **public, empty** repository on GitHub. Do not add a README, license, or `.gitignore` there.
2. In VS Code's terminal, from the Shipify project folder, run:
   ```
   git add --all
   git commit -m "Prepare Shipify for GitHub Pages"
   git remote add origin https://github.com/YOUR_GITHUB_NAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```
   Replace the URL with your repository's HTTPS URL. GitHub may open a sign-in prompt.
3. On GitHub, open the repository's **Settings → Pages**. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. Open the **Actions** tab and wait for **Deploy GitHub Pages** to finish successfully. Your builder URL will appear in the workflow's deployment details and under **Settings → Pages**. It usually looks like `https://YOUR_GITHUB_NAME.github.io/YOUR_REPOSITORY/`.

Only files inside `public/` are included in the deployed website. The SQL, Edge Function, README, and local credentials file are not served by Pages. The credentials file is also excluded from Git by `.gitignore`.

This publishes the **Shipify builder**. A separate website exported from the builder needs its own Pages deployment (or must replace the contents of `public/` if you want it at this same URL).

## Go live (about 20 minutes)

1. **Create a Supabase project** at supabase.com (free tier is fine), unless you already have one.
2. **Run the SQL.** Open SQL Editor, paste all of `supabase/migrations/001_init.sql`, and click Run. A `Success. No rows returned` result is expected: this file creates tables and policies rather than selecting data. Do not run it again if it already succeeded.
3. **Deploy the endpoint.** Install the Supabase CLI, then from the folder that contains `supabase/`:
   ```
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy collect
   ```
   The function is configured with JWT verification disabled because exported sites are public and must be able to call it. The function uses Supabase's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment secrets; do not put the service-role key in the builder or share it.
4. **Create your site row.** Sign up once in Supabase (Authentication > Users > Add user) and copy that user's id. Then in SQL Editor:
   ```
   insert into sites (owner, domain) values ('YOUR_USER_ID', null)
   returning id, site_key;
   ```
   Keep the `id` and `site_key` it returns. Set `domain` to your real hostname later (for example `mysite.pages.dev`) so other origins can't send events.
5. **Fill in the builder.** In `public/index.html`, search for `Backend config` and set:
   ```
   const BACKEND={supabaseUrl:'https://YOUR_PROJECT_REF.supabase.co',
     anonKey:'YOUR_PUBLISHABLE_OR_ANON_KEY',   // Project Settings > API
     token:'', siteId:'THE_ID', siteKey:'THE_SITE_KEY'};
   ```
   The URL and publishable/anon key are intended for browser use. `siteId` and `siteKey` are returned by the insert query; the site key is included in the exported tracking script, so restrict the site's domain in the database once you know its hostname. Never use the service-role key here.
   The builder's sign-up and sign-in use Supabase Auth with this same publishable/anon key. In Supabase, set **Authentication → URL Configuration → Site URL** to `https://shubs-dev4.github.io/Shipify/` and add that URL under **Redirect URLs** so email-confirmation links can return to the builder. Email confirmations can be enabled in the Supabase Auth provider settings; when enabled, signup asks the user to confirm by email before signing in. Signed-in users' projects are loaded from and autosaved to the `projects` table. Opening a project adds its ID to the builder URL (`?project=<id>`), so refreshing or opening that URL while signed into the owning account reopens the project. The existing `projects` table and `own_projects` row-level security policy from step 2 must be applied; project saving does not use browser storage.
6. **Export and host.** Click Download site, upload the folder to any static host (Netlify, Cloudflare Pages, GitHub Pages). The export now contains `track.js`.
7. **Test.** Visit the hosted site, click around, then check Table Editor > `events` in Supabase. Rows should appear.

## Known limits right now

- The Dashboard shows **sample data** until `siteId` is set. Live dashboard data requires signing in as the Supabase Auth user who owns that site, because row-level security blocks anonymous reads. Projects are stored in Supabase and scoped to the signed-in user by row-level security; project content is not stored in localStorage.
- Every project card has a Dashboard with Analytics and Products tabs, regardless of template. Product management is always available from the dashboard. Removing the last Products section or switching to a template without products resets the catalog and removes leftover Products sections from other pages; adding a product from the dashboard then adds a Products section to the project. All Products sections show active products from the shared catalog, and dashboard edits update the editor preview immediately. Product data is saved as part of its project; Analytics uses the configured Supabase site and is not separated by local project.
- Project cards show an Unpublished/Published badge. Clicking Publish marks the project Published in its saved project data, but Publish is still a demo and does not deploy the site.
- Contact and email signup sections can be connected in the editor: open the section's Design menu, enter a hosted form provider's HTTPS endpoint, and save it. Exported sites submit form data directly to that provider and show status feedback. Use a provider endpoint that permits browser CORS requests and accepts POST form data, such as a compatible Formspree endpoint. Shipify does not receive or store form submissions.
- Buttons and other linkable text can point to another project page or a phone number. Focus a link/button in the editor, enter a phone number in the Phone number field, and save; exported sites use a `tel:` link. Phone numbers must contain 7–15 digits and may include a leading `+`, spaces, parentheses, periods, or hyphens.
- Forms without an endpoint remain disconnected and display an editor setup message when submitted.
- The exported cart and checkout are still simulated, so revenue stays at $0 until Stripe is added.
- The rate limiter is per edge instance (best effort, not a global cap).

## Build order from here

1. **Accounts and saved projects** (Supabase Auth and per-user Supabase project storage): done
2. **Publish button** (upload the export to Cloudflare Pages or Netlify via API, auto-create the `sites` row)
3. Tracking + dashboard: **done** (this package)
4. **Stripe Checkout + webhook** writing to `orders` / `order_items` (revenue, AOV, top products come from here)
5. Extras: live visitors, CSV export, daily rollup tables once volume grows

## Privacy notes

No raw IPs are stored. The IP is used only as an in-memory rate-limit key. Country is read from the edge's `cf-ipcountry` header. Visitors are identified by a random id in the browser's localStorage, with no cookies.
