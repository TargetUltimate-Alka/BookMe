# BookMe

AI-powered multi-vendor event service booking platform.

## Structure
- `frontend/` - React app, one feature folder per owner
- `services/` - 4 independent Node/Express services, one per owner
- `contracts/` - API contracts, agreed before implementation
- `docs/` - team playbook and repo maintenance guide

See `docs/BookMe_Repo_Maintenance_Guide.md` for ownership, conventions, and workflow.

## Run locally
```
docker compose up
```

## Conventions
- Branch naming: `feature/<service>-<module>-<short-desc>`
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- No direct pushes to `main` - branch, PR, 1 review, merge
- PRs that change an API shape must reference the contract doc
