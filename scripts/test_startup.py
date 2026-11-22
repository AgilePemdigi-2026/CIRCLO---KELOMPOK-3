import os
from dotenv import load_dotenv
load_dotenv(".env.local")

from supabase import create_client
from circlo_ai.catalog import SupabaseCatalog
from circlo_ai.embedder import E5Embedder
from circlo_ai.recommender import Recommender
from circlo_ai.dialog import DialogManager

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

print("Creating Supabase client...")
catalog = SupabaseCatalog(create_client(url, key))

print("Loading resep...")
resep = catalog.resep()
print(f"Resep count: {len(resep)}")

print("Loading materials...")
materials = catalog.materials()
print(f"Materials count: {len(materials)}")

print("Creating embedder...")
embedder = E5Embedder()
print("Embedder ready")

print("Creating recommender...")
recommender = Recommender(embedder, resep)
print("Recommender ready")

print("Creating DialogManager...")
dm = DialogManager(catalog, recommender)
print("DialogManager ready")

print("\n--- Test chat ---")
from circlo_ai.dialog import State
state = State()
reply = dm.handle(state, "halo")
print(f"Intent: {reply.intent}")
print(f"Text: {reply.text[:200]}...")