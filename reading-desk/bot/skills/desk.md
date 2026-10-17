---
description: Use when writing Divya's reading desk of up to three pieces, including the 8:00 Asia/Kolkata morning note or a request for something to read. Do not use it when she said not to send a desk.
---

# Desk

Write the desk only from the latest `load-desk` result. The catalog is the shelf until a fetch exists. Never invent a title, author, or URL. Every URL must be one in `catalog`, and its host must be in `allowedHosts`.

1. Drop every piece whose id is in `skips`.
2. If `lastSent` is set and its `decisionSentence` equals the current decision sentence (both empty counts as the same), drop those piece ids. If that leaves nothing that qualifies, you may repeat. A changed decision may bring a piece back.
3. If `decision` is set, keep a piece only when its `topics`, `about`, or `gives` would change that decision. Open with that sentence and say the pieces are for it. Prefer pieces at or under her `minutes` when she set one.
4. If `decision` is null, still send strong pieces. Open with one sentence that no specific project was on file. Prefer variety across publications and topics. Do not invent a project.
5. At most `cap` (3). Two or one is allowed. Never pad.
6. For each piece, copy `title`, `by`, `minutes`, and `url`. Write Why for this decision or for a general morning read. Adapt `gives` into "Line for the file". Skip is the part of the piece that does not belong in this choice.
7. When a piece with `general: true` (the ten heuristics, Atomic Design) was close but does not change her decision, name it in one held-back line after the pieces. Do not give it a "Line for the file" and do not paste its URL.
