import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const netlifyToken = Deno.env.get("NETLIFY_ACCESS_TOKEN");
const maxZipSize = 25 * 1024 * 1024;
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

async function readZip(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("The site ZIP is missing.");

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxZipSize) {
      await reader.cancel();
      throw new RangeError("The exported site is too large to publish (25 MB maximum).");
    }
    chunks.push(value);
  }
  if (total < 4) throw new Error("The site ZIP is empty or invalid.");

  const zip = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    zip.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (zip[0] !== 0x50 || zip[1] !== 0x4b) throw new Error("The uploaded site is not a valid ZIP file.");
  return zip;
}

function createGatewayZip(routes: { store_slug: string; netlify_url: string }[] = []) {
  const encoder = new TextEncoder();
  const redirects = routes.flatMap(({ store_slug, netlify_url }) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{8}$/.test(store_slug)) {
      throw new Error("A storefront route has an invalid slug.");
    }
    let upstream: URL;
    try {
      upstream = new URL(netlify_url);
    } catch {
      throw new Error("A storefront route has an invalid deployment URL.");
    }
    if (upstream.protocol !== "https:" || !upstream.hostname.endsWith(".netlify.app")) {
      throw new Error("A storefront route has an invalid deployment URL.");
    }
    const origin = upstream.origin;
    return [
      `/${store_slug} ${origin}/ 200!`,
      `/${store_slug}/ ${origin}/ 200!`,
      `/${store_slug}/* ${origin}/:splat 200!`,
    ];
  }).join("\n");
  const files = [
    {
      name: "index.html",
      content: "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><title>Shipify storefronts</title><body>Open a published store URL to continue.</body></html>",
    },
    {
      name: "_redirects",
      content: redirects ? `${redirects}\n` : "",
    },
  ];

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let crc = n;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    crcTable[n] = crc >>> 0;
  }
  const crc32 = (data: Uint8Array) => {
    let crc = -1;
    for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (~crc) >>> 0;
  };
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, data.length, true);
    header.setUint32(22, data.length, true);
    header.setUint16(26, name.length, true);
    local.push(new Uint8Array(header.buffer), name, data);

    const directory = new DataView(new ArrayBuffer(46));
    directory.setUint32(0, 0x02014b50, true);
    directory.setUint16(4, 20, true);
    directory.setUint16(6, 20, true);
    directory.setUint32(16, crc, true);
    directory.setUint32(20, data.length, true);
    directory.setUint32(24, data.length, true);
    directory.setUint16(28, name.length, true);
    directory.setUint32(42, offset, true);
    central.push(new Uint8Array(directory.buffer), name);
    offset += 30 + name.length + data.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const parts = [...local, ...central, new Uint8Array(end.buffer)];
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of parts) {
    result.set(part, position);
    position += part.length;
  }
  return result;
}

async function netlifyRequest(path: string, init: RequestInit) {
  const response = await fetch(`https://api.netlify.com/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${netlifyToken}`,
      ...init.headers,
    },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Netlify API request failed:", response.status, result?.message);
    throw new Error("Netlify could not publish this site. Check the Netlify account configuration and try again.");
  }
  return result;
}

