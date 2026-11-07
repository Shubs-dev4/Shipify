# Builder analytics: setup notes

Files:
- `public/index.html` : the builder (project dashboards include Analytics and Products tabs, plus a tracking snippet in exports)
- `supabase/migrations/001_init.sql` : database tables, security rules, `site_stats` function
- `supabase/migrations/003_netlify_deployments.sql` : private Netlify deployment records
- `supabase/functions/collect/index.ts` : the `/collect` endpoint that receives events
- `supabase/functions/publish/index.ts` : authenticated Netlify site deployment
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
2. **Run the SQL.** Open SQL Editor, paste and run `supabase/migrations/001_init.sql`, then paste and run `supabase/migrations/002_project_plans.sql`. If you already ran `001_init.sql`, run only `002_project_plans.sql`. A `Success. No rows returned` result is expected: these files create tables, policies and project-limit triggers rather than selecting data. Do not run a migration again if it already succeeded.
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
6. **Set up Pro billing in Stripe.** Create a Stripe Product named **Shipify Pro** with a **$25 USD monthly recurring** price. Copy the price ID. Enable Stripe's customer billing portal and allow customers to cancel subscriptions. Add a webhook at `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook` for `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`; copy its signing secret. From the project folder, configure server-only secrets and deploy the functions:
   ```
   supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_PRO_PRICE_ID=price_... STRIPE_WEBHOOK_SECRET=whsec_... SHIPIFY_APP_URL=https://shubs-dev4.github.io/Shipify/
   supabase functions deploy billing
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
   Use Stripe test keys and a test price while testing, then switch to live keys/price before charging customers. Never put Stripe secrets in `public/index.html`. The app gives each account one free project; an active Pro subscription unlocks unlimited creations. Existing projects remain saved if a subscription expires or is canceled. The database trigger enforces the limit even if a browser bypasses the UI. Pro status is synchronized from verified Stripe webhooks. Customers can open Stripe's Billing Portal from the account's plan notice to manage or cancel their subscription.
7. **Configure Netlify publishing.** Create or choose the Netlify account that will own customer sites, then create a Netlify personal access token. Apply `supabase/migrations/003_netlify_deployments.sql` in the Supabase SQL Editor. From the project folder, configure the token as a server-only secret and deploy the authenticated function:
   ```
   supabase secrets set NETLIFY_ACCESS_TOKEN=YOUR_NETLIFY_PERSONAL_ACCESS_TOKEN
   supabase functions deploy publish
   ```
   Do not put this token in `public/index.html`, the browser, or a customer-visible repository. After deployment, open a saved project in Shipify and click **Publish**. The first publish creates one shared Netlify storefront gateway and a separate Netlify site for that project. Its public URL will look like `https://SHARED-GATEWAY.netlify.app/store-name-projectid/`; subsequent publishes update the project site and shared gateway routes while keeping that path stable. The editor toolbar provides **View site** and **Republish** controls. Static Netlify proxy redirects route each shared path to its project site. Custom-domain setup is not implemented yet; when you own a Shipify domain, configure it on the shared gateway and then add per-store domain management. The function enforces Netlify's documented limit of three deploys per minute and 100 per day for the shared account. Deleting a project in Shipify does not delete its Netlify deployment; remove that site from Netlify separately. Review your Netlify plan's site, bandwidth, and build limits before inviting customers.
8. **Export and host manually (optional).** Click **Download site** to get a ZIP for a different host. The exported site includes `track.js` when analytics is configured.
9. **Test.** Visit a deployed site, click around, then check Table Editor > `events` in Supabase. Rows should appear. Test Pro in Stripe test mode before enabling live charges.

## Known limits right now

- The Dashboard shows **sample data** until `siteId` is set. Live dashboard data requires signing in as the Supabase Auth user who owns that site, because row-level security blocks anonymous reads. Projects are stored in Supabase and scoped to the signed-in user by row-level security; project content is not stored in localStorage.
- Accounts get one free project; **Pro costs $25/month and allows unlimited projects**. Creating a second project requires an active Stripe subscription. Stripe checkout and the verified webhook must be deployed and configured as described above; until then, the upgrade option reports that billing is unavailable.
- Every project card has a Dashboard that opens as a full page with a left-hand menu for Analytics and Products, regardless of template. The dashboard can be bookmarked and restored by URL, and its Back to projects button returns to the project list. Product management is always available from the dashboard. Removing the last Products section or switching to a template without products resets the catalog and removes leftover Products sections from other pages; adding a product from the dashboard then adds a Products section to the project. All Products sections show active products from the shared catalog, and dashboard edits update the editor preview immediately. Product data is saved as part of its project; Analytics uses the configured Supabase site and is not separated by local project.
- Project cards show an Unpublished/Published badge after a successful shared-path Netlify deployment. Publishing and republishing require migration `003_netlify_deployments.sql`, a configured server-side Netlify token, and the deployed `publish` Edge Function. Each store's temporary path URL is stable, but custom-domain assignment and DNS verification are not implemented yet.
- Contact and email signup sections can be connected in the editor: open the section's Design menu, enter a hosted form provider's HTTPS endpoint, and save it. Exported sites submit form data directly to that provider and show status feedback. Use a provider endpoint that permits browser CORS requests and accepts POST form data, such as a compatible Formspree endpoint. Shipify does not receive or store form submissions.
- Buttons and other linkable text can point to another project page or a phone number. Focus a link/button in the editor, enter a phone number in the Phone number field, and save; exported sites use a `tel:` link. Phone numbers must contain 7–15 digits and may include a leading `+`, spaces, parentheses, periods, or hyphens.
- Forms without an endpoint remain disconnected and display an editor setup message when submitted.
- The exported cart and checkout are still simulated, so revenue stays at $0 until Stripe is added.
- The rate limiter is per edge instance (best effort, not a global cap).

## Build order from here

1. **Accounts and saved projects** (Supabase Auth and per-user Supabase project storage): done
2. **Publish button** (Netlify API deployment behind shared storefront paths): implemented; configure migration `003_netlify_deployments.sql`, `NETLIFY_ACCESS_TOKEN`, and the `publish` Edge Function as described above. Custom-domain controls remain to be built.
3. Tracking + dashboard: **done** (this package)
4. **Stripe Pro subscriptions** (one free project, unlimited on the $25/month plan): implemented; configure the Stripe product, secrets and webhook above.
5. **Stripe Checkout + webhook** writing to `orders` / `order_items` (revenue, AOV, top products come from here)
6. Extras: live visitors, CSV export, daily rollup tables once volume grows

## Privacy notes

No raw IPs are stored. The IP is used only as an in-memory rate-limit key. Country is read from the edge's `cf-ipcountry` header. Visitors are identified by a random id in the browser's localStorage, with no cookies.
