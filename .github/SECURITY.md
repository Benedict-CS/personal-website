# Security Policy

## Supported versions

Security fixes are applied on the active development and default branches. Production deployments should rebuild the Docker image from the latest committed code and run database migrations as documented.

## Reporting a vulnerability

**Do not** open a public issue for undisclosed security vulnerabilities.

1. **Preferred:** Use the contact published at `https://<your-site>/.well-known/security.txt` when the site is deployed (configure `SECURITY_TXT_CONTACT` and optionally `SECURITY_TXT_POLICY` in the environment). See [ENVIRONMENT.md](../docs/ENVIRONMENT.md).
2. **GitHub:** If this repository has [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) enabled, use **Security → Report a vulnerability**.
3. Include: affected routes or APIs, reproduction steps, and assessed impact.

We aim to acknowledge valid reports within a few business days.

## Hardening references

- [PHASE3_OBSERVABILITY_AND_SECURITY.md](../docs/PHASE3_OBSERVABILITY_AND_SECURITY.md) — headers, auth, rate limits
- [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) — common operational issues

The public UI is **light-theme only**; dark mode is not supported or planned for this codebase.
