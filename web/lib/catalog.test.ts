import assert from "node:assert/strict";
import test from "node:test";
import { pieces, publicationNames } from "./catalog.ts";
import { shelf } from "../../reading-desk/bot/lib/shelf.ts";

test("the page catalog is the shelf, piece for piece", () => {
  assert.equal(pieces.length, shelf.length);
  pieces.forEach((piece, index) => {
    const source = shelf[index];
    assert.ok(source);
    assert.equal(piece.id, source.id);
    assert.equal(piece.publicationId, source.publicationId);
    assert.equal(piece.title, source.title);
    assert.equal(piece.by, source.by);
    assert.equal(piece.minutes, source.minutes);
    assert.equal(piece.url, source.url);
    assert.deepEqual(piece.topics, source.topics);
    assert.equal(piece.about, source.about);
    assert.equal(piece.gives, source.gives);
    assert.equal(piece.general, source.general);
    assert.equal(piece.why.endsWith("."), true);
    assert.equal(piece.why.includes(". "), false);
    assert.ok(piece.leaveOut.length > 0);
    assert.ok(publicationNames[piece.publicationId]);
    assert.equal(piece.url.startsWith("https://"), true);
  });
});
