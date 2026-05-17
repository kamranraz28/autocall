# AutoCall

Voice broadcasting system that uses Asterisk ARI to make automated outbound calls, play pre-recorded messages, collect DTMF responses, and send call result callbacks.

## How It Works

```
Client → POST /v1/call → Express API → MySQL (store call) → Asterisk ARI (originate)
                                                                    ↓
Asterisk dials number → StasisStart → answer → play welcome audio
                                                                    ↓
                                                    DTMF: 1=success, 2=thank_you
                                                                    ↓
                                                   StasisEnd → update MySQL → callback
```

1. **Initiate** — `POST /v1/call` with `to`, `shopId`, optional `channel`
2. **Dial** — Asterisk originates the call via PJSIP trunk
3. **Play** — On answer, plays the shop's welcome recording; waits 15s for DTMF
4. **Collect** — Digit `1` → success; Digit `2` → thank_you; no input → timeout hangup
5. **Complete** — MySQL row updated with result and status `completed`
6. **Callback** — HTTP POST to `https://ping.edokan.co/api/publish` with `channel`, `answered`, `answerCode`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Health check (no auth) |
| POST | `/v1/call` | Initiate an outbound call |
| GET | `/v1/calls` | List call history (paginated) |
| GET/POST/PUT/DELETE | `/v1/recordings` | Manage TTS recordings |
| GET/PUT | `/v1/billing/wallet` | Manage wallet |

All endpoints (except `/status`) require header: `x-service-token: <token>`

## Prerequisites

- Node.js 18+
- MySQL 8+ (database: `autocall`)
- MongoDB (for billing)
- Asterisk server with ARI enabled
- ElevenLabs API key (for TTS)

## Installation

```bash
# 1. Clone and install
git clone <repo>
cd autocall
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings (see below)

# 3. Create MySQL database and tables
mysql -u root -e "CREATE DATABASE autocall"
# Run the schema (tables: shops, calls, recordings)

# 4. Start
npm start
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `SERVICE_TOKEN` | API auth token |
| `BASE_URL` | Public server URL |
| `MONGO_URI` | MongoDB connection string |
| `ARI_URL` | Asterisk ARI base URL |
| `ARI_USER` | ARI username |
| `ARI_PASS` | ARI password |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS key |
| `VOICE_ID` | ElevenLabs voice ID |
| `VPS_PASS` | SFTP password for audio upload |

## Database Tables

**MySQL — `calls`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AI PK | |
| `call_id` | VARCHAR(36) | UUID |
| `shop_id` | INT | FK to `shops` |
| `to_number` | VARCHAR(20) | Destination |
| `channel` | VARCHAR(100) | Optional identifier |
| `status` | VARCHAR(20) | `queued` → `completed` |
| `result` | VARCHAR(20) | `success`, `thank_you`, `no_input` |
| `created_at` | DATETIME | |
| `ended_at` | DATETIME | |

**MySQL — `recordings`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AI PK | |
| `recording_id` | VARCHAR(36) | UUID |
| `shop_id` | INT | FK to `shops` |
| `text_message` | TEXT | TTS input text |
| `type` | VARCHAR(20) | `welcome`, `success`, `cancel` |
| `file_url` | VARCHAR(500) | Path to audio file |
| `duration` | INT | Seconds |
| `status` | VARCHAR(20) | `processing` → `active` |
| `created_at` | DATETIME | |

## Callback

After each call completes, a POST request is sent to:

```
POST https://ping.edokan.co/api/publish
X-API-Key: pae5air7iafaingahng0nieceot9wiegiphohJei0Iheejohhiepek5diebahso0

{
  "channel": "<channel_from_db>",
  "answered": true,
  "answerCode": 1       // 1=success, 2=thank_you, null=no_input
}
```
