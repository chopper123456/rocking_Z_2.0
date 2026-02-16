import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const JD_API_BASE = "https://sandboxapi.deere.com/platform";
const JD_EQUIPMENT_API_BASE = "https://equipmentapi.deere.com/isg";
const JD_AEMP_BASE = "https://sandboxaemp.deere.com";
const JD_CLIENT_ID = "0oaspkya0q35SA0H25d7";
const JD_CLIENT_SECRET = Deno.env.get("JD_CLIENT_SECRET") || Deno.env.get("john_deere") || "";
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

function parseXMLValue(xmlText: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, "i");
  const match = xmlText.match(regex);
  return match ? match[1].trim() : "";
}

function parseXMLArray(xmlText: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, "gi");
  const matches = xmlText.matchAll(regex);
  return Array.from(matches).map((m) => m[1].trim());
}

async function fetchAEMPFleet(accessToken: string) {
  const allEquipment: Record<string, unknown>[] = [];
  let pageNumber = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const res = await fetch(`${JD_AEMP_BASE}/Fleet/${pageNumber}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/xml",
      },
    });

    if (!res.ok) {
      return { error: true, status: res.status, message: await res.text() };
    }

    const xmlText = await res.text();

    const equipmentRegex = /<Equipment>([\s\S]*?)<\/Equipment>/gi;
    const equipmentMatches = xmlText.matchAll(equipmentRegex);

    for (const match of equipmentMatches) {
      const equipmentXml = match[1];

      const equipment: Record<string, unknown> = {
        id: parseXMLValue(equipmentXml, "EquipmentID"),
        make: parseXMLValue(equipmentXml, "Make"),
        model: parseXMLValue(equipmentXml, "Model"),
        serialNumber: parseXMLValue(equipmentXml, "SerialNumber"),

        lastLocationLat: parseFloat(parseXMLValue(equipmentXml, "Latitude")) || 0,
        lastLocationLon: parseFloat(parseXMLValue(equipmentXml, "Longitude")) || 0,
        lastLocationTime: parseXMLValue(equipmentXml, "DateTime"),

        cumulativeOperatingHours: parseFloat(parseXMLValue(equipmentXml, "CumulativeOperatingHours")) || 0,
        cumulativeIdleHours: parseFloat(parseXMLValue(equipmentXml, "CumulativeIdleHours")) || 0,
        cumulativeFuelUsed: parseFloat(parseXMLValue(equipmentXml, "CumulativeFuelUsed")) || 0,
        fuelRemainingRatio: parseFloat(parseXMLValue(equipmentXml, "FuelRemaining")) || 0,
        defRemainingRatio: parseFloat(parseXMLValue(equipmentXml, "DEFRemaining")) || 0,
        cumulativeDistance: parseFloat(parseXMLValue(equipmentXml, "Distance")) || 0,

        rawXml: match[0],
      };

      allEquipment.push(equipment);
    }

    const nextLinks = parseXMLArray(xmlText, "href").filter((href) =>
      href.includes("/Fleet/") && parseInt(href.split("/Fleet/")[1]) > pageNumber
    );

    hasMorePages = nextLinks.length > 0;
    pageNumber++;
  }

  return { equipment: allEquipment, total: allEquipment.length };
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

      const rootData = await jdFetchAllPages(`${JD_EQUIPMENT_API_BASE}/equipment`, accessToken);

      if (!rootData.error && (rootData as { values: Record<string, unknown>[] }).values?.length > 0) {
        for (const eq of (rootData as { values: Record<string, unknown>[] }).values) {
          const extractString = (val: unknown): string => {
            if (typeof val === 'string') return val;
            if (val && typeof val === 'object') {
              const obj = val as Record<string, unknown>;
              return String(obj.value || obj.name || obj.title || '');
            }
            return '';
          };

          await supabase.from("equipment").upsert({
            id: String(eq.id),
            name: String(eq.name || eq.title || ""),
            make: extractString(eq.make),
            model: extractString(eq.model),
            equipment_type: String(eq.type || eq.equipmentType || ""),
            serial_number: String(eq.serialNumber || ""),
            engine_hours: Number(eq.engineHours || 0),
            raw_data: eq,
            synced_at: new Date().toISOString(),
          });
          totalSynced++;
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "equipment" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/field-operations" || path === "/sync/field-operations/") {
      const { data: orgs } = await supabase.from("organizations").select("id");
      const { data: fields } = await supabase.from("fields").select("id, org_id, name");
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

      const { data: sprayOps } = await supabase
        .from("field_operations")
        .select("id, field_id, operation_type, products, start_date, raw_data")
        .or("operation_type.ilike.%spray%,operation_type.ilike.%application%");

      for (const op of sprayOps || []) {
        const products = (op.products as Array<{ name?: string; id?: string; amount?: number }>) || [];
        const field = (fields || []).find((f) => f.id === op.field_id);
        for (const p of products) {
          if (p.name) {
            const appDate = op.start_date || new Date().toISOString();
            const { data: existing } = await supabase
              .from("spray_applications")
              .select("id")
              .eq("field_id", op.field_id || "")
              .eq("product_name", p.name)
              .eq("application_date", appDate)
              .eq("source", "john_deere")
              .maybeSingle();
            if (!existing) {
              await supabase.from("spray_applications").insert({
                equipment_id: "",
                equipment_name: "",
                product_id: String(p.id || ""),
                product_name: p.name,
                amount_applied: Number(p.amount || 0),
                unit: "gal",
                field_id: op.field_id || "",
                field_name: field?.name || "",
                application_date: appDate,
                source: "john_deere",
                metadata: op.raw_data || {},
              });
            }
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

    if (path === "/sync/aemp" || path === "/sync/aemp/") {
      const aempData = await fetchAEMPFleet(accessToken);

      if (aempData.error) {
        return new Response(JSON.stringify(aempData), {
          status: (aempData as { status: number }).status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let totalSynced = 0;
      const syncTime = new Date().toISOString();

      for (const eq of (aempData as { equipment: Record<string, unknown>[] }).equipment) {
        const equipmentId = String(eq.id);

        await supabase.from("equipment").upsert({
          id: equipmentId,
          name: `${eq.make} ${eq.model}`.trim() || equipmentId,
          make: String(eq.make || ""),
          model: String(eq.model || ""),
          serial_number: String(eq.serialNumber || ""),
          last_location_lat: Number(eq.lastLocationLat || 0),
          last_location_lon: Number(eq.lastLocationLon || 0),
          last_location_time: eq.lastLocationTime || null,
          cumulative_operating_hours: Number(eq.cumulativeOperatingHours || 0),
          cumulative_idle_hours: Number(eq.cumulativeIdleHours || 0),
          cumulative_fuel_used: Number(eq.cumulativeFuelUsed || 0),
          fuel_remaining_ratio: Number(eq.fuelRemainingRatio || 0),
          def_remaining_ratio: Number(eq.defRemainingRatio || 0),
          cumulative_distance: Number(eq.cumulativeDistance || 0),
          telemetry_state: "active",
          last_telemetry_sync: syncTime,
          aemp_data: eq,
          synced_at: syncTime,
        });
        totalSynced++;
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "aemp" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/location-history" || path === "/sync/location-history/") {
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id");

      let totalSynced = 0;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      for (const eq of equipment || []) {
        const endpoint = `/machines/${eq.id}/locationHistory?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
        const data = await jdFetchAllPages(endpoint, accessToken);

        if (data.error) continue;

        const locations = (data as { values: Record<string, unknown>[] }).values;

        for (const loc of locations) {
          const timestamp = loc.timestamp || loc.measurementAsOf;
          const geometry = loc.geometry as Record<string, unknown> | undefined;
          const coords = geometry?.coordinates as number[] | undefined;

          await supabase.from("equipment_location_history").insert({
            equipment_id: eq.id,
            timestamp: timestamp || new Date().toISOString(),
            latitude: coords?.[1] || 0,
            longitude: coords?.[0] || 0,
            altitude: Number(loc.altitude || 0),
            raw_data: loc,
          });
          totalSynced++;
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "location_history" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/breadcrumbs" || path === "/sync/breadcrumbs/") {
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id");

      let totalSynced = 0;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      for (const eq of equipment || []) {
        const endpoint = `/machines/${eq.id}/breadcrumbs?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
        const data = await jdFetchAllPages(endpoint, accessToken);

        if (data.error) continue;

        const breadcrumbs = (data as { values: Record<string, unknown>[] }).values;

        for (const crumb of breadcrumbs) {
          const timestamp = crumb.timestamp || crumb.measurementAsOf;
          const geometry = crumb.geometry as Record<string, unknown> | undefined;
          const coords = geometry?.coordinates as number[] | undefined;

          await supabase.from("equipment_breadcrumbs").insert({
            equipment_id: eq.id,
            timestamp: timestamp || new Date().toISOString(),
            latitude: coords?.[1] || 0,
            longitude: coords?.[0] || 0,
            altitude: Number(crumb.altitude || 0),
            speed: Number(crumb.speed || 0),
            heading: Number(crumb.heading || 0),
            fuel_level: Number(crumb.fuelLevel || 0),
            machine_state: String(crumb.machineState || ""),
            correlation_id: String(crumb.correlationId || ""),
            raw_data: crumb,
          });
          totalSynced++;
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "breadcrumbs" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/measurements" || path === "/sync/measurements/") {
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id");

      let totalSynced = 0;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      for (const eq of equipment || []) {
        const endpoint = `/machines/${eq.id}/measurements?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
        const data = await jdFetchAllPages(endpoint, accessToken);

        if (data.error) continue;

        const measurements = (data as { values: Record<string, unknown>[] }).values;

        for (const measurement of measurements) {
          const timestamp = measurement.timestamp || measurement.measurementAsOf;
          const mType = String(measurement.measurementType || measurement.type || "").toLowerCase();
          const mValue = Number(measurement.value || 0);

          await supabase.from("machine_measurements").insert({
            equipment_id: eq.id,
            measurement_type: mType || "unknown",
            value: mValue,
            unit: String(measurement.unit || ""),
            timestamp: timestamp || new Date().toISOString(),
            metadata: measurement,
          });
          totalSynced++;

          if (mType.includes("fuel") && (mType.includes("level") || mType.includes("remaining"))) {
            const fuelRatio = mValue > 1 ? mValue / 100 : mValue;
            await supabase.from("equipment").update({
              fuel_remaining_ratio: Math.min(1, Math.max(0, fuelRatio)),
              last_telemetry_sync: new Date().toISOString(),
            }).eq("id", eq.id);
          } else if (mType.includes("engine") && mType.includes("hour")) {
            await supabase.from("equipment").update({
              engine_hours: mValue,
              cumulative_operating_hours: mValue,
              last_telemetry_sync: new Date().toISOString(),
            }).eq("id", eq.id);
          }
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "measurements" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/alerts" || path === "/sync/alerts/") {
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id");

      let totalSynced = 0;

      for (const eq of equipment || []) {
        const endpoint = `/machines/${eq.id}/alerts`;
        const data = await jdFetchAllPages(endpoint, accessToken);

        if (data.error) continue;

        const alerts = (data as { values: Record<string, unknown>[] }).values;

        for (const alert of alerts) {
          await supabase.from("machine_alerts").upsert({
            equipment_id: eq.id,
            alert_id: String(alert.id || ""),
            alert_type: String(alert.alertType || alert.type || ""),
            severity: String(alert.severity || ""),
            description: String(alert.description || alert.message || ""),
            dtc_code: String(alert.dtcCode || alert.code || ""),
            active: Boolean(alert.active ?? true),
            started_at: alert.startTime || alert.createdAt || null,
            ended_at: alert.endTime || alert.resolvedAt || null,
            metadata: alert,
            updated_at: new Date().toISOString(),
          });
          totalSynced++;
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "alerts" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/device-states" || path === "/sync/device-states/") {
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id");

      let totalSynced = 0;

      for (const eq of equipment || []) {
        const endpoint = `/machines/${eq.id}/deviceStateReports`;
        const data = await jdFetchAllPages(endpoint, accessToken);

        if (data.error) continue;

        const deviceStates = (data as { values: Record<string, unknown>[] }).values;

        for (const state of deviceStates) {
          await supabase.from("machine_device_states").insert({
            equipment_id: eq.id,
            device_id: String(state.deviceId || state.terminalId || ""),
            state: String(state.state || state.status || ""),
            signal_strength: Number(state.signalStrength || 0),
            battery_voltage: Number(state.batteryVoltage || 0),
            last_contact: state.lastContact || state.timestamp || null,
            metadata: state,
          });
          totalSynced++;
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "device_states" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/engine-hours" || path === "/sync/engine-hours/") {
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id");

      let totalSynced = 0;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      for (const eq of equipment || []) {
        const endpoint = `/machines/${eq.id}/engineHours?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
        const data = await jdFetchAllPages(endpoint, accessToken);

        if (data.error) continue;

        const engineHours = (data as { values: Record<string, unknown>[] }).values;

        for (const hours of engineHours) {
          const timestamp = hours.timestamp || hours.measurementAsOf;
          await supabase.from("machine_engine_hours").insert({
            equipment_id: eq.id,
            engine_hours: Number(hours.engineHours || hours.value || 0),
            timestamp: timestamp || new Date().toISOString(),
            metadata: hours,
          });
          totalSynced++;
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "engine_hours" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/operational-hours" || path === "/sync/operational-hours/") {
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id");

      let totalSynced = 0;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      for (const eq of equipment || []) {
        const endpoint = `/machines/${eq.id}/hoursOfOperation?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
        const data = await jdFetchAllPages(endpoint, accessToken);

        if (data.error) continue;

        const operationalHours = (data as { values: Record<string, unknown>[] }).values;

        for (const period of operationalHours) {
          const duration = period.durationHours ||
            (period.startTime && period.endTime
              ? (new Date(String(period.endTime)).getTime() - new Date(String(period.startTime)).getTime()) / (1000 * 60 * 60)
              : 0);

          await supabase.from("machine_operational_hours").insert({
            equipment_id: eq.id,
            start_time: period.startTime || new Date().toISOString(),
            end_time: period.endTime || null,
            duration_hours: Number(duration),
            metadata: period,
          });
          totalSynced++;
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "operational_hours" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/implements" || path === "/sync/implements/") {
      const { data: orgs } = await supabase.from("organizations").select("id");
      let totalSynced = 0;

      for (const org of orgs || []) {
        const endpoint = `/organizations/${org.id}/implements`;
        const data = await jdFetchAllPages(endpoint, accessToken);

        if (data.error) continue;

        const implementList = (data as { values: Record<string, unknown>[] }).values;

        for (const implement of implementList) {
          await supabase.from("implements").upsert(
            {
              org_id: org.id,
              implement_id: String(implement.id),
              name: String(implement.name || implement.title || ""),
              make: String(implement.make || ""),
              model: String(implement.model || ""),
              serial_number: String(implement.serialNumber || ""),
              implement_type: String(implement.type || implement.category || ""),
              width: Number(implement.width || 0),
              width_unit: String(implement.widthUnit || ""),
              metadata: implement,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "implement_id" }
          );
          totalSynced++;
        }
      }

      return new Response(
        JSON.stringify({ synced: totalSynced, type: "implements" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/sync/all" || path === "/sync/all/") {
      const supabase = getSupabase();
      const baseUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/jd-api`;

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
        "aemp",
        "location-history",
        "breadcrumbs",
        "field-operations",
        "products",
        "operators",
        "flags",
        "implements",
        "measurements",
        "alerts",
        "device-states",
        "engine-hours",
        "operational-hours",
      ];

      for (const syncType of syncOrder) {
        const syncUrl = `${baseUrl}/sync/${syncType}`;
        const res = await fetch(syncUrl, {
          headers: {
            Authorization: req.headers.get("Authorization") || "",
            Apikey: req.headers.get("Apikey") || "",
            "Content-Type": "application/json",
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

    if (path.startsWith("/data/") && req.method === "GET") {
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
        "machine_alerts",
        "machine_measurements",
        "machine_device_states",
        "machine_engine_hours",
        "machine_operational_hours",
        "implements",
        "equipment_implement_attachments",
        "chemical_inventory",
        "spray_applications",
      ];

      if (!validTables.includes(dataType)) {
        return new Response(JSON.stringify({ error: "Invalid data type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orderCol =
        dataType === "chemical_inventory"
          ? "last_updated"
          : dataType === "spray_applications"
            ? "application_date"
            : "synced_at";

      const { data, error } = await supabase
        .from(dataType)
        .select("*")
        .order(orderCol, { ascending: false });

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

    if (path === "/data/chemical_inventory" && req.method === "POST") {
      const body = await req.json();
      const { id, product_id, product_name, quantity, unit, low_stock_threshold } =
        body;
      const row = {
        product_id: product_id || "",
        product_name: product_name || "",
        quantity: Number(quantity ?? 0),
        unit: unit || "gal",
        low_stock_threshold: Number(low_stock_threshold ?? 0),
        last_updated: new Date().toISOString(),
      };

      if (id) {
        await supabase.from("chemical_inventory").update(row).eq("id", id);
      } else {
        let existing = null;
        if (product_id) {
          const r = await supabase
            .from("chemical_inventory")
            .select("id")
            .eq("product_id", product_id)
            .maybeSingle();
          existing = r.data;
        }
        if (!existing && product_name) {
          const r = await supabase
            .from("chemical_inventory")
            .select("id")
            .eq("product_name", product_name)
            .maybeSingle();
          existing = r.data;
        }
        if (existing && (existing as { id: string }).id) {
          await supabase.from("chemical_inventory").update(row).eq("id", (existing as { id: string }).id);
        } else {
          await supabase.from("chemical_inventory").insert(row);
        }
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/data/spray_applications" && req.method === "POST") {
      const body = await req.json();
      const {
        equipment_id,
        equipment_name,
        product_id,
        product_name,
        amount_applied,
        unit,
        field_id,
        field_name,
        application_date,
      } = body;
      await supabase.from("spray_applications").insert({
        equipment_id: equipment_id || "",
        equipment_name: equipment_name || "",
        product_id: product_id || "",
        product_name: product_name || "",
        amount_applied: Number(amount_applied ?? 0),
        unit: unit || "gal",
        field_id: field_id || "",
        field_name: field_name || "",
        application_date: application_date || new Date().toISOString(),
        source: "manual",
      });
      return new Response(JSON.stringify({ success: true }), {
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
