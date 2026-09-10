# VELMÈRE — DATA PRIVACY & GDPR COMPLIANCE AUDIT
**Article 30 RoPA, Cryptographic Tombstoning, and Tracker Isolation**

---

## 1. Privacy Posture
- **Zero Third-Party Trackers**: Velmère contains zero Facebook Pixel, Google Analytics, or third-party ad network scripts.
- **GDPR Article 17 (Right to Erasure)**: User data deletion utilizes cryptographic key shredding, permanently rendering user records undecryptable.
- **Cookie Policy**: All session cookies are strictly configured with `HttpOnly`, `Secure`, and `SameSite=Lax`.
