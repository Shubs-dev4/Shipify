import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

async function validSignature(rawBody: string, header: string) {
  if (!webhookSecret) throw new Error("Stripe webhook secret is not configured.");
  const parts = header.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`)));
  return signatures.some((signature) => safeEqual(signature, expected));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed.", { status: 405 });
  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    console.error("Stripe webhook is missing server configuration.");
    return new Response("Webhook is not configured.", { status: 500 });
  }

  const rawBody = await req.text();
  if (rawBody.length > 1_000_000) return new Response("Event is too large.", { status: 413 });
  let signatureIsValid: boolean;
  try {
    signatureIsValid = await validSignature(rawBody, req.headers.get("stripe-signature") ?? "");
  } catch (error) {
    console.error("Could not validate Stripe webhook signature:", error);
    return new Response("Webhook is not configured.", { status: 500 });
  }
  if (!signatureIsValid) return new Response("Invalid signature.", { status: 400 });

  let event: {
    id?: string;
    type?: string;
    created?: number;
    data?: { object?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid event.", { status: 400 });
  }

  if (!event.id || !event.type || typeof event.created !== "number") return new Response("Invalid event.", { status: 400 });
  const supported = new Set([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]);
  if (!supported.has(event.type)) return new Response(null, { status: 200 });

  const subscription = event.data?.object;
  const metadata = subscription?.metadata as Record<string, unknown> | undefined;
  const owner = metadata?.supabase_user_id;
  if (typeof owner !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(owner)) {
    console.error("Stripe subscription webhook is missing its account metadata.", event.id);
    return new Response("Subscription metadata is missing.", { status: 400 });
  }

  const subscriptionId = subscription?.id;
  if (typeof subscriptionId !== "string" || !subscriptionId) return new Response("Subscription ID is missing.", { status: 400 });
  const customer = subscription?.customer;
  const customerId = typeof customer === "string"
    ? customer
    : customer && typeof customer === "object" && "id" in customer
    ? String(customer.id)
    : null;
  const periodEnd = subscription?.current_period_end;
  const cancelAtPeriodEnd = subscription?.cancel_at_period_end === true;
  const status = typeof subscription?.status === "string" ? subscription.status : "unknown";
  const deleted = event.type === "customer.subscription.deleted";
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { error } = await db.rpc("apply_stripe_subscription", {
    p_owner: owner,
    p_customer_id: customerId,
    p_subscription_id: subscriptionId,
    p_status: deleted ? "canceled" : status,
    p_current_period_end: typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : null,
    p_cancel_at_period_end: deleted || cancelAtPeriodEnd,
    p_event_id: event.id,
    p_event_created: event.created,
  });
  if (error) {
    console.error("Could not save subscription from Stripe webhook:", error);
    return new Response("Could not update subscription.", { status: 500 });
  }

  return new Response(null, { status: 200 });
});
