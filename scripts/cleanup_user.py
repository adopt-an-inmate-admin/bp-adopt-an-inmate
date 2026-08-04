import os
import sys
import json
import requests
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from .env.local
env_path = os.path.join(os.path.dirname(__file__), "../.env.local")
load_dotenv(env_path)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
MONDAY_API_KEY = os.getenv('MONDAY_API_KEY')
MONDAY_API_URL = "https://api.monday.com/v2"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase environment variables missing in .env.local")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def delete_monday_item(item_id):
    if not MONDAY_API_KEY or not item_id:
        return
    
    query = f'mutation {{ delete_item (item_id: {item_id}) {{ id }} }}'
    headers = {"Authorization": MONDAY_API_KEY, "API-Version": "2023-04"}
    
    try:
        r = requests.post(url=MONDAY_API_URL, json={"query": query}, headers=headers)
        res = r.json()
        if "errors" in res:
            print(f"Warning: Failed to delete Monday item {item_id}: {res['errors']}")
        else:
            print(f"Deleted Monday item: {item_id}")
    except Exception as e:
        print(f"Warning: Error deleting Monday item {item_id}: {e}")

def cleanup(email):
    print(f"--- Starting cleanup for {email} ---")
    
    # 1. Get user by email from auth.admin (requires service key)
    # The python client for supabase auth.admin is a bit different
    try:
        # We'll try to find the user ID from adopter_profiles if possible, 
        # as searching auth.users directly might be restricted or require more code.
        # But we also want to clear auth metadata.
        
        # Get user_id from adopter_profiles first
        # We need to find the user_id for this email. 
        # Usually, the email is in auth.users, but we can't easily query it by email via standard table select.
        
        # Let's try to list users and find the one with the email
        users_res = supabase.auth.admin.list_users()
        user = next((u for u in users_res if u.email == email), None)
        
        if not user:
            print(f"User with email {email} not found in auth.users.")
            # Still try to cleanup profiles just in case
        else:
            user_id = user.id
            print(f"Found user_id: {user_id}")
            
            # Reset onboarding_complete metadata
            supabase.auth.admin.update_user_by_id(
                user_id, 
                attributes={'user_metadata': {'onboarding_complete': False}}
            )
            print("Reset onboarding_complete metadata.")

            # Find Monday IDs before deleting rows
            profile_res = supabase.table('adopter_profiles').select('monday_id').eq('user_id', user_id).execute()
            if profile_res.data:
                for row in profile_res.data:
                    delete_monday_item(row.get('monday_id'))
            
            apps_res = supabase.table('adopter_applications').select('monday_id').eq('adopter_uuid', user_id).execute()
            if apps_res.data:
                for row in apps_res.data:
                    delete_monday_item(row.get('monday_id'))

            # Delete rows
            supabase.table('adopter_applications').delete().eq('adopter_uuid', user_id).execute()
            print("Deleted rows from adopter_applications.")
            
            supabase.table('adopter_profiles').delete().eq('user_id', user_id).execute()
            print("Deleted rows from adopter_profiles.")

            # Delete from app_counter
            supabase.table('app_counter').delete().eq('adopter_uuid', user_id).execute()
            print("Deleted rows from app_counter.")

            # Delete from adopter_num_external_active
            supabase.table('adopter_num_external_active').delete().eq('adopter_uuid', user_id).execute()
            print("Deleted rows from adopter_num_external_active.")
            
            # Also clear adopter_monday_ids if it exists
            supabase.table('adopter_monday_ids').delete().eq('adopter_email', email).execute()
            print("Deleted rows from adopter_monday_ids.")

    except Exception as e:
        print(f"Error during cleanup: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/cleanup_user.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    cleanup(email)
    print("--- Cleanup complete ---")
