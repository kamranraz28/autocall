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

- Docker & Docker Compose
- Asterisk server with ARI enabled (external, not containerized)
- ElevenLabs API key (for TTS)

## Installation

### Docker (recommended)

```bash
# 1. Clone
git clone <repo>
cd autocall

# 2. Create .env file
cp .env.example .env
# Edit .env — set at minimum: SERVICE_TOKEN, BASE_URL,
# ELEVENLABS_API_KEY, VOICE_ID, VPS_PASS, CALLBACK_API_KEY

# 3. Start all services
docker compose up -d

# App runs at http://localhost:3000
```

### Manual

```bash
npm install
# Requires MySQL 8+ and MongoDB running locally
npm start
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `SERVICE_TOKEN` | API auth token |
| `BASE_URL` | Public server URL |
| `MONGO_URI` | MongoDB connection string |
| `MYSQL_HOST` | MySQL host (default: 127.0.0.1) |
| `MYSQL_PORT` | MySQL port (default: 3306) |
| `MYSQL_USER` | MySQL user (default: root) |
| `MYSQL_PASSWORD` | MySQL password |
| `MYSQL_DATABASE` | MySQL database (default: autocall) |
| `ARI_URL` | Asterisk ARI base URL |
| `ARI_USER` | ARI username |
| `ARI_PASS` | ARI password |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS key |
| `VOICE_ID` | ElevenLabs voice ID |
| `VPS_PASS` | SFTP password for audio upload |
| `CALLBACK_URL` | Callback endpoint URL |
| `CALLBACK_API_KEY` | API key for callback authentication |

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

After each call completes, a POST request is sent to `CALLBACK_URL` with `CALLBACK_API_KEY`:

```
POST <CALLBACK_URL>
X-API-Key: <CALLBACK_API_KEY>

{
  "channel": "<channel_from_db>",
  "answered": true,
  "answerCode": 1       // 1=success, 2=thank_you, null=no_input
}
```
