import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const TIMEOUT_MS = 45000;
const DEFAULT_OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';


const SYSTEM_PROMPT = `Kamu adalah AI Material Assistant untuk CIRCLO, marketplace material sisa dan material yang dapat digunakan kembali di Indonesia.

Tugasmu adalah menganalisis informasi material yang diberikan Seller, kemudian menghasilkan informasi produk yang terstruktur, informatif, relevan, dan mudah dipahami calon Buyer.

Kembalikan hasil HANYA dalam format JSON valid dengan struktur berikut:
{
  "category": "Kategori utama material",
  "subcategory": "Subkategori material",
  "composition": "Komposisi material yang diketahui",
  "specifications": [
    {
      "label": "Nama atribut",
      "value": "Nilai atribut"
    }
  ],
  "description": "Deskripsi produk yang informatif",
  "potential_uses": [
    "Potensi pemanfaatan pertama",
    "Potensi pemanfaatan kedua"
  ],
  "buyer_notes": [
    "Informasi yang perlu diperhatikan Buyer"
  ],
  "tags": [
    "tag-pertama",
    "tag-kedua"
  ]
}

ATURAN KLASIFIKASI:
- Identifikasi kategori dan subkategori berdasarkan nama serta deskripsi material.
- Identifikasi komposisi hanya jika didukung informasi yang diberikan.
- Jika komposisi belum dapat dipastikan, tulis "Belum diketahui".
- Bedakan informasi dari Seller dengan kesimpulan atau perkiraan AI.
- Jangan menyatakan bahwa klasifikasi telah terverifikasi secara fisik.

ATURAN SPESIFIKASI:
- Sertakan atribut yang relevan, misalnya jenis material, warna, kondisi, bentuk, tekstur, atau komposisi.
- Gunakan informasi dari Seller jika tersedia.
- Jangan mengarang warna, dimensi, berat, kualitas, merek, sertifikasi, atau atribut lain yang tidak diketahui.
- Jika atribut penting belum diketahui, tulis "Belum diketahui" atau sarankan agar Seller melengkapinya.
- Jangan mengarang atau mengubah quantity, harga, satuan, dan lokasi dari data Seller.

ATURAN DESKRIPSI:
- Tulis dalam Bahasa Indonesia yang natural, profesional, tetapi mudah dipahami.
- Buat sekitar 80–150 kata jika informasi yang tersedia cukup.
- Jelaskan material apa yang dijual, karakteristik yang diketahui, kondisi material, dan informasi relevan untuk calon Buyer.
- Hindari kalimat generik yang dapat digunakan untuk semua produk.
- Jangan mengklaim material berkualitas tinggi, premium, awet, atau memiliki keunggulan tertentu tanpa bukti.
- Jangan sekadar mengulang nama produk.
- Jangan menggunakan Markdown, emoji, atau kalimat pembuka seperti "Berikut adalah deskripsi produk".

ATURAN POTENSI PEMANFAATAN:
- Berikan 2–4 ide penggunaan ulang yang realistis sesuai jenis material.
- Tandai sebagai potensi atau rekomendasi, bukan jaminan bahwa material pasti cocok.
- Jangan menyarankan penggunaan yang membutuhkan karakteristik material yang belum diketahui tanpa memberikan catatan.

ATURAN CATATAN BUYER:
- Berikan 1–3 hal yang relevan untuk diperiksa sebelum membeli, jika diperlukan.
- Contohnya adalah ketebalan, ukuran, kebersihan, kerusakan, atau konsistensi stok yang belum dijelaskan Seller.
- Jangan menganggap informasi yang belum diketahui sebagai fakta.

ATURAN TAG:
- Berikan 3–8 tag yang relevan, ringkas, dan tidak duplikat.
- Gunakan kata kunci Bahasa Indonesia yang membantu pencarian material.
- Sertakan jenis material dan atribut yang diketahui jika relevan.
- Hindari tag yang tidak berkaitan dengan produk.

Jika informasi terlalu sedikit untuk menghasilkan klasifikasi yang dapat diandalkan, tetap hasilkan JSON valid, gunakan "Belum diketahui" untuk atribut yang tidak dapat dipastikan, dan berikan catatan agar Seller melengkapi informasi.

Jangan sertakan teks apa pun di luar JSON.`;


function clean(text) {
  let value = String(text || '').trim();

  // Menghapus pembungkus Markdown jika model tetap menambahkannya.
  value = value
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  // Memastikan hasil dapat dibaca sebagai JSON.
  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return '';
    }

    if (
      typeof parsed.category !== 'string' ||
      typeof parsed.description !== 'string' ||
      !Array.isArray(parsed.specifications) ||
      !Array.isArray(parsed.potential_uses) ||
      !Array.isArray(parsed.buyer_notes) ||
      !Array.isArray(parsed.tags)
    ) {
      return '';
    }

    return JSON.stringify(parsed);
  } catch {
    return '';
  }
}

