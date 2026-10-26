from dotenv import load_dotenv
load_dotenv('.env.local')
from supabase import create_client
import os

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
sb = create_client(url, key)

mats = sb.table('material').select('id_material,nama_material,kategori,embedding').eq('status_material', True).gt('stok', 0).limit(10).execute()
for m in mats.data:
    emb = m.get('embedding')
    print(f'{m["id_material"]}: {m["nama_material"]} - embedding: {"ada" if emb else "KOSONG"} (len={len(emb) if emb else 0})')