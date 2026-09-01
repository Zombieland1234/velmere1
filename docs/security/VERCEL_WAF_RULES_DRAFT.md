# Velmère Vercel WAF Rules Draft

## Rule 1 — Block scanner paths
Action: block or challenge.

Expression:
```text
path contains `.env` OR `wp-admin` OR `phpmyadmin` OR `etc/passwd` OR `xmlrpc.php` OR `/.git`
```

## Rule 2 — Challenge scanner user-agents
Action: challenge.

Expression:
```text
user-agent contains sqlmap OR nikto OR nmap OR masscan OR wpscan OR dirbuster OR gobuster OR python-requests OR curl OR wget
```

## Rule 3 — Rate-limit public API
Action: rate limit.

Expression:
```text
path starts with `/api/market-integrity/` OR `/api/security/`
```

## Rule 4 — Protect admin/security exports
Action: challenge or allowlist + app-level token.

Expression:
```text
path starts with `/admin` OR path contains `/api/security/export` OR `/api/security/events`
```

These rules are drafts. Start in log/challenge mode if production traffic patterns are unknown.
