import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '') || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabaseInstance = null;

// Helper: map camelCase object to snake_case for Supabase
export function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

// Helper: map snake_case object from Supabase to camelCase
export function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

// Lightweight PostgREST wrapper using native Node.js fetch
class PostgrestFetchClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  from(table) {
    const self = this;
    return {
      async select(columns = '*', filters = {}) {
        try {
          const params = new URLSearchParams();
          params.set('select', columns);
          for (const [k, v] of Object.entries(filters)) {
            params.set(k, `eq.${v}`);
          }
          const res = await fetch(`${self.url}/rest/v1/${table}?${params.toString()}`, {
            method: 'GET',
            headers: {
              'apikey': self.key,
              'Authorization': `Bearer ${self.key}`,
              'Content-Type': 'application/json'
            }
          });
          if (!res.ok) {
            const err = await res.text();
            return { data: null, error: { message: err, status: res.status } };
          }
          const data = await res.json();
          return { data, error: null };
        } catch (e) {
          return { data: null, error: e };
        }
      },

      async insert(rows) {
        try {
          const body = Array.isArray(rows) ? rows : [rows];
          const res = await fetch(`${self.url}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'apikey': self.key,
              'Authorization': `Bearer ${self.key}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(body)
          });
          if (!res.ok) {
            const err = await res.text();
            return { data: null, error: { message: err, status: res.status } };
          }
          const data = await res.json();
          return { data: Array.isArray(rows) ? data : data[0], error: null };
        } catch (e) {
          return { data: null, error: e };
        }
      },

      async upsert(rows, onConflict = '') {
        try {
          const body = Array.isArray(rows) ? rows : [rows];
          const headers = {
            'apikey': self.key,
            'Authorization': `Bearer ${self.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation'
          };
          let query = '';
          if (onConflict) query = `?on_conflict=${onConflict}`;
          const res = await fetch(`${self.url}/rest/v1/${table}${query}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (!res.ok) {
            const err = await res.text();
            return { data: null, error: { message: err, status: res.status } };
          }
          const data = await res.json();
          return { data: Array.isArray(rows) ? data : data[0], error: null };
        } catch (e) {
          return { data: null, error: e };
        }
      },

      async update(values, filters = {}) {
        try {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(filters)) {
            params.set(k, `eq.${v}`);
          }
          const res = await fetch(`${self.url}/rest/v1/${table}?${params.toString()}`, {
            method: 'PATCH',
            headers: {
              'apikey': self.key,
              'Authorization': `Bearer ${self.key}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(values)
          });
          if (!res.ok) {
            const err = await res.text();
            return { data: null, error: { message: err, status: res.status } };
          }
          const data = await res.json();
          return { data, error: null };
        } catch (e) {
          return { data: null, error: e };
        }
      },

      async delete(filters = {}) {
        try {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(filters)) {
            params.set(k, `eq.${v}`);
          }
          const res = await fetch(`${self.url}/rest/v1/${table}?${params.toString()}`, {
            method: 'DELETE',
            headers: {
              'apikey': self.key,
              'Authorization': `Bearer ${self.key}`,
              'Content-Type': 'application/json'
            }
          });
          if (!res.ok) {
            const err = await res.text();
            return { data: null, error: { message: err, status: res.status } };
          }
          return { data: true, error: null };
        } catch (e) {
          return { data: null, error: e };
        }
      }
    };
  }
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export async function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    console.log('[Supabase] 🚀 Initialized official @supabase/supabase-js client');
    return supabaseInstance;
  } catch (e) {
    console.log('[Supabase] ⚡ Using native HTTP PostgREST fetch client for Supabase');
    supabaseInstance = new PostgrestFetchClient(SUPABASE_URL, SUPABASE_KEY);
    return supabaseInstance;
  }
}

export { SUPABASE_URL, SUPABASE_KEY };
