

# Project Memory — visordepedidos
> 1404 notes | Score threshold: >40

## Safety — Never Run Destructive Commands

> Dangerous commands are actively monitored.
> Critical/high risk commands trigger error notifications in real-time.

- **NEVER** run `rm -rf`, `del /s`, `rmdir`, `format`, or any command that deletes files/directories without EXPLICIT user approval.
- **NEVER** run `DROP TABLE`, `DELETE FROM`, `TRUNCATE`, or any destructive database operation.
- **NEVER** run `git push --force`, `git reset --hard`, or any command that rewrites history.
- **NEVER** run `npm publish`, `docker rm`, `terraform destroy`, or any irreversible deployment/infrastructure command.
- **NEVER** pipe remote scripts to shell (`curl | bash`, `wget | sh`).
- **ALWAYS** ask the user before running commands that modify system state, install packages, or make network requests.
- When in doubt, **show the command first** and wait for approval.

**Stack:** JavaScript · React + Tailwind · DB: Firebase

## 📝 NOTE: 1 uncommitted file(s) in working tree.\n\n## Important Warnings

- **⚠️ GOTCHA: Optimized Score — parallelizes async operations for speed** — - > 1400 notes | Score threshold: >40
+ > 1402 notes | Score threshold
- **⚠️ GOTCHA: Optimized Score — parallelizes async operations for speed** — - > 1396 notes | Score threshold: >40
+ > 1398 notes | Score threshold
- **⚠️ GOTCHA: Optimized Project — parallelizes async operations for speed** — - - **⚠️ GOTCHA: Optimized Score — parallelizes async operations for s
- **⚠️ GOTCHA: Optimized Score — parallelizes async operations for speed** — - > 1374 notes | Score threshold: >40
+ > 1377 notes | Score threshold
- **gotcha in agent-rules.md** — File updated (external): .brainsync/agent-rules.md

Content summary (8

## Active: `src/services`

- **Fixed null crash in FDDNI**
- **what-changed in printService.js**

## Project Standards

- what-changed in config.js — confirmed 3x
- Added JWT tokens authentication — confirmed 3x
- Optimized Score — confirmed 3x
- what-changed in shared-context.json — confirmed 3x
- what-changed in shared-context.json — confirmed 3x
- Optimized Score — parallelizes async operations for speed — confirmed 3x
- what-changed in brainsync_auto.md — confirmed 3x
- what-changed in brainsync_auto.md — confirmed 3x

## Known Fixes

- ❌ - - Fixed null crash in orders — prevents null/undefined runtime crashes → ✅ problem-fix in agent-rules.md
- ❌ - - Fixed null crash in Falta — prevents null/undefined runtime crashes → ✅ problem-fix in agent-rules.md
- ❌ - - Fixed null crash in FDDNI → ✅ problem-fix in agent-rules.md
- ❌ - - Fixed null crash in Conectando — prevents null/undefined runtime crashes → ✅ problem-fix in agent-rules.md
- ❌ const [failed, setFailed] = useState(false); → ✅ problem-fix in ImageCarousel.jsx

## Recent Decisions

- Optimized Score — parallelizes async operations for speed
- Optimized Score — parallelizes async operations for speed
- Optimized Score — parallelizes async operations for speed
- Optimized Score — parallelizes async operations for speed

## Learned Patterns

- Decision: Optimized Optimized (seen 2x)
- Always: what-changed in brainsync_auto.md — confirmed 3x (seen 6x)
- Always: what-changed in brainsync_auto.md — confirmed 3x (seen 7x)
- Agent generates new migration for every change (squash related changes)
- Agent installs packages without checking if already installed

### 📚 Core Framework Rules: [callstackincubator/react-native-best-practices]
# React Native Best Practices

## Overview

Performance optimization guide for React Native applications, covering JavaScript/React, Native (iOS/Android), and bundling optimizations. Based on Callstack's "Ultimate Guide to React Native Optimization".

## Skill Format

Each reference file follows a hybrid format for fast lookup and deep understanding:

- **Quick Pattern**: Incorrect/Correct code snippets for immediate pattern matching
- **Quick Command**: Shell commands for process/measurement skills
- **Quick Config**: Configuration snippets for setup-focused skills
- **Quick Reference**: Summary tables for conceptual skills
- **Deep Dive**: Full context with When to Use, Prerequisites, Step-by-Step, Common Pitfalls

**Impact ratings**: CRITICAL (fix immediately), HIGH (significant improvement), MEDIUM (worthwhile optimization)

## When to Apply

Reference these guidelines when:
- Debugging slow/janky UI or animations
- Investigating memory leaks (JS or native)
- Optimizing app startup time (TTI)
- Reducing bundle or app size
- Writing native modules (Turbo Modules)
- Profiling React Native performance
- Reviewing React Native code for performance

## Security Notes

- Treat shell ...
(truncated)


### 📚 Core Framework Rules: [callstackincubator/upgrading-react-native]
# Upgrading React Native

## Overview

Covers the full React Native upgrade workflow: template diffs via Upgrade Helper, dependency updates, Expo SDK steps, and common pitfalls.

## Typical Upgrade Sequence

1. **Route**: Choose the right upgrade path via [upgrading-react-native.md][upgrading-react-native]
2. **Diff**: Fetch the canonical template diff using Upgrade Helper via [upgrade-helper-core.md][upgrade-helper-core]
3. **Dependencies**: Assess and update third-party packages via [upgrading-dependencies.md][upgrading-dependencies]
4. **React**: Align React version if upgraded via [react.md][react]
5. **Expo** (if applicable): Apply Expo SDK layer via [expo-sdk-upgrade.md][expo-sdk-upgrade]
6. **Verify**: Run post-upgrade checks via [upgrade-verification.md][upgrade-verification]



## When to Apply

Reference these guidelines when:
- Moving a React Native app to a newer version
- Reconciling native config changes from Upgrade Helper
- Validating release notes for breaking changes

## Quick Reference

| File | Description |
|------|-------------|
| [upgrading-react-native.md][upgrading-react-native] | Router: choose the right upgrade path |
| [upgrade-helper-core.md][upgrade-he...
(truncated)


### 📚 Core Framework Rules: [vercel-labs/react-best-practices]
# Vercel React Best Practices

Comprehensive performance optimization guide for React and Next.js applications, maintained by Vercel. Contains 64 rules across 8 categories, prioritized by impact to guide automated refactoring and code generation.

## When to Apply

Reference these guidelines when:
- Writing new React components or Next.js pages
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Refactoring existing React/Next.js code
- Optimizing bundle size or load times

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Eliminating Waterfalls | CRITICAL | `async-` |
| 2 | Bundle Size Optimization | CRITICAL | `bundle-` |
| 3 | Server-Side Performance | HIGH | `server-` |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH | `client-` |
| 5 | Re-render Optimization | MEDIUM | `rerender-` |
| 6 | Rendering Performance | MEDIUM | `rendering-` |
| 7 | JavaScript Performance | LOW-MEDIUM | `js-` |
| 8 | Advanced Patterns | LOW | `advanced-` |

## Quick Reference

### 1. Eliminating Waterfalls (CRITICAL)

- `async-defer-await` - Move await into branches where actually used
- `a...
(truncated)


## Available Tools (ON-DEMAND only)
- `sys_core_01(q)` — Deep search when stuck
- `sys_core_05(query)` — Full-text lookup
> Context above IS your context. Do NOT call sys_core_14() at startup.
