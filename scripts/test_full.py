import subprocess
import time
import requests
import sys

# Start AI server
print("Starting AI server...")
ai_proc = subprocess.Popen([
    sys.executable, "-m", "uvicorn", "circlo_api:app", 
    "--host", "127.0.0.1", "--port", "8000"
], cwd=r"C:\Users\acer\OneDrive\Documents\TUGAS KULIAH SMT 5\PPL PRAK\CIRCLO---KELOMPOK-3")

# Start Next.js server
print("Starting Next.js server...")
next_proc = subprocess.Popen([
    "npm", "run", "dev"
], cwd=r"C:\Users\acer\OneDrive\Documents\TUGAS KULIAH SMT 5\PPL PRAK\CIRCLO---KELOMPOK-3", shell=True)

try:
    # Wait for AI server
    for i in range(30):
        try:
            r = requests.get("http://127.0.0.1:8000/health", timeout=2)
            if r.status_code == 200:
                print(f"AI Server ready: {r.json()}")
                break
        except:
            time.sleep(1)
    else:
        print("AI Server failed to start")
        sys.exit(1)

    # Wait for Next.js server
    for i in range(60):
        try:
            r = requests.get("http://127.0.0.1:3000", timeout=2)
            if r.status_code == 200:
                print(f"Next.js Server ready")
                break
        except:
            time.sleep(1)
    else:
        print("Next.js Server failed to start")
        sys.exit(1)

    # Test /api/search
    print("\nTesting /api/search...")
    tests = [
        {"query": "tote bag kain", "label": "Tote bag kain"},
        {"query": "plastik PET", "label": "Plastik PET"},
        {"query": "denim", "label": "Denim"},
        {"query": "botol plastik", "label": "Botol plastik"},
    ]
    
    for t in tests:
        r = requests.post("http://127.0.0.1:3000/api/search", 
            json={"query": t["query"], "limit": 10, "threshold": 0.3}, timeout=30)
        print(f"\n--- {t['label']}: '{t['query']}' ---")
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Results: {len(data.get('results', []))}")
            for m in data.get('results', []):
                print(f"  {m['nama']} - {m['match']}% Match ({m['kategori']}) - {m['kota']}")
        else:
            print(f"Error: {r.text}")

finally:
    ai_proc.terminate()
    next_proc.terminate()
    print("\nServers stopped")