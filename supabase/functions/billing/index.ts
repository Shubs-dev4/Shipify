import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
const appUrl = Deno.env.get("SHIPIFY_APP_URL");
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function stripePost(path: string, params: URLSearchParams) {
  if (!stripeSecretKey) throw new Error("Stripe is not configured on the server.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const result = await response.json();
  if (!response.ok) {
    console.error("Stripe request failed:", response.status, result?.error?.message);
    throw new Error("Stripe could not start billing. Check the Stripe configuration and try again.");
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Billing function is missing Supabase environment configuration.");
    return respond(500, { error: "Billing is not configured yet. Please try again later." });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respond(401, { error: "Please sign in to manage your plan." });
  const auth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user) return respond(401, { error: "Your session expired. Please sign in again." });

  let body: { action?: string };
  try {
    const raw = await req.text();
    if (raw.length > 2000) return respond(413, { error: "Request is too large." });
    body = JSON.parse(raw);
  } catch {
    return respond(400, { error: "Invalid request." });
  }

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: subscription, error: subscriptionError } = await db
    .from("subscriptions")
    .select("stripe_customer_id,status,current_period_end,cancel_at_period_end")
    .eq("owner", authData.user.id)
    .maybeSingle();
  if (subscriptionError) {
    console.error("Could not read subscription:", subscriptionError);
    return respond(500, { error: "Could not check your subscription. Please try again." });
  }

  if (body.action === "status") {
    const active = subscription?.status === "active" || subscription?.status === "trialing";
    return respond(200, {
      plan: active ? "pro" : "free",
      status: subscription?.status ?? "free",
      currentPeriodEnd: subscription?.current_period_end ?? null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    });
  }

  if (body.action === "checkout") {
    if (!stripeSecretKey || !proPriceId || !appUrl) {
      console.error("Billing checkout is missing Stripe price, secret, or app URL configuration.");
      return respond(503, { error: "Pro checkout is not configured yet. Please try again later." });
    }
    if (subscription?.status === "active" || subscription?.status === "trialing") {
      return respond(409, { error: "Your Pro plan is already active." });
    }

    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": proPriceId,
      "line_items[0][quantity]": "1",
      "client_reference_id": authData.user.id,
      "subscription_data[metadata][supabase_user_id]": authData.user.id,
      success_url: `${appUrl}?billing=success`,
      cancel_url: `${appUrl}?billing=cancelled`,
    });
    if (subscription?.stripe_customer_id) params.set("customer", subscription.stripe_customer_id);
    else if (authData.user.email) params.set("customer_email", authData.user.email);

    try {
      const session = await stripePost("checkout/sessions", params);
      if (typeof session.url !== "string") throw new Error("Stripe did not return a checkout URL.");
      return respond(200, { url: session.url });
    } catch (error) {
      console.error("Could not create Stripe Checkout session:", error);
      return respond(502, {
        error: error instanceof Error ? error.message : "Could not start checkout. Please try again.",
      });
    }
  }

  if (body.action === "portal") {
    if (!stripeSecretKey || !appUrl) {
      console.error("Billing portal is missing Stripe secret or app URL configuration.");
      return respond(503, { error: "Billing management is not configured yet. Please try again later." });
    }
    if (!subscription?.stripe_customer_id) {
      return respond(409, { error: "Billing details are not available yet. Please try again shortly." });
    }
    try {
      const session = await stripePost("billing_portal/sessions", new URLSearchParams({
        customer: subscription.stripe_customer_id,
        return_url: appUrl,
      }));
      if (typeof session.url !== "string") throw new Error("Stripe did not return a billing portal URL.");
      return respond(200, { url: session.url });
    } catch (error) {
      console.error("Could not create Stripe Billing Portal session:", error);
      return respond(502, {
        error: error instanceof Error ? error.message : "Could not open billing management. Please try again.",
      });
    }
  }

  return respond(400, { error: "Unknown billing action." });
});
