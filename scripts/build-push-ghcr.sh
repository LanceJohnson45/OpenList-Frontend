#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 ghcr.io/<github-username>/openlist-fork:latest [platform]"
  echo "Example: $0 ghcr.io/myname/openlist-fork:latest linux/amd64"
  exit 1
fi

image="$1"
platform="${2:-linux/amd64}"
frontend_src="${FRONTEND_SRC:-../OpenList-Frontend}"

if [ ! -d "$frontend_src" ]; then
  echo "Frontend source directory not found: $frontend_src"
  echo "Set FRONTEND_SRC=/path/to/OpenList-Frontend if it is not next to this repository."
  exit 1
fi

docker buildx build \
  --platform "$platform" \
  --file Dockerfile.fork \
  --build-context "frontend-src=$frontend_src" \
  --build-arg BASE_IMAGE_TAG=base \
  --build-arg FRONTEND_LITE=false \
  --build-arg VERSION=fork \
  --build-arg WEB_VERSION=local \
  --tag "$image" \
  --push \
  .
