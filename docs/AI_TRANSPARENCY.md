# AURA GAY 18+ — AI Transparency & Human Agency Statement

**Regulatory Reference:** EU Artificial Intelligence Act (Regulation (EU) 2024/1689) & GDPR Recital 71  
**Feature:** AURA Conversational Wingman & Icebreaker Generator  
**Underlying AI Architecture:** Google Gemini 2.5 Flash via `@google/genai` (Server-Side Proxy)

---

## 1. Scope & Purpose of AI Integration

- The AI engine generates personalized conversation starters and proposition openers.
- Input parameters are restricted exclusively to:
  - Public display name
  - Publicly declared hobbies and interests
  - Optional user-selected conversational vibe (e.g. "Playful & Witty", "Direct & Bold", "Chill Coffee")
- **No Private Data Usage:** Private messages, precise geolocation coordinates, financial data, or sensitive medical attributes are **never** passed to the AI model.

---

## 2. Human Agency & Oversight (Human-in-the-loop)

- **Zero Autonomous Execution:** The AI model never sends a message on the user's behalf.
- Every proposition is presented as a draft suggestion in the user interface.
- The user must explicitly inspect, edit, or tap "Send in Chat" to transmit the message.
- The user may discard any suggestion at will.

---

## 3. Absence of Automated Profiling & Sanctions

- AI is **strictly prohibited** from performing automated account moderation, algorithmic shadowbanning, pricing discrimination, or matchmaking penalization.
- Moderation decisions remain 100% human-adjudicated by trained Trust & Safety personnel.

---

## 4. User Opt-Out Mechanism

Users retain the unconditional right to disable AI assistance:
- **In-App:** Disable the "AI Wingman Icebreaker Generator" switch in the Settings Privacy Center.
- **REST Endpoint:** `POST /api/gdpr/object`
- Disabling the feature completely halts all calls to the Gemini API for the user's account and replaces openers with pre-scripted static templates.
