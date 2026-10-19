const AI_URL = process.env.CIRCLO_AI_URL || "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body permintaan tidak valid." }, { status: 400 });
  }

  const text = (body?.text ?? "").trim();
  if (!text) {
    return Response.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
  }

  let res;
  try {
    res = await fetch(`${AI_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, session_id: body?.session_id ?? null }),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: "Tidak bisa menghubungi AI. Pastikan server Python (circlo_api) berjalan." },
      { status: 502 },
    );
  }

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    return Response.json(
      { error: data?.detail || "AI backend gagal memproses permintaan." },
      { status: res.ok ? 502 : res.status },
    );
  }

  // Teruskan stream SSE apa adanya agar token tampil progresif di UI.
  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
