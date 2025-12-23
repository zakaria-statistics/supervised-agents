const test = require('node:test');
const assert = require('node:assert');
const server = require('./index.js');

const BASE_URL = 'http://localhost:3000';

test('API Tests', async (t) => {
  // Start server before tests
  server.listen(3000);

  // Helper function to handle server shutdown after all tests
  t.after(() => {
    server.close();
  });

  await t.test('GET / should return welcome message', async () => {
    const response = await fetch(`${BASE_URL}/`);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.message, 'Team Project API');
    assert.strictEqual(data.version, '1.0.0');
  });

  await t.test('GET /health should return ok status', async () => {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.status, 'ok');
    assert.ok(data.timestamp); // Check if timestamp exists
  });

  await t.test('GET /unknown should return 404', async () => {
    const response = await fetch(`${BASE_URL}/unknown`);
    const data = await response.json();

    assert.strictEqual(response.status, 404);
    assert.strictEqual(data.error, 'Not found');
  });
});
