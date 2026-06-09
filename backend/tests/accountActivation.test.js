const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { describeActivationState, hashActivationToken } = require('../utils/accountActivation');

test('hashActivationToken hashes tokens deterministically', () => {
  const token = 'test-token-123';
  const expected = crypto.createHash('sha256').update(token).digest('hex');
  assert.equal(hashActivationToken(token), expected);
});

test('describeActivationState reports valid, used, expired, and invalid tokens', () => {
  const now = new Date();
  const valid = describeActivationState({ usedAt: null, expiresAt: new Date(now.getTime() + 60_000) });
  const used = describeActivationState({ usedAt: now, expiresAt: new Date(now.getTime() + 60_000) });
  const expired = describeActivationState({ usedAt: null, expiresAt: new Date(now.getTime() - 60_000) });
  const invalid = describeActivationState(null);

  assert.equal(valid.valid, true);
  assert.equal(used.code, 'used');
  assert.equal(expired.code, 'expired');
  assert.equal(invalid.code, 'invalid');
});
