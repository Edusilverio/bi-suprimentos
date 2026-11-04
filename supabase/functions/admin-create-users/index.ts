// admin-create-users edge function v3 — supports create, delete, reset-password
// Last updated: 2026-06-26 - return 200 with {ok:false,error} on auth failures so client can read body
import { corsHeaders } from '@supabase/supabase-js/cors'
import { exigirAdmin, DB_SCHEMA, APP_ID } from './guarda.ts'

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? ''

if (!SUPABASE_URL)     throw new Error('Missing SUPABASE_URL')
if (!SERVICE_ROLE_KEY) throw new Error('Missing SERVICE_ROLE_KEY')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const negado = await exigirAdmin(req, body, SUPABASE_URL, SERVICE_ROLE_KEY)
    if (negado) return negado

    // ── ACTION: create ──
    if (body.action === 'create') {
      const { email, password, email_confirm } = body
      if (!email || !password) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Missing email or password' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: email_confirm ?? true,
          user_metadata: { app: APP_ID },
        }),
      })

      const data = await resp.json()

      if (!resp.ok) {
        // Return HTTP 200 so the supabase-js client surfaces the payload in `data`
        // instead of throwing a FunctionsHttpError (which hides the body).
        return new Response(
          JSON.stringify({ ok: false, error: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({ ok: true, data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── ACTION: reset-password ──
    if (body.action === 'reset-password') {
      const { userId } = body
      if (!userId) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Missing userId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Generate new temp password
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
      const symbols = '!@#$%'
      let pwd = ''
      for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
      pwd += symbols[Math.floor(Math.random() * symbols.length)]
      const tempPassword = pwd.split('').sort(() => Math.random() - 0.5).join('')

      // Update auth password
      const authResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ password: tempPassword }),
      })

      const authData = await authResp.json()
      if (!authResp.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: authData }),
          { status: authResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Mark must_change_password = true
      const dbResp = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal',
          'Content-Profile': DB_SCHEMA,
        },
        body: JSON.stringify({ must_change_password: true }),
      })

      if (!dbResp.ok) {
        const dbErr = await dbResp.text()
        return new Response(
          JSON.stringify({ ok: false, error: `DB update failed: ${dbErr}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({ ok: true, tempPassword }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── ACTION: delete ──
    if (body.action === 'delete') {
      const { userId } = body
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Missing userId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
      })

      const data = await resp.json().catch(() => ({}))
      return new Response(
        JSON.stringify({ ok: resp.ok, status: resp.status, data }),
        { status: resp.ok ? 200 : resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Legacy: bulk create ──
    const { users } = body as { users: { email: string; password: string; email_confirm?: boolean }[] }

    if (!Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Provide a non-empty "users" array or use action: "create"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const results: { email: string; success: boolean; id?: string; error?: string }[] = []

    for (const u of users) {
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          email: u.email,
          password: u.password,
          email_confirm: u.email_confirm ?? true,
          user_metadata: { app: APP_ID },
        }),
      })

      const data = await resp.json()

      if (resp.ok) {
        results.push({ email: u.email, success: true, id: data.id })
      } else {
        results.push({ email: u.email, success: false, error: data.msg ?? data.message ?? JSON.stringify(data) })
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
