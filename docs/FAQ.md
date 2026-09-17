# Frequently asked questions

## Does it work for sports other than padel?

Yes. You can change the sport, participant and playing-area terms, currency, rules, and scoring method. The competition engine remains single elimination.

## Does one installation manage multiple tournaments?

Not yet. Each installation manages one tournament. Multi-tournament organizations are listed in the [roadmap](../ROADMAP.md).

## Which languages are supported?

The application interface supports English and Spanish. New installations and demo data default to English. Existing installations created before language support migrate to Spanish so their experience does not unexpectedly change.

## Where is data stored?

In the SQLite file selected by `DATABASE_PATH`. The Docker volume preserves it between image rebuilds.

## Can I recover the administrator password?

Not as plaintext. Passwords are stored with scrypt. Generate new credentials from secure server access.

## Which information is public?

Identity, participant names, schedule, results, rules, contact details, location, menu, and configured transfer information. Users, passwords, costs, inventory adjustments, and reports remain private.

## How can I test without real data?

Run `npm run demo:seed -- data/demo.sqlite`. The seed uses fictional English data. Never publish a real database to create screenshots or report issues.

## Why is scoring locked after matches begin?

Changing the scoring method or sets-to-win target could invalidate recorded results. Reopen those results before modifying the format.
