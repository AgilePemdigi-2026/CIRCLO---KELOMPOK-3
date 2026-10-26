import subprocess
import time
import requests
import sys

# Start server
print("Starting server...")
proc = subprocess.Popen([
    sys.executable, "-m", "uvicorn", "circlo_api:app", 
    "--host", "127.0.0.1", "--port", "8000"
], cwd=r"C:\Users\acer\OneDrive\Documents\TUGAS KULIAH SMT 5\PPL PRAK\CIRCLO---KELOMPOK-3")

try:
    # Wait for startup
    for i in range(30):
        try:
            r = requests.get("http://127.0.0.1:8000/health", timeout=2)
            if r.status_code == 200:
                print(f"Server ready: {r.json()}")
                break
        except:
            time.sleep(1)
    else:
        print("Server failed to start")
        proc.terminate()
        sys.exit(1)

    # Test embed
    print("\nTesting /embed...")
    r = requests.post("http://127.0.0.1:8000/embed", 
        json={"text": "tote bag kain", "type": "query"}, timeout=10)
    print(f"Status: {r.status_code}")
    print(f"Embedding dim: {len(r.json().get('embedding', []))}")

    # Test chat
    print("\nTesting /chat...")
    r = requests.post("http://127.0.0.1:8000/chat", 
        json={"text": "Saya ingin membuat tote bag dari bahan kain, di Surabaya modal 5 juta", "session_id": "test-1"}, 
        timeout=30)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        full = ""
        for line in r.text.strip().split('\n'):
            if line.startswith('data: '):
                import json
                d = json.loads(line[6:])
                if d.get('text'):
                    full += d['text']
        print(f"Response: {full[:500]}")

finally:
    proc.terminate()
    print("\nServer stopped")