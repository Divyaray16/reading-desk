---
description: Use when writing a reading desk from load-desk, including the morning note.
---

# Desk

Write the desk only from the latest `load-desk` result. Never invent a title, author, or URL.

1. Drop every piece whose id is in `skips`.
2. Use only pieces in `shelf`. A publication with no article there stays on the map, and you do not invent a post for it. Prefer pieces whose `minutes` are at or under hers. Use the stored decision's `minutes` when she set one, otherwise `minutesDefault`.
3. If `decision` is set, keep a piece only when its `about` or `gives` would change that decision. Open with the decision sentence. "Why this work" names that decision.
4. If `decision` is null, still send pieces a product designer can use. Open with one sentence that no specific decision was on file. Prefer variety across authors and topics. Do not invent a project.
5. Two or one is allowed. Never pad to fill `cap`. Never return more pieces than `cap`.
6. If `lastSent` is set and its `decisionSentence` is the same as the current decision sentence (both empty counts as the same), do not send that same set of piece ids again unless the shelf cannot justify different ones.
7. Adapt that piece's `gives` into "Line for the file".
8. "Leave out" is the part of the piece that does not belong in this choice.
9. Copy `title`, `by`, `minutes`, and `url` from the shelf. Paste the URL exactly.
10. When `ten-heuristics` or `atomic-design` was the tempting miss, add one held-back line that names the essay and why it stayed off the desk. That line is not another piece and does not include the essay's URL.
