from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv(".env.local")

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
sb = create_client(url, key)

mats = sb.table('material').select('id_material,nama_material,kategori,stok').eq('status_material', True).gt('stok', 0).limit(10).execute()
print('Materials:', len(mats.data))
for m in mats.data[:5]:
    print(f'  {m["id_material"]}: {m["nama_material"]} ({m["kategori"]}) stok={m["stok"]}')

resep = sb.table('resep_produk').select('*').limit(10).execute()
print('Resep:', len(resep.data))
for r in resep.data[:3]:
    print(f'  {r["id_resep"]}: {r["nama_produk"]}')