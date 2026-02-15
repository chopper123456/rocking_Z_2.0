import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const JD_API_BASE = "https://sandboxapi.deere.com/platform";
const JD_CLIENT_ID = "0oaspkya0q35SA0H25d7";
const JD_CLIENT_SECRET = Deno.env.get("JD_CLIENT_SECRET") || "";
const JD_TOKEN_URL =
  "https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getValidToken() {
  const supabase = getSupabase();
  const { data: tokens } = await supabase
    .from("jd_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tokens) return null;

  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();
  const bufferMs = (expiresAt.getTime() - now.getTime()) * 0.2;

  if (expiresAt.getTime() - now.getTime() < bufferMs || expiresAt < now) {
    const tokenRes = await fetch(JD_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        client_id: JD_CLIENT_ID,
        client_secret: JD_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) return null;

    const tokenData = await tokenRes.json();
    const newExpiresAt = new Date(
      Date.now() + tokenData.expires_in * 1000
    ).toISOString();

    await supabase
      .from("jd_tokens")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || tokens.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tokens.id);

    return tokenData.access_token;
  }

  return tokens.access_token;
}

async function jdFetch(endpoint: string, accessToken: string) {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${JD_API_BASE}${endpoint}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.deere.axiom.v3+json",
    },
  });

  if (!res.ok) {
    return { error: true, status: res.status, message: await res.text() };
  }

  return await res.json();
}

