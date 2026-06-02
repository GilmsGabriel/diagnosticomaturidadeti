import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CompileResult {
  ok: boolean
  pdf?: Uint8Array
  log?: string
  error?: string
}

// texlive.net latexcgi — multipart/form-data, filename[]/filecontents[] arrays.
// Returns 301 → follow → 200 application/pdf.
async function tryTexliveNet(tex: string): Promise<CompileResult> {
  const fd = new FormData()
  fd.append('filename[]', 'document.tex')
  fd.append('filecontents[]', tex)
  fd.append('return', 'pdf')
  fd.append('engine', 'pdflatex')
  const r = await fetch('https://texlive.net/cgi-bin/latexcgi', {
    method: 'POST',
    body: fd,
    redirect: 'follow',
  })
  const ct = r.headers.get('content-type') || ''
  if (r.ok && ct.includes('application/pdf')) {
    return { ok: true, pdf: new Uint8Array(await r.arrayBuffer()) }
  }
  const text = await r.text()
  return { ok: false, log: text.slice(0, 8000), error: `texlive.net HTTP ${r.status}` }
}

// latexonline.cc — GET /compile?text=<urlencoded>&command=pdflatex.
async function tryLatexOnline(tex: string): Promise<CompileResult> {
  const url = `https://latexonline.cc/compile?command=pdflatex&text=${encodeURIComponent(tex)}`
  const r = await fetch(url, { method: 'GET', redirect: 'follow' })
  const ct = r.headers.get('content-type') || ''
  if (r.ok && ct.includes('application/pdf')) {
    return { ok: true, pdf: new Uint8Array(await r.arrayBuffer()) }
  }
  const text = await r.text()
  return { ok: false, log: text.slice(0, 8000), error: `latexonline.cc HTTP ${r.status}` }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token)
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => null)
    const tex = body?.tex
    const filename = (body?.filename || 'PDTI') as string
    if (typeof tex !== 'string' || tex.length < 50 || tex.length > 2_000_000) {
      return new Response(JSON.stringify({ error: 'Invalid tex payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Try primary, then fallback
    // Primary: texlive.net (more reliable for large docs, no URL-length limit).
    let result: CompileResult
    try {
      result = await tryTexliveNet(tex)
    } catch (e) {
      result = { ok: false, error: String(e) }
    }
    if (!result.ok) {
      try {
        const fb = await tryLatexOnline(tex)
        if (fb.ok) result = fb
        else result.log = (result.log || '') + '\n\n--- fallback latexonline.cc ---\n' + (fb.log || fb.error || '')
      } catch (e) {
        result.log = (result.log || '') + '\n\nfallback erro: ' + String(e)
      }
    }

    if (result.ok && result.pdf) {
      return new Response(result.pdf, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        },
      })
    }

    return new Response(
      JSON.stringify({ error: result.error || 'Falha ao compilar LaTeX', log: result.log || '' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})