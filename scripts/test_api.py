import requests
import time

# Wait for server
for i in range(30):
    try:
        r = requests.get("http://127.0.0.1:8000/health", timeout=2)
        print(f"Health: {r.status_code} - {r.json()}")
        break
    except Exception as e:
        print(f"Attempt {i+1}: {e}")
        time.sleep(1)

# Test chat
for i in range(5):
    print(f"\n--- Run {i+1} ---")
    r = requests.post("http://127.0.0.1:8000/chat", 
        json={"text": "Saya ingin membuat tote bag dari bahan kain", "session_id": f"test-{i}"},
        timeout=60)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        # Parse SSE
        for line in r.text.strip().split('\n'):
            if line.startswith('data: '):
                import json
                data = json.loads(line[6:])
                if data.get('text'):
                    print(f"Text: {data['text'][:300]}")
                if data.get('materials'):
                    print(f"Materials: {[m['nama_material'] for m in data['materials']]}")
                if data.get('used_llm') is not None:
                    print(f"Used LLM: {data['used_llm']}")
    else:
        print(f"Error: {r.text}")