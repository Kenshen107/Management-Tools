# Team Notice Builder

A single-page tool for putting together a clear, multi-topic email to your
team — where each topic carries its own explicit ask for them to confirm
back that they actually read and understood it (not just skimmed and moved on).

No install, no server, no account. Open `index.html` in a browser and use it.

## How it works

1. Fill in a subject line, your name, and an optional opening note.
2. Add a topic for each thing you need covered — a quality issue, a policy
   change, a reminder, whatever's on your list. Each topic has:
   - a title and the content you need them to read
   - optional step-by-step instructions (hit "+ Add step" as many times as
     you need)
   - an optional link — check "Include a link," paste in the label and web
     address, and it's inserted as a clickable link in the email
   - the exact line you want them to reply with to confirm that topic
     (defaults to "Read and understood")
3. The right-hand preview renders the actual email: bold topic titles,
   numbered steps, and a highlighted "How to confirm" box at the bottom
   that spells out, per topic, the exact phrase you want back — no more
   open-ended blanks your team has to guess how to fill in.
4. Hit "Copy body" and paste into Gmail/Outlook/etc. — the bold formatting
   carries over into rich-text compose windows automatically (falls back to
   clean plain text if you paste somewhere that doesn't support it), or use
   "Download .txt" for a plain-text file. Send it yourself, to the whole
   team, the way you normally would.

Your draft is autosaved in the browser (via `localStorage`) so refreshing
the page won't lose your work, but nothing is uploaded anywhere — it's all
local to your machine.

## Why replies instead of a tracking dashboard

The point is a habit that's easy to keep up: one clearly structured email,
with clearly separated asks, that makes it obvious to your team exactly
what they need to confirm — and obvious to you, reading their reply,
whether they actually did.
