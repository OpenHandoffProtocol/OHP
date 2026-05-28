#!/usr/bin/env node
// Lightweight schema validator used for CI and local checks.
// Usage: node scripts/validate-envelopes.mjs
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { argv, cwd, exit } from 'node:process';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = cwd();
const schemaPath = resolve(root, 'schemas/ohp-envelope.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const patterns = [
  'examples/envelopes/*.json',
  'conformance/test-vectors/**/envelope.json'
];

let failures = 0;
let checked = 0;
for (const pattern of patterns) {
  const files = globSync(pattern);
  for (const file of files) {
    checked++;
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const ok = validate(data);
    const rel = relative(root, resolve(file));
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
}

console.log(`\n${checked} envelope(s) checked, ${failures} failure(s).`);
exit(failures === 0 ? 0 : 1);
