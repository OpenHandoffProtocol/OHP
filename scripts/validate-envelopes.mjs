#!/usr/bin/env node
// Lightweight schema validator used for CI and local checks.
// Usage: node scripts/validate-envelopes.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { cwd, exit } from 'node:process';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = cwd();
const schemaPath = resolve(root, 'schemas/ohp-envelope.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => join(dir, name));
}

function listConformanceEnvelopes(baseDir) {
  const out = [];
  if (!existsSync(baseDir)) return out;
  for (const tier of readdirSync(baseDir)) {
    const tierDir = join(baseDir, tier);
    if (!statSync(tierDir).isDirectory()) continue;
    for (const vec of readdirSync(tierDir)) {
      const vecDir = join(tierDir, vec);
      if (!statSync(vecDir).isDirectory()) continue;
      const envelope = join(vecDir, 'envelope.json');
      if (existsSync(envelope)) out.push(envelope);
    }
  }
  return out;
}

const files = [
  ...listJsonFiles(resolve(root, 'examples/envelopes')),
  ...listConformanceEnvelopes(resolve(root, 'conformance/test-vectors')),
];

let failures = 0;
for (const file of files) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const ok = validate(data);
  const rel = relative(root, file);
  if (ok) {
    console.log(`ok    ${rel}`);
  } else {
    failures++;
    console.log(`FAIL  ${rel}`);
    for (const err of validate.errors) {
      console.log(`        ${err.instancePath || '<root>'} ${err.message}`);
    }
  }
}

console.log(`\n${files.length} envelope(s) checked, ${failures} failure(s).`);
exit(failures === 0 ? 0 : 1);
