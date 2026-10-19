import os
import sys

MODEL_NAME = "intfloat/multilingual-e5-base"  # 768 dimensi, sama dengan Step 1-2


def get_supabase():
    """Buat client Supabase dari environment variable."""
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit(
            "Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dulu.\n"
            '  PowerShell: $env:SUPABASE_URL = "https://xxxx.supabase.co"'
        )
    return create_client(url, key)
