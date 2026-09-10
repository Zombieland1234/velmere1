# VELMÈRE AUDITOR SELF-SECURITY SPECIFICATION
**Standard:** Directive v3 Sections 78–84

## 1. Defenses Against Malicious Input
1. **ReDoS (Regular Expression Denial of Service):** All regexes in `claim-audit-blocker.ts` and AST parsers are linear-time bounded.
2. **Path Traversal Protection:** Audit IDs are validated against strict alphanumeric regexes before reading or writing to the filesystem.
3. **PDF Injection Protection:** Native stream generation with hex-escaped text blocks; no arbitrary shell execution or untrusted HTML rendering.
4. **Memory Bounds:** Source code inputs capped at 50,000 lines; JSON manifest parses capped at 10MB.
