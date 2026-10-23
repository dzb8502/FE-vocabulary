# FE Vocabulary v1.8

Morning study is capped at **40 unique words per local calendar day**, including words already studied that day. Existing local progress and the 1008-word vocabulary are retained.

## Daily selection

- Reserve new-word places first: max(5, ceil(remaining unseen words / calendar days through February 1, 2027 inclusive)), capped at 35 to leave review capacity. Count new words already learned today toward the target. Fewer than five unseen words means schedule all remaining words. This targets first exposure, not guaranteed mastery.
- Fill the rest of the 40 places with due reviews. Priority score: days overdue / previous interval + days overdue / 7 + weakness bonus (3 for afternoon Forgot, 2 for Hard/Again). Break ties by oldest due date, then pool. This is a transparent scheduling heuristic, not a measured recall probability.
- If a late start would require over 35 new words daily, the cap means the first-pass target may not be achievable.
- Carry excess due words forward with their original due dates, keeping them first in line. Do not mark postponed words as reviewed.
- Freeze the selected daily session so refresh/resume cannot add another batch.
- Upgrade trims unfinished legacy queues to the remaining allowance and removes duplicate repeats. If over 40 words were already completed before upgrading, retain those records and assign no more morning work that day.

## Recall-based spacing

Use interval ladder **1, 3, 7, 14, 30, 60 days**. These are practical spaced-repetition settings, not an individually measured forgetting curve or a scientifically unique optimal schedule.

| Morning rating | Next review |
|---|---|
| Hard | 1 day |
| Good | Next rung above the previous interval; first exposure 1 day |
| Easy | One additional rung beyond Good; first exposure 3 days |

Cap intervals at 60 days. Afternoon tests only Hard/Good words studied that morning; Easy is excluded (legacy Again is also reviewed). **Know** preserves the morning interval; **Forgot** overrides it to 1 day. Afternoon confirmation does not advance a second rung on the same day. A forgotten word can begin progressing again after successful recall on a later day.

No automatic repeated cards in the morning. Afternoon is a separate short recall check of the same words, not an additional batch of new words. Starting afternoon early does not prevent newly completed morning words appearing on reopening it.

## Progress and testing

Progress is stored locally in the browser, as before; export regularly and import when changing browsers/devices. The upgrade retains the existing localStorage keys. No server-side access to a learner's local progress is required.

Run `node tests/scheduler.test.cjs` and `node --check app.v16.js`.
