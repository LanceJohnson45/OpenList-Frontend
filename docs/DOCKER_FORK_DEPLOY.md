# Docker Fork Deployment

This repository supports three fork deployment modes:

- Build on GitHub Actions, then let the server pull the finished image. This is recommended for low-spec servers.
- Build and push the image from your local machine, then let the server pull the finished image.
- Build directly from local backend and frontend source. This is useful for local development or powerful servers.

## Recommended: Server Pulls a Prebuilt Image

The workflow `.github/workflows/fork_docker.yml` builds `linux/amd64` and `linux/arm64` images and pushes them to GitHub Container Registry:

```text
ghcr.io/<your-github-username>/openlist-fork:latest
```

If your frontend fork is not named `OpenList-Frontend`, add a repository variable in GitHub:

```text
FRONTEND_REPOSITORY=<your-github-username>/<your-frontend-repo>
```

If the frontend repository is private, add a secret with permission to read it:

```text
FRONTEND_REPOSITORY_TOKEN=<your-token>
```

Build the image:

```text
GitHub repository -> Actions -> Fork Docker image -> Run workflow
```

GitHub Container Registry packages may be private by default. Either make the package public in GitHub, or log in on the server:

```bash
echo '<github-token>' | docker login ghcr.io -u <your-github-username> --password-stdin
```

On the server, create or edit `.env` next to `docker-compose.ghcr.yml`:

```env
OPENLIST_IMAGE=ghcr.io/<your-github-username>/openlist-fork:latest
```

Start or update on the server:

```bash
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

Follow logs:

```bash
docker compose -f docker-compose.ghcr.yml logs -f
```

Stop:

```bash
docker compose -f docker-compose.ghcr.yml down
```

Do not use `docker compose down -v` unless you intentionally want to remove persisted data.

## Local Build, Push to GHCR

This mode avoids building on the server and also avoids using GitHub Actions. It is a good fit when the fork changes rarely.

Log in to GHCR from your local machine. The token needs `write:packages`:

```bash
echo '<github-token>' | docker login ghcr.io -u <your-github-username> --password-stdin
```

Expected local layout:

```text
/path/to/
  OpenList/
  OpenList-Frontend/
```

Build locally and push to GHCR:

```bash
cd /path/to/OpenList
sh scripts/build-push-ghcr.sh ghcr.io/<your-github-username>/openlist-fork:latest linux/amd64
```

Use `linux/arm64` instead if your server is ARM64.

If your frontend repository is elsewhere:

```bash
FRONTEND_SRC=/path/to/OpenList-Frontend sh scripts/build-push-ghcr.sh ghcr.io/<your-github-username>/openlist-fork:latest linux/amd64
```

Then update the server:

```bash
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

## Local Source Build

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
