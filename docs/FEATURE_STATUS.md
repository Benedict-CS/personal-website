# Feature Status

This document tracks current implementation status of major product capabilities.

Status labels:

- **Done**: implemented and usable
- **Partial**: implemented with known scope limits
- **Planned**: not implemented yet

---

## Editing and Publishing

| Feature | Status | Notes |
|---|---|---|
| Immersive editor overlay | **Done** | Dedicated editor route with focused editing flow |
| Undo/redo (keyboard + toolbar) | **Done** | Supports standard shortcuts (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Y`, `Cmd+Shift+Z`) |
| Save Draft and Publish split | **Done** | Draft save is independent from live publish action |
| Draft recovery UX | **Done** | Local recovery flow replaced blocking confirm-style behavior |
| Server revision history | **Done** | API-backed revision storage and restore path |
| Preview link for draft review | **Done** | Token-based read-only preview links |
| Scheduled publish (custom pages) | **Done** | Scheduled datetime with effective publish state |
| Block lock/protection | **Partial** | Basic lock semantics exist; advanced role-level lock is pending |

---

## Content Management

| Feature | Status | Notes |
|---|---|---|
| Home/About/Contact dashboard editing | **Done** | Full dashboard editing flow in production |
| Dashboard overview workspace | **Done** | Landing dashboard includes metrics, health, recent activity, and operations hub |
| Customizable quick actions | **Done** | Pin, reorder, and reset shortcuts for personal workflow |
| About section ordering and visibility | **Done** | Non-technical control over section structure |
| Custom pages CRUD + reorder + filters | **Done** | Includes templates and safer management controls |
| Post CRUD + versions + preview | **Done** | Includes publish state and historical restore |
| Global find/replace across site | **Planned** | Not in current production scope |

---

## Media and Assets

| Feature | Status | Notes |
|---|---|---|
| Media upload and serve pipeline | **Done** | S3-compatible object storage |
| Unused media cleanup analysis | **Done** | Safe analysis support with deletion flow |
| Optimization assessment (`dryRun`) | **Done** | Candidate scan + estimated savings |
| Optimization execution (`dryRun=false`) | **Done** | Actual compression/overwrite with batch controls |
| Batch optimization controls | **Done** | Run all, stop, retry failed, filter failed reasons |

---

## Operations and Governance

| Feature | Status | Notes |
|---|---|---|
| Audit logging backend | **Done** | Tracks editor, custom pages, media optimization, and related actions |
| Audit log dashboard UI | **Done** | Filters + compact summaries + expandable payload |
| Analytics dashboard | **Done** | Page view and operational visibility |
| Export/import content | **Done** | Data portability endpoints available |
| Multi-user RBAC | **Planned** | Current mode is single-admin oriented |

---

## Platform Readiness Summary

- **Commercial readiness:** strong for single-admin workflows and no-code content operations.
- **Most valuable next upgrades:** RBAC approval flow, true collaborative editing, and global content replacement tooling.
