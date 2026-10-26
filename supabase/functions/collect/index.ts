// POST /functions/v1/collect  — deploy with:  supabase functions deploy collect --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const TYPES = new Set(["pageview", "click", "add_to_cart", "checkout_started"]);
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|java\/|go-http|facebookexternalhit/i;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };
const end = (s: number) => new Response(null, { status: s, headers: cors });

// Best-effort, per-isolate caches. For hard global limits, put Upstash Redis in front.
const sites = new Map<string, { id: string; domain: string | null; exp: number }>();
const hits = new Map<string, { n: number; reset: number }>();
function limited(key: string, max = 120) {            // per minute
  const now = Date.now();
  let h = hits.get(key);
  if (!h || h.reset < now) { h = { n: 0, reset: now + 60_000 }; hits.set(key, h); }
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  return ++h.n > max;
}
const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return end(204);
  if (req.method !== "POST") return end(405);

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return end(204);            // drop bots silently

  let b: any;
  try { const raw = await req.text(); if (raw.length > 4000) return end(413); b = JSON.parse(raw); } catch { return end(400); }
  if (!TYPES.has(b?.t) || typeof b?.k !== "string") return end(400);

  // The IP is used only as an in-memory rate-limit key. It is never written anywhere.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  if (limited(`${b.k}:${ip}`) || limited(`${b.k}:${str(b.sid, 40)}`, 60)) return end(429);

  // Validate the public site key (cached 60s)
  let site = sites.get(b.k);
  if (!site || site.exp < Date.now()) {
    const { data } = await db.from("sites").select("id,domain").eq("site_key", b.k).maybeSingle();
    if (!data) return end(401);
    site = { id: data.id, domain: data.domain, exp: Date.now() + 60_000 };
    sites.set(b.k, site);
  }
  const origin = req.headers.get("origin");
  if (site.domain && origin) {
    let h = ""; try { h = new URL(origin).hostname; } catch { /* ignore */ }
    if (h !== site.domain && !h.endsWith("." + site.domain)) return end(403);
  }

  let referrer = "";
  try { const h = new URL(b.r).hostname; if (h && h !== site.domain) referrer = h.replace(/^www\./, ""); } catch { /* none */ }
  const utm: Record<string, string> = {};
  for (const k of ["source", "medium", "campaign"]) { const v = str(b.u?.[k], 80); if (v) utm[k] = v; }
  const props = JSON.stringify(b.props ?? {}).length <= 1000 ? (b.props ?? {}) : {};

  const { error } = await db.from("events").insert({
    site_id: site.id, type: b.t,
    visitor_id: str(b.vid, 40), session_id: str(b.sid, 40),
    path: str(b.p, 200) || "/", referrer, utm,
    device: /ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop",
    country: req.headers.get("cf-ipcountry"),            // derived from the IP by the edge, IP itself discarded
    props,
  });
  return end(error ? 500 : 204);
});
