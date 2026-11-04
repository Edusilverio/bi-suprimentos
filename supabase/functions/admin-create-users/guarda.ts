// Guarda da função admin-create-users: só um administrador ativo do app (nivel <= 1 em usuarios)
// pode criar, excluir ou resetar contas, e só contas criadas por este app (user_metadata.app).
// Em projeto Supabase compartilhado, DB_SCHEMA aponta o schema do app e APP_ID marca as contas criadas.
import { corsHeaders } from '@supabase/supabase-js/cors'

export const DB_SCHEMA = Deno.env.get('BS_DB_SCHEMA') ?? 'public'
export const APP_ID = Deno.env.get('BS_APP_ID') ?? 'bi-suprimentos'

const negar = (status: number, error: string) =>
  new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

async function usuarioDoApp(url: string, key: string, id: string) {
  const r = await fetch(`${url}/rest/v1/usuarios?id=eq.${encodeURIComponent(id)}&select=id,nivel,ativo`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Accept-Profile': DB_SCHEMA },
  })
  if (!r.ok) return null
  const linhas = await r.json()
  return Array.isArray(linhas) && linhas.length ? linhas[0] as { id: string; nivel: number; ativo: boolean } : null
}

export async function exigirAdmin(req: Request, body: any, url: string, key: string): Promise<Response | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return negar(401, 'Sessão ausente')
  const u = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } })
  if (!u.ok) return negar(401, 'Sessão inválida')
  const quem = await u.json()
  const eu = await usuarioDoApp(url, key, quem.id)
  if (!eu || !eu.ativo || eu.nivel > 1) return negar(403, 'Apenas administradores podem gerenciar usuários')

  if (body?.action === 'delete' || body?.action === 'reset-password') {
    if (!body.userId || body.userId === quem.id) return negar(400, 'Usuário inválido')
    // a tela apaga a linha de usuarios antes de chamar a função: a origem da conta vem do metadata do Auth
    const alvo = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(body.userId)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    const conta = alvo.ok ? await alvo.json() : null
    if (!conta || (conta.user_metadata?.app ?? null) !== APP_ID) return negar(404, 'Usuário não pertence a este sistema')
  }
  return null
}
