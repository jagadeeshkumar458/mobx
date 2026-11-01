import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sha256Hex } from '../src/sha256.ts';

test('built-in SHA-256 matches Node crypto, including Telugu and long inputs', () => {
  for (const s of ['', 'abc', 'రిఫ్రెష్ రేట్ ₹79,999', 'x'.repeat(55), 'y'.repeat(56), 'z'.repeat(1000)]) {
    assert.equal(sha256Hex(s), createHash('sha256').update(s).digest('hex'));
  }
});
