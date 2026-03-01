#!/bin/sh -e

exec docker compose -f ../compose.yaml "$@"
