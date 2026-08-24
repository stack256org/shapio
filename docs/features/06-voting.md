# Feature 06 — Voting

> Product behaviour for Feature 06. For roles and permissions see [PLATFORM.md](../PLATFORM.md). For technical reference (database, services, abuse protection, components) see [Implementation reference](../implementation/features/06-voting.md).

## Overview

Voting is how the people who use a brand's feedback portal signal what matters most to them. Every piece of feedback carries a vote count, and that count drives the default **Trending** sort and surfaces the most-wanted feedback to the team. Voting turns a long list of feedback into a clear, demand-ranked picture of what customers actually want.

Voting requires an identified voter, but not necessarily an account. Anyone can browse a brand's public boards freely; the first click on a vote button prompts for an email address and a 6-digit confirmation code, after which the vote is cast automatically. A signed-in User votes with their account as before. Either way, one voter gets one vote per piece of feedback and can remove it at any time.

Votes are de-duplicated by **user id** for accounts and by **verified email** for accountless voters — and email matching applies regardless of whether an account exists, so someone who voted while signed in cannot vote again by returning as a guest with the same address. What it cannot prevent is one person using several real mailboxes; see [01-authentication.md](01-authentication.md) for that trade-off. Accountless voting is gated by the `guest_voting` feature flag.

---

## Core Behaviour

- A **signed-in User** can vote on a piece of feedback.
- A **visitor with no account** can vote on the Public Portal once they confirm their email with a one-time code. The prompt appears in place, on the board — they are never navigated away, and the vote they clicked is cast for them as soon as they verify.
- **One vote per User per piece of feedback.** A User cannot vote twice on the same feedback.
- Voting is a **toggle**: a User can cast a vote and later remove it. Removing a vote is always done by the voter.
- Vote counts are shown on every feedback card and on the feedback detail page, so the demand behind each item is visible at a glance.
- Voting on feedback you have already voted on does nothing — it does not error, and it never creates a second vote.
- Removing a vote you have not cast does nothing — it does not error.
- Voting is **blocked** when the feedback is no longer open to votes — specifically when it has been **merged** into another post, when it has been **locked**, when it is **not yet published** (awaiting moderation), or when it sits on an **archived board**. In these cases the vote control is disabled and explains why.

---

## Signing in to Vote

Voting requires a signed-in **User**. A signed-in User votes directly with one click. Their votes are tied to their account, which lets them see their own votes (see [My Votes](#my-votes-filter)) and remove a vote later from any device.

A visitor who is not signed in can still browse boards and read feedback, but clicking to vote prompts them to sign in first. Once signed in, their vote is recorded against their account.

---

## Vote Counts and Trending

- The vote count on a piece of feedback is the headline signal of demand and is shown wherever feedback appears.
- The board's default **Trending** sort uses voting momentum to surface feedback that is gaining support, keeping the most relevant items near the top.
- Counts stay accurate as votes are cast and removed, and remain correct after duplicate feedback is merged together.

---

## My Votes Filter

Signed-in Users get a **"My Votes"** filter on the board, which shows only the feedback they have voted on. This lets a customer quickly return to the ideas they care about and track their progress.

The filter attributes votes to whoever is voting — an account by user id, an accountless visitor by verified email. It is therefore available to both, and hidden only from a visitor who has not identified themselves at all.

---

## Viewing the Voter List

The **team** — the Brand Admin and Team Members — can open the voter list for any piece of feedback to see who voted and when. This is a fixed team capability, not a configurable permission. It helps the team understand who is behind a request (for example, to follow up with interested customers). The voter list is read-only: the team can see voters but cannot remove someone else's vote on their behalf.

The voter list is never shown to Users.

---

## User Flows

### A User votes

```
1. User views a board or feedback detail page
2. Sees the vote control with the current count
3. If not signed in, clicking to vote prompts them to sign in first
4. Once signed in, clicks to vote — the count goes up by one and the control shows as voted
5. If the feedback is closed to votes (merged, locked, etc.), the action is declined with a clear reason
```

### A User removes a vote

```
1. User sees the vote control in its voted state
2. Clicks again to remove the vote — the count goes down by one and the control returns to its default state
```

### The team views the voter list

```
1. A Brand Admin or Team Member opens a feedback detail page
2. A "See who voted ({count})" link appears below the vote count
3. Opening it shows each voter — name and when they voted
```

---

## Product Rules

- Voting requires a signed-in User; a not-signed-in visitor is prompted to sign in before voting.
- One vote per User per piece of feedback.
- A vote can only be removed by the User who cast it.
- Voting is blocked when feedback is merged, locked, not yet published, or on an archived board.
- Vote counts remain accurate through casting, removal, and merging, and never fall below zero.

---

## Acceptance Criteria

- [ ] A signed-in User can cast a vote on a piece of feedback — the count increases immediately.
- [ ] A signed-in User can remove their vote — the count decreases immediately.
- [ ] Voting is idempotent — voting twice does not create two votes.
- [ ] Removing a vote that was never cast produces no error.
- [ ] A not-signed-in visitor who tries to vote is prompted to sign in.
- [ ] The vote control clearly shows when the current User has voted.
- [ ] The vote control is disabled, with a reason, on merged or locked feedback.
- [ ] The vote control is disabled on feedback that sits on an archived board.
- [ ] When voting is declined (e.g. the feedback is locked), the count is left unchanged and the reason is shown.
- [ ] The "My Votes" filter appears on the board for signed-in Users.
- [ ] The "My Votes" filter shows only feedback the current User has voted on.
- [ ] The team (Brand Admin and Team Members) can open the voter list for a piece of feedback.
- [ ] The voter list shows each voter's name and when they voted.
- [ ] Vote counts stay consistent after votes are cast and removed.
- [ ] Vote counts are accurate after duplicate feedback is merged.
- [ ] A vote count never goes below zero.
