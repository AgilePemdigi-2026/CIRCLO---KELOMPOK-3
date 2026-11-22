import requests
import json

# Test embed endpoint
print("=== Test /embed ===")
r = requests.post("http://127.0.0.1:8000/embed", json={"text": "tote bag kain", "type": "query"})
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"Embedding dim: {len(data['embedding'])}")
    print(f"First 5: {data['embedding'][:5]}")

# Test search API (Next.js)
print("\n=== Test /api/search (Next.js) ===")
r = requests.post("http://127.0.0.1:3000/api/search", json={"query": "tote bag kain", "limit": 10, "threshold": 0.3})
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"Results: {len(data.get('results', []))}")
    for m in data.get('results', []):
        print(f"  {m['nama']} - {m['match']}% Match ({m['kategori']})")
else:
    print(f"Error: {r.text}")

# Test with plastik PET
print("\n=== Test plastik PET ===")
r = requests.post("http://127.0.0.1:3000/api/search", json={"query": "plastik PET", "limit": 10, "threshold": 0.3})
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"Results: {len(data.get('results', []))}")
    for m in data.get('results', []):
        print(f"  {m['nama']} - {m['match']}% Match ({m['kategori']})")
else:
    print(f"Error: {r.text}")