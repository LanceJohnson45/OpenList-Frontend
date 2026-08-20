# Docker Fork Deployment

This setup builds a Docker image from your local backend fork and your local frontend fork.

Expected local layout:

```text
/Volumes/E/github/
  OpenList/
  OpenList-Frontend/
```

Build and start:

```bash
cd /Volumes/E/github/OpenList
docker compose -f docker-compose.fork.yml up -d --build
```

Open:

```text
http://localhost:5244
```

Rebuild after code changes:

```bash
cd /Volumes/E/github/OpenList
docker compose -f docker-compose.fork.yml build --no-cache
docker compose -f docker-compose.fork.yml up -d
```

Follow logs:

```bash
docker compose -f docker-compose.fork.yml logs -f
```

Stop:

```bash
docker compose -f docker-compose.fork.yml down
```

The image name defaults to `openlist-fork:latest`. Change `image:` in `docker-compose.fork.yml` if you want to push it to your own registry.
