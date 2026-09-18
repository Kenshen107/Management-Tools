# Team Notice Builder

A single-page tool for putting together a clear, multi-topic email to your
team — where each topic carries its own explicit ask for them to confirm
back that they actually read and understood it (not just skimmed and moved on).

No install, no server, no account. Open `index.html` in a browser and use it.

## How it works

1. Fill in a subject line, your name, and an optional opening note.
2. Add a topic for each thing you need covered — a quality issue, a policy
   change, a reminder, whatever's on your list. Each topic has:
   - a title
   - the actual content you need them to read
   - what you want them to confirm back (defaults to "Read and understood")
3. The right-hand preview assembles everything into one email: your topics
   numbered in order, followed by a reply checklist that restates each
   topic's specific confirmation ask so your team can copy it into their
   reply and fill it in.
4. Copy the subject and body into your email client (or download as a
   `.txt` file) and send it yourself, to the whole team, the way you
   normally would.

Your draft is autosaved in the browser (via `localStorage`) so refreshing
the page won't lose your work, but nothing is uploaded anywhere — it's all
local to your machine.

## Why replies instead of a tracking dashboard

The point is a habit that's easy to keep up: one clearly structured email,
with clearly separated asks, that makes it obvious to your team exactly
what they need to confirm — and obvious to you, reading their reply,
whether they actually did.
