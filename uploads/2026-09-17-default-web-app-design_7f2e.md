# Default Web App Design (Paper: Default Page)

**Date:** 2026-09-17 PT  
**Paper file:** Default Page (`01M2RZ2PAH918JWHQQ4A03FD03`)  
**Page:** Default Web App Design (`1-0`)  
**Machine:** Mac Mini Paper Desktop  
**Status:** v0.1 live — light + dark sticker sheets + core screen shells

## Purpose

Anu's **default design page** for future web apps (desktop + mobile). Averaged from TrustMRR.com top products (public UIs), not a fork of Agent Preview crimson (`#C4453C`) or Deal Terminal amber.

## TrustMRR inspiration sample

Public / named leaders used for the average (stealth-only entries skipped for UI cues):

1. Stan  
2. Chatbase  
3. GojiberryAI  
4. Rezi  
5. 1Lookup  
6. Kibu  
7. Postiz  
8. Peers in the same band (e.g. Cometly-style SaaS chrome)

**Averaged pattern:** clean white / soft slate grounds, bold Inter-like sans, medium radius (8–12px), one strong indigo/blue CTA family, airy marketing + denser app tables, dark mode as soft slate panels not pure black.

## Tokens (formal registry on this file = light defaults)

| Token | Light | Dark (artboard-local) |
|-------|-------|------------------------|
| background | `#FFFFFF` | `#0F172A` |
| wash | `#F8FAFC` | `#111827` |
| foreground | `#0F172A` | `#F8FAFC` |
| muted | `#F1F5F9` | `#1E293B` |
| muted-foreground | `#64748B` | `#94A3B8` |
| border | `#E2E8F0` | `#334155` |
| primary | `#4F46E5` | `#818CF8` |
| primary-foreground | `#FFFFFF` | `#0F172A` |
| success | `#10B981` | `#34D399` |
| destructive | `#EF4444` | `#F87171` |
| card | `#FFFFFF` | `#1E293B` |

**Type:** Inter Tight (display) + Inter (body) + Paper Mono (data)  
**Radius:** sm 6 / md 10 / lg 12  
**Stack map:** Next.js + Tailwind + shadcn/ui (indigo primary maps to `primary` CSS vars)

## Artboards (10)

Light column / Dark column:

1. Default - DS Light (`1-0`) / Default - DS Dark (`2L-0`) — sticker sheets  
2. Default - Mobile Light (`70-0`) / Default - Mobile Dark (`7M-0`) — 390×844  
3. Default - Desktop Light (`56-0`) / Default - Desktop Dark (`63-0`) — 1440 app chrome  
4. Default - Landing Light (`88-0`) / Default - Landing Dark (`8T-0`)  
5. Default - Auth Light (`9E-0`) / Default - Auth Dark (`9R-0`)

## Relationship to other DS

- **Agent Preview / Prototype Accel:** brick-crimson `#C4453C` — keep for that product line; do not overwrite from this file.  
- **Deal Terminal:** navy/amber alternate — separate.  
- **This file:** default indigo SaaS kit for new apps unless Anu picks another.

## Engineer notes

- Prefer CSS variables from this file's Paper tokens for new shadcn themes.  
- Dark mode values are documented here and painted on dark artboards; formal Paper tokens are light-first.  
- No brand logos from TrustMRR products — inspire only.

## Screenshots (box)

- `/workspace/refs/default-ds-light.png`  
- `/workspace/refs/default-ds-dark.png`  
- `/workspace/refs/default-desktop-light.png`  
- `/workspace/refs/default-desktop-dark.png`  
- `/workspace/refs/default-mobile-light.png`  
- `/workspace/refs/default-mobile-dark.png`
