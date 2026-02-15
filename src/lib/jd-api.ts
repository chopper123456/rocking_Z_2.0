const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const authBase = `${SUPABASE_URL}/functions/v1/jd-auth`;
const apiBase = `${SUPABASE_URL}/functions/v1/jd-api`;

const headers = {
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Apikey: SUPABASE_ANON_KEY,
};

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers, ...options });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

export const jdAuth = {
  getLoginUrl: () => fetchJSON(`${authBase}/login`),
  exchangeCode: (code: string, state: string) =>
    fetchJSON(`${authBase}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`),
  refreshToken: () => fetchJSON(`${authBase}/refresh`),
  getStatus: () => fetchJSON(`${authBase}/status`),
  getConnectOrgUrl: () => fetchJSON(`${authBase}/connect-org`),
  checkOrg: () => fetchJSON(`${authBase}/check-org`),
};

export const jdSync = {
  organizations: () => fetchJSON(`${apiBase}/sync/organizations`),
  farms: () => fetchJSON(`${apiBase}/sync/farms`),
  fields: () => fetchJSON(`${apiBase}/sync/fields`),
  boundaries: () => fetchJSON(`${apiBase}/sync/boundaries`),
  equipment: () => fetchJSON(`${apiBase}/sync/equipment`),
  aemp: () => fetchJSON(`${apiBase}/sync/aemp`),
  fieldOperations: () => fetchJSON(`${apiBase}/sync/field-operations`),
  products: () => fetchJSON(`${apiBase}/sync/products`),
  operators: () => fetchJSON(`${apiBase}/sync/operators`),
  flags: () => fetchJSON(`${apiBase}/sync/flags`),
  locationHistory: () => fetchJSON(`${apiBase}/sync/location-history`),
  breadcrumbs: () => fetchJSON(`${apiBase}/sync/breadcrumbs`),
  all: () => fetchJSON(`${apiBase}/sync/all`),
};

export const jdData = {
  organizations: () => fetchJSON(`${apiBase}/data/organizations`),
  farms: () => fetchJSON(`${apiBase}/data/farms`),
  fields: () => fetchJSON(`${apiBase}/data/fields`),
  boundaries: () => fetchJSON(`${apiBase}/data/boundaries`),
  equipment: () => fetchJSON(`${apiBase}/data/equipment`),
  fieldOperations: () => fetchJSON(`${apiBase}/data/field_operations`),
  products: () => fetchJSON(`${apiBase}/data/products`),
  operators: () => fetchJSON(`${apiBase}/data/operators`),
  flags: () => fetchJSON(`${apiBase}/data/flags`),
  syncLog: () => fetchJSON(`${apiBase}/data/sync_log`),
};

export const jdProxy = {
  call: (endpoint: string) =>
    fetchJSON(`${apiBase}/proxy`, {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    }),
};