async function consumePublishSlots(count: number) {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Publishing database is not configured.");
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("consume_netlify_publish_slot", { p_count: count });
  if (error) {
    console.error("Could not check the Netlify publishing limit:", error);
    throw new Error("Could not check publishing capacity. Please try again.");
  }
  if (data === "minute_limit") throw new Error("The shared Netlify account reached its per-minute publish limit. Please wait a minute and try again.");
  if (data === "daily_limit") throw new Error("The shared Netlify account reached its daily publish limit. Please try again tomorrow.");
  if (data !== "allowed") {
    console.error("Netlify publishing limit returned an unexpected result:", data);
    throw new Error("Could not check publishing capacity. Please try again.");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !netlifyToken) {
    console.error("Publishing function is missing Supabase or Netlify environment configuration.");
    return respond(503, { error: "Netlify publishing is not configured yet. Please try again later." });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respond(401, { error: "Please sign in before publishing." });
  const auth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user) return respond(401, { error: "Your session expired. Please sign in again." });

  const projectId = new URL(req.url).searchParams.get("project_id");
  if (!projectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
    return respond(400, { error: "A valid project ID is required." });
  }
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/zip") {
    return respond(415, { error: "The exported site must be sent as a ZIP file." });
  }
  const declaredSize = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > maxZipSize) {
    return respond(413, { error: "The exported site is too large to publish (25 MB maximum)." });
  }

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: project, error: projectError } = await db
    .from("projects")
    .select("id,name")
    .eq("id", projectId)
    .eq("owner", authData.user.id)
    .maybeSingle();
  if (projectError) {
    console.error("Could not verify project ownership:", projectError);
    return respond(500, { error: "Could not verify project ownership. Please try again." });
  }
  if (!project) return respond(404, { error: "That project was not found in your account." });

  let zip: Uint8Array;
  try {
    zip = await readZip(req);
  } catch (error) {
    if (error instanceof RangeError) return respond(413, { error: error.message });
    return respond(400, { error: error instanceof Error ? error.message : "The site ZIP could not be read." });
  }

  const { data: existing, error: deploymentError } = await db
    .from("project_deployments")
    .select("netlify_site_id,netlify_url,store_slug,storefront_url")
    .eq("project_id", project.id)
    .eq("owner", authData.user.id)
    .maybeSingle();
  if (deploymentError) {
    console.error("Could not read the site's deployment:", deploymentError);
    return respond(500, { error: "Could not load publishing details. Apply the publishing database migration and try again." });
  }

  const { data: gateway, error: gatewayError } = await db
    .from("storefront_gateway")
    .select("netlify_site_id,netlify_url,status")
    .eq("id", true)
    .single();
  if (gatewayError) {
    console.error("Could not read the storefront gateway:", gatewayError);
    return respond(500, { error: "Could not load the shared storefront. Apply the publishing database migration and try again." });
  }

  let gatewaySiteId = gateway.netlify_site_id;
  let gatewayUrl = gateway.netlify_url;
  let createdGateway = false;
  if (gateway.status !== "ready" || !gatewaySiteId || !gatewayUrl) {
    const { data: claimed, error: claimError } = await db.rpc("claim_storefront_gateway");
    if (claimError) {
      console.error("Could not initialize the storefront gateway:", claimError);
      return respond(500, { error: "Could not initialize the shared storefront. Please try again." });
    }
    if (claimed !== true) return respond(409, { error: "The shared storefront is being initialized. Please try publishing again in a minute." });

    try {
      await consumePublishSlots(1);
      const gatewaySite = await netlifyRequest("/sites", {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: createGatewayZip(),
      });
      if (!gatewaySite || typeof gatewaySite.id !== "string" || typeof (gatewaySite.ssl_url || gatewaySite.url) !== "string") {
        console.error("Netlify returned incomplete storefront gateway details.");
        throw new Error("Netlify did not return valid shared storefront details.");
      }
      gatewaySiteId = gatewaySite.id;
      gatewayUrl = gatewaySite.ssl_url || gatewaySite.url;
      const { error } = await db.from("storefront_gateway").update({
        netlify_site_id: gatewaySiteId,
        netlify_url: gatewayUrl,
        status: "ready",
        updated_at: new Date().toISOString(),
      }).eq("id", true);
      if (error) {
        console.error("Could not save the shared storefront details:", error);
        return respond(500, { error: "The shared storefront was created, but its details could not be saved. Contact support before retrying." });
      }
      createdGateway = true;
    } catch (error) {
      const { error: resetError } = await db.from("storefront_gateway").update({
        status: "not_created",
        updated_at: new Date().toISOString(),
      }).eq("id", true);
      if (resetError) console.error("Could not reset storefront gateway setup state:", resetError);
      if (error instanceof Error && error.message.includes("limit")) {
        const status = error.message.includes("daily") || error.message.includes("minute") ? 429 : 500;
        return respond(status, { error: error.message });
      }
      console.error("Could not create the shared storefront:", error);
      return respond(502, { error: error instanceof Error ? error.message : "Could not create the shared storefront." });
    }
  }

  const storeSlug = existing?.store_slug || (
    String(project.name || "store").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 35) || "store"
  ) + "-" + project.id.slice(0, 8);
  const storefrontUrl = `${gatewayUrl.replace(/\/+$/, "")}/${storeSlug}/`;

  try {
    await consumePublishSlots(1);
  } catch (error) {
    if (error instanceof Error && error.message.includes("limit")) {
      const status = error.message.includes("daily") || error.message.includes("minute") ? 429 : 500;
      return respond(status, { error: error.message });
    }
    console.error("Could not check Netlify publishing capacity:", error);
    return respond(500, { error: error instanceof Error ? error.message : "Could not check publishing capacity." });
  }

  try {
    const deployment = existing
      ? await netlifyRequest(`/sites/${encodeURIComponent(existing.netlify_site_id)}/deploys`, {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: zip,
      })
      : await netlifyRequest("/sites", {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: zip,
      });

    if (!deployment || typeof deployment.id !== "string" || (!existing && typeof deployment.site_id !== "string" && typeof deployment.id !== "string")) {
      console.error("Netlify returned incomplete site deployment details.");
      return respond(502, { error: "Netlify did not return valid site deployment details." });
    }
    const netlifySiteId = existing?.netlify_site_id || deployment.site_id || deployment.id;
    const netlifyUrl = existing?.netlify_url ||
      (typeof deployment.ssl_url === "string" ? deployment.ssl_url : deployment.url);
    if (typeof netlifyUrl !== "string" || !netlifyUrl.startsWith("https://") || !netlifyUrl.endsWith(".netlify.app")) {
      console.error("Netlify returned an invalid store site URL.");
      return respond(502, { error: "Netlify did not return a valid store site URL." });
    }
    const state = typeof deployment.state === "string" ? deployment.state : "processing";
    const deploymentRecord = {
      project_id: project.id,
      owner: authData.user.id,
      netlify_site_id: netlifySiteId,
      netlify_url: netlifyUrl,
      store_slug: storeSlug,
      storefront_url: storefrontUrl,
      deploy_id: deployment.id,
      deploy_state: state,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db.from("project_deployments").upsert(deploymentRecord, { onConflict: "project_id" });
    if (error) {
      console.error("Could not save Netlify deployment details:", error);
      return respond(500, { error: "Netlify accepted the deploy, but its publishing record could not be saved. Contact support before retrying." });
    }

    const routes: { store_slug: string; netlify_url: string }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: routeBatch, error: routesError } = await db
        .from("project_deployments")
        .select("store_slug,netlify_url")
        .neq("deploy_state", "failed")
        .order("store_slug")
        .range(offset, offset + 999);
      if (routesError) {
        console.error("Could not load storefront routes:", routesError);
        return respond(500, { error: "The site was deployed, but shared storefront routes could not be updated. Please retry publishing." });
      }
      routes.push(...routeBatch);
      if (routeBatch.length < 1000) break;
    }

    const { data: claimedUpdate, error: updateClaimError } = await db.rpc("claim_storefront_gateway_update");
    if (updateClaimError) {
      console.error("Could not claim the shared storefront for route updates:", updateClaimError);
      return respond(500, { error: "Could not safely update shared storefront routes. Please retry publishing." });
    }
    if (claimedUpdate !== true) {
      return respond(409, { error: "Another store is updating the shared storefront. Please retry publishing in a minute." });
    }

    try {
      await consumePublishSlots(1);
      const gatewayDeployment = await netlifyRequest(`/sites/${encodeURIComponent(gatewaySiteId)}/deploys`, {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: createGatewayZip(routes),
      });
      if (!gatewayDeployment || typeof gatewayDeployment.id !== "string") {
        throw new Error("Netlify returned incomplete shared storefront deployment details.");
      }
    } catch (error) {
      const { error: releaseError } = await db.from("storefront_gateway").update({
        status: "ready",
        updated_at: new Date().toISOString(),
      }).eq("id", true).eq("status", "updating");
      if (releaseError) console.error("Could not release the shared storefront update claim:", releaseError);
      if (error instanceof Error && error.message.includes("limit")) {
        return respond(429, { error: error.message });
      }
      console.error("Could not update shared storefront routes:", error);
      return respond(502, { error: "The site was deployed, but Netlify could not update shared storefront routes. Please retry publishing." });
    }
    const { error: releaseError } = await db.from("storefront_gateway").update({
      status: "ready",
      updated_at: new Date().toISOString(),
    }).eq("id", true).eq("status", "updating");
    if (releaseError) {
      console.error("Could not release the shared storefront update claim:", releaseError);
      return respond(500, { error: "The site and routes were deployed, but shared storefront state could not be updated. Retry publishing." });
    }
    return respond(200, { url: storefrontUrl, state, gatewayCreated: createdGateway });
  } catch (error) {
    console.error("Could not deploy the site to Netlify:", error);
    return respond(502, { error: error instanceof Error ? error.message : "Could not publish the site to Netlify." });
  }
});
