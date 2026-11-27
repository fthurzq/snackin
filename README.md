# snackin

A Cloudflare Workers-based reminder application.

## Database Configuration

The D1 database is configured in `wrangler.toml`:

- **Database name:** `snek-reminder-db`
- **Binding:** `DB`

The application uses `env.DB` to access the database (defined in `src/types.ts`).

### Local Development

To apply migrations to the local D1 database:

```bash
npm run db:local
```

This runs: `wrangler d1 migrations apply snek-reminder-db --local`

To create the local database if it doesn't exist:

```bash
wrangler d1 create snek-reminder-db --local
```

### Remote Deployment

To apply migrations to the remote database:

```bash
npm run db:remote
```

This runs: `wrangler d1 migrations apply snek-reminder-db --remote`