### Inmate Data Migration and Vectorization Pipeline

This document describes how the project handles the synchronization of inmate (adoptee) records from Monday.com to Supabase, including the generation of vector embeddings for search.

#### 1. Automated Synchronization (Cron Job)
The project uses **Vercel Cron Jobs** to automate the bulk sync.
- **Configuration**: Defined in `vercel.json`.
- **Primary Pipeline**: `/api/set_embeddings/pipeline`
- **Schedule**: `0 20 1 * *` (Runs at 20:00 UTC on the 1st of every month).
- **Secondary Sync (DNR Check)**: `/api/check_dnr` (Runs daily at 01:00 UTC to check "Do Not Re-adopt" status).

#### 2. Technical Implementation (`api/set_embeddings/`)
The sync logic is implemented in Python and consists of several key components:

*   **Fetcher (`_fetch_data.py`)**: Connects to the Monday.com API using `MONDAY_API_KEY`, `MONDAY_BOARD_ID`, and `MONDAY_GROUP_ID`. It retrieves records updated within the last 31 days.
*   **Embedder (`_embed_and_upsert.py`)**: Uses the Hugging Face `InferenceClient` with the `sentence-transformers/all-MiniLM-L6-v2` model to generate 384-dimensional vector embeddings from the inmate "bio" field (`notes_for_matching__1`).
*   **Vector Store (`_clients.py`)**: Uses the `vecs` library to upsert embeddings and associated metadata into the Supabase `adoptee_vector` table.

#### 3. Real-time Synchronization (Webhook)
In addition to the monthly bulk sync, real-time status updates are handled via a Monday.com webhook.
- **Endpoint**: `/api/monday-webhook`
- **Logic**: When an application status changes on Monday.com, the webhook updates the corresponding record in the `adoptee_vector` table (e.g., marking an inmate as `ADOPTED` or `WAIT_LISTED`).

#### 4. Manual Execution
To manually trigger the full sync and vectorization pipeline, run the following command from the project root (ensure all required environment variables are set in `.env.local`):

```bash
python -m api.set_embeddings.pipeline
```

#### 5. Required Environment Variables
For the migration pipeline and local scripts to function, the following must be configured (typically in `.env.local` or exported in your shell):

| Variable | Description |
| :--- | :--- |
| `MONDAY_API_KEY` | Monday.com API access token (v2). |
| `MONDAY_BOARD_ID` | The ID of the board containing inmate records. |
| `MONDAY_GROUP_ID` | The specific group ID on the board to sync. |
| `MONDAY_ADOPTED_BOARD_ID` | The ID of the board where adopted inmates are tracked. |
| `MONDAY_ADOPTER_DATA_BOARD_ID` | The ID of the board containing adopter profiles. |
| `MONDAY_ADOPTER_DATA_SUBITEM_BOARD_ID` | The ID of the subitem board for adopter applications. |
| `HF_TOKEN` | Hugging Face API token for embedding generation. |
| `DATABASE_URL` | Supabase PostgreSQL connection string (Direct Connection). |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL. |
| `SUPABASE_SERVICE_KEY` | The service_role key for admin access to Supabase. |
| `CRON_SECRET` | Secret used to authorize Vercel cron job requests. |

#### 6. Local Environment Setup
If you prefer not to use `.env.local`, you can use a shell script to set these variables for your current session. A template `.env-app-migration` might look like this:

```bash
export MONDAY_API_KEY="your_monday_token"
export MONDAY_BOARD_ID="6439746168"
export MONDAY_GROUP_ID="1715196990_inmate_data_report___1"
export MONDAY_ADOPTED_BOARD_ID="your_adopted_board_id"
export MONDAY_ADOPTER_DATA_BOARD_ID="6666910643"
export MONDAY_ADOPTER_DATA_SUBITEM_BOARD_ID="your_subitem_board_id"
export HF_TOKEN="your_huggingface_token"
export DATABASE_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"
export NEXT_PUBLIC_SUPABASE_URL="https://[project-id].supabase.co"
export SUPABASE_SERVICE_KEY="your_service_role_key"
export CRON_SECRET="your_cron_secret"
```

To load these into your shell:
```bash
source .env-app-migration
```
