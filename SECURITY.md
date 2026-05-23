# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately via one of these methods:

- **GitHub private advisory**: Use [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) on this repo.
- **Email**: Send details to the maintainers (see the repo's contact info).

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

We will acknowledge your report within 48 hours and aim to release a fix within 14 days for critical issues.

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (`main`) | Yes |

## Security Considerations for Self-Hosting

Before deploying datacat:

- Set strong, unique values for `API_KEY` and `JWT_SECRET` — never use the defaults
- Never enable `ENABLE_TEST_DATA_ENDPOINT=true` in production (it deletes all data)
- Restrict `CORS_ORIGINS` to your actual frontend origin
- Run the backend behind a reverse proxy (nginx, Caddy) with TLS in production
- The DuckDB file contains all your data — back it up and restrict filesystem access
