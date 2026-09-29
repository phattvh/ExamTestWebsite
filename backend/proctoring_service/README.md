# Proctoring Service

Microservice responsible for analyzing student behavior during an exam and managing risk scores to detect potential academic dishonesty.

## Architecture

- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL (for permanent violation logs)
- **Cache/State**: Redis (for cumulative risk score calculation)

## Redis Risk Engine

The Risk Engine uses **Redis** to store the state of a user's behavior during a specific exam session.
- **Key Format**: `risk:{exam_id}:{user_id}`
- **TTL (Time to Live)**: 600 seconds (10 minutes). If a user does not commit any new violations within 10 minutes, their risk score effectively resets, giving them a clean slate for minor infractions.
- **Alerting**: If the score reaches `>= 30`, an HTTP POST is sent to the `realtime_service` to broadcast a warning to the proctor/teacher dashboard.

### Local Configuration

The Redis connection is configured via environment variables. In Docker, it defaults to:
`REDIS_URL=redis://redis:6379`

For local testing without Docker, ensure Redis is running locally and set your `.env`:
```
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/exam_db
```

## Running Tests

To run the unit tests (which mock the Redis and DB connections):

```bash
pip install -r requirements.txt
pytest tests/ -v
```
