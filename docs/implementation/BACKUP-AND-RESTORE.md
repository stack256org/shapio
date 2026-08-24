# Backup and Restore

Backups are not automatic. Set them up yourself.

Two things hold state, both on named Docker volumes when running via
`docker-compose.yml` / `docker-compose.build.yml`:

| Volume | Mounted at | Holds |
|---|---|---|
| `shapio_pgdata` | `/var/lib/postgresql/data` | Everything: workspaces, boards, posts, votes, comments, accounts, sessions |
| `shapio_uploads` | `/app/public/uploads` | Uploaded files, only on the default `local` storage setting — not needed if `STORAGE_S3_*` is configured |

Always back up the database. Back up the uploads volume too, unless you're on
S3/R2 storage.

## Database

```bash
# Dump
docker compose exec postgres pg_dump -U shapio shapio > backup.sql

# Restore into a fresh instance (stop app/worker first so nothing writes
# mid-restore)
docker compose stop app worker
cat backup.sql | docker compose exec -T postgres psql -U shapio shapio
docker compose start app worker
```

For a scheduled backup, run the `pg_dump` command above from cron or your
platform's scheduled-job feature, piping to timestamped files and rotating
old ones.

## Uploads volume

```bash
# Back up
docker run --rm -v shapio_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-backup.tar.gz -C /data .

# Restore
docker run --rm -v shapio_uploads:/data -v "$PWD":/backup alpine \
  tar xzf /backup/uploads-backup.tar.gz -C /data
```

## Before upgrading

Check [CHANGELOG.md](../../CHANGELOG.md) for anything needing manual work,
and take a fresh backup first — the `migrate` service applies schema changes
automatically and is safe to run repeatedly, but a backup is still cheap
insurance before any version bump.
