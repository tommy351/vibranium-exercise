# Exercise

## Development

Install dependencies.

```sh
pnpm install
```

Create a `.env` file.

```
TUNNEL_TOKEN=
SLACK_TOKEN=
SLACK_APP_ID=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
LOG_LEVEL=
OPENAI_API_KEY=
SESSION_SECRET=
BASE_URL=
```

Run database migrations.

```sh
docker compose run --rm drizzle migrate
```

Start the tunnel.

```sh
docker compose up tunnel
```

Run tests.

```sh
pnpm test
```

Remove all containers, add `--volumes` to remove volumes.

```sh
docker compose down
```

## Deployment

### Slack

- Add the following scopes in "Features" > "OAuth & Permissions" > "Scopes" > "Bot Token Scopes".
  - `chat:write`
  - `files:read`
  - `im:history`
  - `users:read`
  - `users:read.email`
- Turn on event subscriptions in "Features" > "Event Subscriptions" > "Enable Events", and subscribe to the following bot events.
  - `message.im`