async function jdFetchAllPages(endpoint: string, accessToken: string) {
  const allValues: unknown[] = [];
  let url: string | null = endpoint.startsWith("http")
    ? endpoint
    : `${JD_API_BASE}${endpoint}`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.deere.axiom.v3+json",
      },
    });

    if (!res.ok) {
      return { error: true, status: res.status, message: await res.text() };
    }

    const data = await res.json();
    if (data.values) {
      allValues.push(...data.values);
    }

    const nextLink = data.links?.find(
      (l: { rel: string }) => l.rel === "nextPage"
    );
    url = nextLink?.uri || null;
  }

  return { values: allValues, total: allValues.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const accessToken = await getValidToken();
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Not authenticated with John Deere" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/jd-api", "");
    const supabase = getSupabase();

    if (path === "/sync/organizations" || path === "/sync/organizations/") {
      const data = await jdFetchAllPages("/organizations", accessToken);
      if (data.error) {
        return new Response(JSON.stringify(data), {
          status: (data as { status: number }).status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const org of (data as { values: Record<string, unknown>[] }).values) {
        const links = org.links as Array<{ rel: string }> | undefined;
        const hasConnection = links?.some((l) => l.rel === "connections");
        await supabase.from("organizations").upsert({
          id: String(org.id),
          name: String(org.name || ""),
          type: String(org.type || ""),
          connection_status: hasConnection ? "pending" : "connected",
          raw_data: org,
          synced_at: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({ synced: (data as { total: number }).total, type: "organizations" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/sync/farms" || path === "/sync/farms/") {
      const { data: orgs } = await supabase.from("organizations").select("id");
      let totalSynced = 0;

      for (const org of orgs || []) {
        const data = await jdFetchAllPages(
          `/organizations/${org.id}/farms`,
          accessToken
        );
        if (data.error) continue;

        for (const farm of (data as { values: Record<string, unknown>[] }).values) {
          await supabase.from("farms").upsert({
            id: String(farm.id),
            org_id: org.id,
            name: String(farm.name || ""),
            raw_data: farm,
            synced_at: new Date().toISOString(),
          });
          totalSynced++;
        }
      }

      return new Response(JSON.stringify({ synced: totalSynced, type: "farms" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/sync/fields" || path === "/sync/fields/") {
      const { data: orgs } = await supabase.from("organizations").select("id");
      let totalSynced = 0;

      for (const org of orgs || []) {
        const data = await jdFetchAllPages(
          `/organizations/${org.id}/fields`,
          accessToken
        );
        if (data.error) continue;

        for (const field of (data as { values: Record<string, unknown>[] }).values) {
          await supabase.from("fields").upsert({
            id: String(field.id),
            org_id: org.id,
            name: String(field.name || ""),
            acreage: Number(field.area?.value || 0),
            raw_data: field,
            synced_at: new Date().toISOString(),
          });
          totalSynced++;
        }
      }

      return new Response(JSON.stringify({ synced: totalSynced, type: "fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/sync/boundaries" || path === "/sync/boundaries/") {
      const { data: orgs } = await supabase.from("organizations").select("id");
      const { data: fields } = await supabase.from("fields").select("id, org_id");
      let totalSynced = 0;

      for (const org of orgs || []) {
        const orgFields = (fields || []).filter((f) => f.org_id === org.id);

        for (const field of orgFields) {
          const data = await jdFetchAllPages(
            `/organizations/${org.id}/fields/${field.id}/boundaries`,
            accessToken
          );
          if (data.error) continue;

          for (const boundary of (data as { values: Record<string, unknown>[] }).values) {
            await supabase.from("boundaries").upsert({
              id: String(boundary.id),
              field_id: field.id,
              org_id: org.id,
              geojson: boundary.multipolygons || boundary.extent || {},
              acreage: Number((boundary as Record<string, { value?: number }>).area?.value || 0),
              raw_data: boundary,
              synced_at: new Date().toISOString(),
            });
            totalSynced++;
          }
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "boundaries" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/equipment" || path === "/sync/equipment/") {
      let totalSynced = 0;
      const errors: string[] = [];

      const rootData = await jdFetchAllPages("/equipment", accessToken);

      if (!rootData.error && (rootData as { values: Record<string, unknown>[] }).values?.length > 0) {
        for (const eq of (rootData as { values: Record<string, unknown>[] }).values) {
          await supabase.from("equipment").upsert({
            id: String(eq.id),
            name: String(eq.name || eq.title || ""),
            make: String(eq.make || ""),
            model: String(eq.model || ""),
            equipment_type: String(eq.type || eq.equipmentType || ""),
            serial_number: String(eq.serialNumber || ""),
            engine_hours: Number(eq.engineHours || 0),
            raw_data: eq,
            synced_at: new Date().toISOString(),
          });
          totalSynced++;
        }
      } else {
        errors.push(`Root endpoint failed: ${(rootData as { message?: string }).message || "404"}`);

        const { data: orgs } = await supabase.from("organizations").select("id");
        for (const org of orgs || []) {
          const orgData = await jdFetchAllPages(
            `/organizations/${org.id}/machines`,
            accessToken
          );

          if (!orgData.error && (orgData as { values: Record<string, unknown>[] }).values) {
            for (const eq of (orgData as { values: Record<string, unknown>[] }).values) {
              await supabase.from("equipment").upsert({
                id: String(eq.id),
                org_id: org.id,
                name: String(eq.name || eq.title || ""),
                make: String(eq.make || ""),
                model: String(eq.model || ""),
                equipment_type: String(eq.type || eq.equipmentType || ""),
                serial_number: String(eq.serialNumber || ""),
                engine_hours: Number(eq.engineHours || 0),
                raw_data: eq,
                synced_at: new Date().toISOString(),
              });
              totalSynced++;
            }
          } else {
            errors.push(`Org ${org.id}: ${(orgData as { message?: string }).message || "error"}`);
          }
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "equipment", errors: errors.length > 0 ? errors : undefined }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/field-operations" || path === "/sync/field-operations/") {
      const { data: orgs } = await supabase.from("organizations").select("id");
      const { data: fields } = await supabase.from("fields").select("id, org_id");
      let totalSynced = 0;

      for (const org of orgs || []) {
        const orgFields = (fields || []).filter((f) => f.org_id === org.id);

        for (const field of orgFields) {
          const data = await jdFetchAllPages(
            `/organizations/${org.id}/fields/${field.id}/fieldOperations`,
            accessToken
          );
          if (data.error) continue;

          for (const op of (data as { values: Record<string, unknown>[] }).values) {
            await supabase.from("field_operations").upsert({
              id: String(op.id),
              field_id: field.id,
              org_id: org.id,
              operation_type: String(op.operationType || op.type || ""),
              start_date: op.startDate || null,
              end_date: op.endDate || null,
              area: Number((op as Record<string, { value?: number }>).area?.value || 0),
              products: op.products || [],
              measurements: op.measurementTypes || {},
              raw_data: op,
              synced_at: new Date().toISOString(),
            });
            totalSynced++;
          }
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "field_operations" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/products" || path === "/sync/products/") {
      const { data: orgs } = await supabase.from("organizations").select("id");
      let totalSynced = 0;

      for (const org of orgs || []) {
        for (const productType of ["varieties", "chemicals", "fertilizers"]) {
          const data = await jdFetchAllPages(
            `/organizations/${org.id}/${productType}`,
            accessToken
          );
          if (data.error) continue;

          for (const product of (data as { values: Record<string, unknown>[] }).values) {
            await supabase.from("products").upsert({
              id: String(product.id),
              org_id: org.id,
              name: String(product.name || product.title || ""),
              product_type: productType.slice(0, -1),
              manufacturer: String(product.manufacturer || product.company || ""),
              raw_data: product,
              synced_at: new Date().toISOString(),
            });
            totalSynced++;
          }
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "products" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/operators" || path === "/sync/operators/") {
      const { data: orgs } = await supabase.from("organizations").select("id");
      let totalSynced = 0;

      for (const org of orgs || []) {
        const data = await jdFetchAllPages(
          `/organizations/${org.id}/operators`,
          accessToken
        );
        if (data.error) continue;

        for (const op of (data as { values: Record<string, unknown>[] }).values) {
          await supabase.from("operators").upsert({
            id: String(op.id),
            org_id: org.id,
            name: String(op.name || op.displayName || ""),
            raw_data: op,
            synced_at: new Date().toISOString(),
          });
          totalSynced++;
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "operators" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/flags" || path === "/sync/flags/") {
      const { data: orgs } = await supabase.from("organizations").select("id");
      let totalSynced = 0;

      for (const org of orgs || []) {
        const data = await jdFetchAllPages(
          `/organizations/${org.id}/flags`,
          accessToken
        );
        if (data.error) continue;

        for (const flag of (data as { values: Record<string, unknown>[] }).values) {
          const geometry = flag.geometry as Record<string, unknown> | undefined;
          const coords = geometry?.coordinates as number[] | undefined;
          await supabase.from("flags").upsert({
            id: String(flag.id),
            field_id: String(flag.fieldId || ""),
            org_id: org.id,
            category: String(flag.category || flag.type || ""),
            notes: String(flag.notes || flag.description || ""),
            latitude: coords?.[1] || 0,
            longitude: coords?.[0] || 0,
            raw_data: flag,
            synced_at: new Date().toISOString(),
          });
          totalSynced++;
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "flags" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/all" || path === "/sync/all/") {
      const supabase = getSupabase();
      const baseUrl = `${supabaseUrl}/functions/v1/jd-api`;

      await supabase.from("sync_log").insert({
        sync_type: "full",
        status: "in_progress",
        started_at: new Date().toISOString(),
      });

      const results: Record<string, unknown> = {};
      const syncOrder = [
        "organizations",
        "farms",
        "fields",
        "boundaries",
        "equipment",
        "field-operations",
        "products",
        "operators",
        "flags",
      ];

      for (const syncType of syncOrder) {
        const endpoint = `${JD_API_BASE}${syncType === "organizations" ? "/organizations" : ""}`;
        const innerUrl = new URL(req.url);
        innerUrl.pathname = `/jd-api/sync/${syncType}`;

        const res = await fetch(innerUrl.toString(), {
          headers: {
            Authorization: req.headers.get("Authorization") || "",
            Apikey: req.headers.get("Apikey") || "",
          },
        });

        results[syncType] = await res.json();
      }

      await supabase.from("sync_log").insert({
        sync_type: "full",
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/proxy" || path === "/proxy/") {
      const body = await req.json();
      const endpoint = body.endpoint;

      if (!endpoint) {
        return new Response(
          JSON.stringify({ error: "endpoint is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const data = await jdFetch(endpoint, accessToken);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path.startsWith("/data/")) {
      const dataType = path.replace("/data/", "").replace("/", "");
      const validTables = [
        "organizations",
        "farms",
        "fields",
        "boundaries",
        "equipment",
        "field_operations",
        "products",
        "operators",
        "flags",
        "sync_log",
      ];

      if (!validTables.includes(dataType)) {
        return new Response(JSON.stringify({ error: "Invalid data type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from(dataType)
        .select("*")
        .order("synced_at", { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ data, total: data?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
