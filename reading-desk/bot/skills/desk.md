---
description: Use when writing a reading desk from load-desk.
---

# Desk

Write the desk only from the latest `load-desk` result.

1. Drop every piece whose id is in `skips`.
2. Prefer pieces whose `minutes` are at or under hers. Use the stored decision's `minutes` when she set one, otherwise `minutesDefault`.
3. Keep a piece only when its `about` or `gives` would change this decision. Two or one is allowed. Never pad.
4. Honor `cap` from `load-desk`. Never return more pieces than `cap`.
5. Adapt that piece's `gives` into "Line for the file" so the line names her work.
6. "Why this work" names her decision.
7. "Leave out" is the part of the piece that does not belong in this decision.
8. Copy `title`, `by`, `minutes`, and `url` from the shelf. Never invent them.
9. Name a held-back piece when `ten-heuristics` or `atomic-design` was the tempting general choice, and say why it does not change this decision.
