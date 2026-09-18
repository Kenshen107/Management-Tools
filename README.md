# Management Tools — Read & Confirm

A small self-hosted tool for sending multi-topic notices to employees and tracking,
**per topic**, whether they actually read it — not just whether they clicked a link.

## How it works

1. Sign in to the admin dashboard with a shared manager password.
2. Create a **notice** (e.g. "September policy updates").
3. Add as many **topics** to it as you need — each topic has its own body text and
   its own required sign-off phrase (defaults to "I have read and understand this.").
4. Add recipients by name/email and send. Each employee gets a unique link.
5. The employee has to scroll each topic to the bottom and type the exact sign-off
   phrase for *that* topic before it counts as confirmed — one topic at a time.
6. The dashboard shows, per employee and per topic: sent/opened/signed-off status,
   timestamps, and how long they spent on the topic before signing. Sign-offs that
   happen much faster than the topic could plausibly have been read are flagged
   ("fast — review") so you can follow up.

## Setup

```bash
npm install
cp .env.example .env   # fill in ADMIN_PASSWORD, SMTP settings, BASE_URL, etc.
npm start
```

Then open `http://localhost:3000` (or your configured `BASE_URL`) and sign in with
`ADMIN_PASSWORD`.

If SMTP isn't configured yet, emails are logged to the console (with the working
confirmation link) instead of failing, so you can try the whole flow locally first.

## Data storage

Data is kept in `data/db.json`, a single JSON file (no database server required).
It's excluded from git — back it up if you care about historical sign-off records.

## Notes

- Sign-off phrases are matched case-insensitively but must otherwise be typed exactly,
  so employees can't just click through — they have to actually type something that
  proves they read the required text (or at least were shown it clearly).
- "Resend" on the notice page re-sends the same link to one person (e.g. after a
  reminder), without re-emailing everyone else.
