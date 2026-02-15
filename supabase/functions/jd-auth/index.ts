import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const JD_CLIENT_ID = "0oaspkya0q35SA0H25d7";
const JD_CLIENT_SECRET = Deno.env.get("JD_CLIENT_SECRET") || Deno.env.get("john_deere") || "";
const JD_REDIRECT_URI =
  "https://ufvxhrvgwntzjdigdxqp.supabase.co/functions/v1/jd-auth/callback";
const JD_AUTH_URL =
  "https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize";
const JD_TOKEN_URL =
  "https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token";
const JD_SCOPES =
  "ag1 ag2 eq1 eq2 org1 org2 work1 work2 files offline_access";
const JD_CONNECTIONS_URL = "https://connections.deere.com/connections";
const JD_API_BASE = "https://sandboxapi.deere.com/platform";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/jd-auth", "");

    if (path === "/login" || path === "/login/") {
      const state = crypto.randomUUID();
      const authUrl = `${JD_AUTH_URL}?response_type=code&scope=${encodeURIComponent(JD_SCOPES)}&client_id=${JD_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(JD_REDIRECT_URI)}`;
      return new Response(JSON.stringify({ authUrl, state }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/callback" || path === "/callback/") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code) {
        const orgDoneHtml = `<!DOCTYPE html><html><head><title>Success</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f4;color:#1c1917}div{text-align:center;padding:2rem;background:#fff;border-radius:1rem;border:1px solid #e7e5e4;max-width:400px}h1{color:#16a34a;margin:0 0 .5rem}p{color:#78716c;margin:0}</style></head><body><div><h1>Organization Connected!</h1><p>You can close this tab and return to the app to continue setup.</p></div></body></html>`;
        return new Response(orgDoneHtml, {
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      if (!JD_CLIENT_SECRET) {
        const noSecretHtml = `<!DOCTYPE html><html><head><title>Error</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f4;color:#1c1917}div{text-align:center;padding:2rem;background:#fff;border-radius:1rem;border:1px solid #e7e5e4;max-width:400px}h1{color:#dc2626;margin:0 0 .5rem}p{color:#78716c;margin:0}</style></head><body><div><h1>Configuration Error</h1><p>JD_CLIENT_SECRET is not configured. Please set it in Supabase Edge Function secrets.</p></div></body></html>`;
        return new Response(noSecretHtml, {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const basicAuth = btoa(`${JD_CLIENT_ID}:${JD_CLIENT_SECRET}`);
      const tokenRes = await fetch(JD_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: JD_REDIRECT_URI,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        return new Response(
          JSON.stringify({ error: "Token exchange failed", details: errText }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const tokenData = await tokenRes.json();
      const expiresAt = new Date(
        Date.now() + tokenData.expires_in * 1000
      ).toISOString();

      const supabase = getSupabase();

      await supabase.from("jd_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const { error: insertError } = await supabase.from("jd_tokens").insert({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        scopes: tokenData.scope || JD_SCOPES,
      });

      if (insertError) {
        const errorHtml = `<!DOCTYPE html><html><head><title>Error</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f4;color:#1c1917}div{text-align:center;padding:2rem;background:#fff;border-radius:1rem;border:1px solid #e7e5e4;max-width:400px}h1{color:#dc2626;margin:0 0 .5rem}p{color:#78716c;margin:0}</style></head><body><div><h1>Connection Failed</h1><p>Failed to store tokens. Please close this tab and try again.</p></div></body></html>`;
        return new Response(errorHtml, {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }

      const successHtml = `<!DOCTYPE html><html><head><title>Connected</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f4;color:#1c1917}div{text-align:center;padding:2rem;background:#fff;border-radius:1rem;border:1px solid #e7e5e4;max-width:400px}h1{color:#16a34a;margin:0 0 .5rem}p{color:#78716c;margin:0}</style></head><body><div><h1>Connected!</h1><p>You can close this tab and return to the app.</p></div></body></html>`;
      return new Response(successHtml, {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    if (path === "/refresh" || path === "/refresh/") {
      const supabase = getSupabase();
      const { data: tokens } = await supabase
        .from("jd_tokens")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!tokens) {
        return new Response(
          JSON.stringify({ error: "No tokens found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const basicAuthRefresh = btoa(`${JD_CLIENT_ID}:${JD_CLIENT_SECRET}`);
      const tokenRes = await fetch(JD_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuthRefresh}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        return new Response(
          JSON.stringify({ error: "Token refresh failed", details: errText }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const tokenData = await tokenRes.json();
      const expiresAt = new Date(
        Date.now() + tokenData.expires_in * 1000
      ).toISOString();

      await supabase
        .from("jd_tokens")
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || tokens.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokens.id);

      return new Response(
        JSON.stringify({ success: true, expires_at: expiresAt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/status" || path === "/status/") {
      const supabase = getSupabase();
      const { data: tokens } = await supabase
        .from("jd_tokens")
        .select("id, expires_at, scopes, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!tokens) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isExpired = new Date(tokens.expires_at) < new Date();
      return new Response(
        JSON.stringify({
          connected: true,
          isExpired,
          expiresAt: tokens.expires_at,
          scopes: tokens.scopes,
          lastUpdated: tokens.updated_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/connect-org" || path === "/connect-org/") {
      const connectUrl = `${JD_CONNECTIONS_URL}/${JD_CLIENT_ID}/select-organizations?redirect_uri=${encodeURIComponent(JD_REDIRECT_URI)}`;
      return new Response(
        JSON.stringify({ connectUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/check-org" || path === "/check-org/") {
      const supabase = getSupabase();
      const { data: tokens } = await supabase
        .from("jd_tokens")
        .select("access_token, expires_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!tokens) {
        return new Response(
          JSON.stringify({ error: "Not authenticated" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const orgRes = await fetch(`${JD_API_BASE}/organizations`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/vnd.deere.axiom.v3+json",
        },
      });

      if (!orgRes.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch orgs", status: orgRes.status }),
          {
            status: orgRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const orgData = await orgRes.json();
      const needsConnection = orgData.values?.some(
        (org: Record<string, unknown>) => {
          const links = org.links as Array<{ rel: string }> | undefined;
          return links?.some((l) => l.rel === "connections");
        }
      );

      return new Response(
        JSON.stringify({
          organizations: orgData.values || [],
          needsConnection,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
