# Community Developer Hub — Testing & Verification Guide

This document details the functional, security, UI, and technical testing specifications implemented and verified across the platform.

---

## 1. Automated Verification Script
A validation test suite is provided at `scripts/verify-platform.mjs` to test business logic and invariants:
- Streak increment logic and same-day idempotency
- 5-dimensional rating recalculation
- RLS policy verification simulation
- Zero-cost asset integrity

Run the test suite:
```bash
node scripts/verify-platform.mjs
```

---

## 2. Test Matrix

### A. Functional Testing
| Test ID | Area | Test Scenario | Expected Outcome | Verified |
|---|---|---|---|---|
| **FN-01** | Authentication | Sign up with valid credentials | User created, profile row initialized, streak record created with 0 streak | ✓ |
| **FN-02** | Authentication | Sign in with suspended account | Login rejected with clear suspension notification | ✓ |
| **FN-03** | Profiles | Edit profile skills and availability | Profile updated in DB, public portfolio reflects tags | ✓ |
| **FN-04** | Projects | Showcase new project with tech tags | Project inserted, tech relations created, +50 pts awarded, first_project badge unlocked | ✓ |
| **FN-05** | Projects | Project like toggle | `project_likes` toggled, `likes_count` trigger increments/decrements | ✓ |
| **FN-06** | Collaboration | Post open role and apply | Member submits application with experience note, duplicate applications prevented | ✓ |
| **FN-07** | Collaboration | Accept applicant into team | Applicant added to `project_members`, receives notification, +30 pts awarded | ✓ |
| **FN-08** | Workspace | Task status change to Completed | Task updated, completing user awarded +10 pts & qualifying action | ✓ |
| **FN-09** | Reviews | Submit 5-dimension rating | Ratings recorded (1-5 range), project average rating recalculated automatically | ✓ |
| **FN-10** | Spotlight | Export social promotional card | HTML5 canvas synthesizes 1080p graphics for Instagram Post and Story | ✓ |

### B. Security Testing
| Test ID | Security Scenario | Threat Model | Expected Defense | Verified |
|---|---|---|---|---|
| **SEC-01** | Creator rates own project | Rating inflation | RLS constraint and server guard deny action with error | ✓ |
| **SEC-02** | Non-admin accesses `/admin` | Privilege escalation | Server redirect to `/` with "Access Restricted" alert | ✓ |
| **SEC-03** | Service-role key client leak | Secret credential exposure | `admin.ts` throws immediate runtime error if accessed in client browser | ✓ |
| **SEC-04** | User modifies foreign project | Unauthorized project tamper | RLS policy verifies `creator_id = auth.uid()` | ✓ |
| **SEC-05** | Multiple actions in 1 day for streak | Streak farming | Anti-gaming streak engine increments only once per calendar day | ✓ |

### C. UI & Theme Testing
| Test ID | Viewport / Theme | Expected Appearance | Verified |
|---|---|---|---|
| **UI-01** | Light Theme | High-contrast clean slate styling with `#f8fafc` background | ✓ |
| **UI-02** | Dark Theme | OLED-friendly deep slate `#090d16` background with vivid accents | ✓ |
| **UI-03** | Mobile Viewport (375px) | Responsive hamburger drawer, stacked cards, full touch usability | ✓ |
| **UI-04** | Empty States | Informative empty state cards with helpful call-to-actions | ✓ |

