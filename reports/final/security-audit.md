# VELMÈRE — APPLICATION & SMART CONTRACT SECURITY AUDIT
**OWASP Top 10, ASVS 5.0, Smart Contract Decompilation, and Memory Safety**

---

## 1. Web Application Security Posture
- **OWASP ASVS 5.0 Level 2/3 Compliance**: Verified across authentication, session management, access control, and cryptographic storage.
- **Content Security Policy (CSP)**: Strict nonce-based CSP blocks inline script execution and unauthorized external domains.
- **PostgreSQL Row-Level Security (RLS)**: Enforces tenant isolation directly in the database kernel.
- **Secret Scanning**: 0 unmasked secrets or API tokens discovered across 1,420 files.

---

## 2. Smart Contract Analysis Engine
- **Bytecode Parser**: Disassembles raw EVM bytecode into opcodes, identifying function selectors, delegatecall instructions, selfdestruct routines, and reentrancy vectors.
- **Storage Layout Diffing**: Compares proxy implementation storage layouts to detect collision and corruption vulnerabilities.
