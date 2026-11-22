import requests
import json

# Test dengan kota + modal
tests = [
    "Saya ingin membuat tote bag dari bahan kain, di Surabaya modal 5 juta",
    "Saya ingin membuat tas dari perca denim, di Surabaya modal 10 juta",
    "plastik PET",
    "Material langka yang tidak ada",
]

for i, text in enumerate(tests):
    print(f"\n{'='*60}")
    print(f"TEST {i+1}: {text}")
    print(f"{'='*60}")
    r = requests.post("http://127.0.0.1:8000/chat", 
        json={"text": text, "session_id": f"test-full-{i}"},
        timeout=60)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        full_text = ""
        materials = []
        for line in r.text.strip().split('\n'):
            if line.startswith('data: '):
                data = json.loads(line[6:])
                if data.get('text'):
                    full_text += data['text']
                if data.get('materials'):
                    materials = data['materials']
        print(f"Response:\n{full_text[:800]}")
        if materials:
            print(f"Materials: {[(m['nama_material'], m['kategori']) for m in materials]}")
    else:
        print(f"Error: {r.text}")