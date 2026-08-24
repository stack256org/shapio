# Feature 10 — Changelog

> Product behaviour only. For roles and permissions see [PLATFORM.md](../PLATFORM.md). Technical reference: [`../implementation/features/10-changelog.md`](../implementation/features/10-changelog.md).

## Overview

The Changelog is a brand's public record of shipped work — a structured feed of releases and updates that customers can read and subscribe to. A **Brand Admin** writes each entry, links it to the feedback it addresses, and publishes it to announce the release. Publishing notifies the customers who asked for that work, closing the loop between feedback and delivery.

The changelog is published at the clean URL `/{ws-slug}/changelog`, with a single-entry view at `/{ws-slug}/changelog/{entry}` and an RSS feed at `/{ws-slug}/changelog/feed.xml`. A Brand Admin can keep the changelog public or make it private to the workspace.

---

## What an Entry Contains

Each changelog entry has:

- **Title** — the headline of the release (1–200 characters).
- **Body** — the description of what shipped, with basic formatting (headings, bold, italic, lists, links, quotes).
- **Label** — one of: **New Feature**, **Improvement**, **Bug Fix**, **Security**, **Deprecation**. The label is shown as a coloured badge.
- **Date** — the date the entry was published.
- **Linked feedback** — zero or more feedback posts the entry addresses. Linked posts may come from any board in the workspace, public or private, and must belong to the same workspace.

---

## Who Does What

- **Brand Admin** can create, edit, publish, unpublish, and delete changelog entries. The changelog is a Brand Admin responsibility.
- **Team Members** cannot create, edit, or publish changelog entries. Drafts in the team changelog list are visible to the team, but writing and publishing are Brand Admin actions only.
- **Users** (the brand's customers) read the public changelog and can subscribe via the RSS feed — no account is required to read the changelog or its RSS feed. They never create or manage entries.

---

## Drafts and Publishing

- A new entry is saved as a **draft** by default. Drafts are visible only to the workspace team (Brand Admin and Team Members) in the team changelog list — never to the public.
- The editor auto-saves drafts while writing, so work is not lost.
- **Publishing** makes the entry public on the changelog and records its publish date. When an entry is published, every User who voted on a linked feedback post is notified by email that the feature they asked for has shipped.
- **Unpublishing** returns an entry to draft. It disappears from the public changelog and can be re-published later. No emails are re-sent.
- Editing and re-publishing an entry does **not** re-notify voters — each entry notifies its voters only once.

---

## Notifications and a Known Limitation

Publishing an entry notifies the people who voted on the feedback linked to it, so customers hear directly that their request was delivered.

Voters are notified **once per entry**. As a current limitation, if a Brand Admin links additional feedback to an entry **after** it has already been published, the voters of that newly added feedback are **not** notified. Notifying voters of later-linked feedback is planned for a future release.

---

## The Public Changelog

- The public changelog lists published entries, newest first. Each entry shows its label badge, publish date, title, a short preview of the body, and the feedback it is linked to.
- Opening an entry shows the full body, the label and publish date, and the list of linked feedback (each with its status and vote count) so customers can trace a release back to the request behind it.
- An **RSS feed** is available so customers can subscribe in their reader and follow releases as they ship. The feed includes published entries only.
- **Visibility** is controlled by the Brand Admin. When the changelog is public, anyone can read it and the RSS feed. When it is private, both the changelog and the feed are hidden from non-members (they appear not to exist), and the Changelog link is removed from the public navigation.

---

## User Journeys

### A Brand Admin announces a release

A Brand Admin opens the changelog, starts a new entry, and fills in a title, label, and body. They search for and link the feedback the release addresses, saving along the way as a draft. When ready, they publish — the entry goes live on the public changelog and the customers who voted on the linked feedback are notified that their request has shipped.

### A Brand Admin fixes a published entry

A Brand Admin edits a published entry — for example, to correct a typo — and saves. The public changelog updates immediately. No notifications are re-sent.

### A Brand Admin unpublishes an entry

A Brand Admin unpublishes a live entry. It is removed from the public changelog and shown as a draft in the team changelog list, where it can be edited or re-published later without re-notifying anyone.

### A customer follows releases

A customer visits the public changelog, browses entries newest-first, and opens one to read the full update and see the feedback it delivered. They subscribe via RSS to be notified of future releases in their reader.

### A voter hears their request shipped

A customer who voted on a piece of feedback receives an email when a changelog entry linked to that feedback is published, telling them the feature they asked for has shipped and linking to the full update.

---

## Acceptance Criteria

- A Brand Admin can create a changelog entry with a title, label, and body.
- Creating, editing, and publishing changelog entries is restricted to the Brand Admin; Team Members cannot create, edit, or publish entries.
- Anyone can read the public changelog and its RSS feed without an account.
- A new entry is saved as a draft by default, and drafts auto-save while editing.
- The editor offers a write view and a preview of the formatted body.
- A Brand Admin can link feedback from the same workspace to an entry, searching for posts by title.
- A Brand Admin can publish a draft; publishing notifies every voter of the linked feedback.
- Voters are notified only once per entry — editing or re-publishing does not re-send notifications.
- Voters of feedback linked to an entry *after* it is published are not notified (known limitation).
- A Brand Admin can unpublish a published entry, returning it to draft.
- A Brand Admin can edit and delete any entry, draft or published.
- Published entries appear on the public changelog at `/{ws-slug}/changelog`, newest first.
- Draft entries are never visible on the public changelog.
- Each entry has a detail view at `/{ws-slug}/changelog/{entry}` showing the full body and linked feedback with their statuses.
- An RSS feed is available at `/{ws-slug}/changelog/feed.xml` and includes one item per published entry.
- When the changelog is private, the changelog and its RSS feed are hidden from non-members, and the Changelog link is removed from public navigation.
- Each entry's label is shown as a correctly coloured badge on cards and detail views.
</content>
