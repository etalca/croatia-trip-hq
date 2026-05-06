const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

test('Vercel has a guarded staging-first deployment workflow', () => {
  const vercel = readJson('vercel.json');
  assert.equal(vercel.ignoreCommand, 'bash scripts/vercel-ignore-build.sh');

  const guard = fs.readFileSync(path.join(root, 'scripts/vercel-ignore-build.sh'), 'utf8');
  assert.match(guard, /VERCEL_ENV/);
  assert.match(guard, /production/);
  assert.match(guard, /VERCEL_GIT_COMMIT_REF/);
  assert.match(guard, /main/);
  assert.match(guard, /exit 0/);

  const pkg = readJson('package.json');
  assert.equal(pkg.scripts['deploy:staging'], 'npm test && vercel deploy --target=preview --yes');
  assert.equal(pkg.scripts['deploy:production'], 'node scripts/blocked-production-deploy.js');

  const docs = fs.readFileSync(path.join(root, 'DEPLOYMENT.md'), 'utf8');
  assert.match(docs, /staging/i);
  assert.match(docs, /croatia-trip-hq-env-staging-tanners-projects-899bf962\.vercel\.app/);
  assert.match(docs, /staging\.croatia\.tannerbegin\.com/);
  assert.match(docs, /Do not run `vercel --prod`/);
});