function fallbackDescription({
  name,
  description,
  quantity,
  price,
  condition,
  satuan,
  location,
}) {
  const productName = name || 'Material sisa';

  return {
    category: 'Belum diketahui',
    subcategory: 'Belum diketahui',
    composition: 'Belum diketahui',

    specifications: [
      {
        label: 'Nama material',
        value: productName,
      },
      {
        label: 'Kondisi',
        value: condition || 'Belum diketahui',
      },
      {
        label: 'Jumlah',
        value:
          quantity !== '' && quantity !== null
            ? `${quantity} ${satuan}`.trim()
            : 'Belum diketahui',
      },
      {
        label: 'Harga per satuan',
        value:
          price !== '' && price !== null
            ? `Rp${price}${satuan ? `/${satuan}` : ''}`
            : 'Belum diketahui',
      },
      {
        label: 'Lokasi',
        value: location || 'Belum diketahui',
      },
    ],

    description:
      description ||
      `${productName} merupakan material yang ditawarkan untuk dipertimbangkan dalam pemanfaatan ulang. Informasi mengenai komposisi, karakteristik, dan kecocokan penggunaannya masih perlu dilengkapi oleh Seller sebelum Buyer menentukan pemanfaatan yang sesuai.`,

    potential_uses: [],
    buyer_notes: [
      'Lengkapi informasi jenis, komposisi, ukuran, dan kondisi material agar Buyer dapat menilai kecocokannya.',
    ],
    tags: [],
  };
}

function buildPrompt({
  name,
  description,
  quantity,
  price,
  condition,
  satuan,
  location,
}) {
  return `Analisis material berikut berdasarkan informasi dari Seller.

Nama produk: ${name || 'Belum diisi'}
Deskripsi dari Seller: ${description || 'Belum diisi'}
Jumlah: ${quantity || 'Belum diisi'}
Satuan: ${satuan || 'Belum diisi'}
Harga per satuan: ${
    price !== '' && price !== undefined && price !== null
      ? `Rp${price}`
      : 'Belum diisi'
  }
Kondisi material: ${condition || 'Belum diisi'}
Lokasi: ${location || 'Belum diisi'}

Gunakan semua informasi yang relevan untuk menyusun hasil klasifikasi, spesifikasi, deskripsi, potensi pemanfaatan, catatan Buyer, dan tag.

Jangan mengubah nilai jumlah, satuan, harga, atau lokasi. Jangan menganggap informasi yang tidak tersedia sebagai fakta. Kembalikan hasil sesuai struktur JSON yang ditentukan dalam instruksi sistem.`;
}

async function viaOpenRouter({
  name,
  description,
  quantity,
  price,
  condition,
  satuan,
  location,
}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Title': 'CIRCLO',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
  role: 'user',
  content: buildPrompt({
    name,
    description,
    quantity,
    price,
    condition,
    satuan,
    location,
  }),
},
      ],
      temperature: 0.7,
      max_tokens: 260,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const json = await res.json();
  return clean(json?.choices?.[0]?.message?.content);
}

async function viaGemini({
  name,
  description,
  quantity,
  price,
  condition,
  satuan,
  location,
}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const base = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const res = await fetch(`${base}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
  {
    role: 'user',
    parts: [
      {
        text: buildPrompt({
          name,
          description,
          quantity,
          price,
          condition,
          satuan,
          location,
        }),
      },
    ],
  },
],
      generationConfig: { temperature: 0.7, maxOutputTokens: 260 },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
  return clean(text);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Format request tidak valid.' }, { status: 400 });
  }

  const name = String(body?.name || '').trim().slice(0, 200);
  const description = String(body?.description || '').trim().slice(0, 600);

  const quantity = body?.quantity ?? '';
  const price = body?.price ?? '';
  const condition = String(body?.condition || '').trim();
  const satuan = String(body?.satuan || '').trim();
  const location = String(body?.location || '').trim();

  if (!name && !description) {
    return NextResponse.json({ error: 'Isi dulu nama produk atau deskripsi singkat.' }, { status: 400 });
  }

  const providers = [
    ['openrouter', viaOpenRouter],
    ['gemini', viaGemini],
  ];

  for (const [source, provider] of providers) {
    try {
      const text = await provider({
  name,
  description,
  quantity,
  price,
  condition,
  satuan,
  location,
});

if (text) {
  try {
    const result = JSON.parse(text);

    return NextResponse.json({
      ...result,
      source,
    });
  } catch {
    console.error(
      `[generate-description] Hasil JSON dari ${source} tidak valid.`
    );
  }
}
    } catch (err) {
      console.error(`[generate-description] ${source} gagal:`, err.message);
    }
  }

  return NextResponse.json({
  ...fallbackDescription({
    name,
    description,
    quantity,
    price,
    condition,
    satuan,
    location,
  }),
  source: 'fallback',
});
}
