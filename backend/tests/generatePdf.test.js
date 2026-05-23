const test = require('node:test');
const assert = require('node:assert/strict');

const generatePdf = require('../utils/generatePdf');

const profile = {
  _id: '6a1109361bf887983f4bb70d',
  status: 'submitted',
  createdAt: new Date('2026-05-23T00:00:00.000Z'),
  personalDetails: { firstName: 'Test', lastName: 'Candidate' },
  education: { highestDegree: 'Bachelor' },
};

test('profile PDF URL points to the streaming endpoint', async () => {
  const pdfUrl = await generatePdf(profile);

  assert.equal(pdfUrl, '/api/profile/generated-pdf');
});

test('profile PDF can be generated in memory', async () => {
  const { buffer, fileName } = await generatePdf.generateProfilePdfBuffer(profile);

  assert.equal(fileName, 'profile-6a1109361bf887983f4bb70d.pdf');
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 4).toString('utf8'), '%PDF');
  assert.ok(buffer.length > 100);
});
