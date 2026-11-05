const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

// Keep patched upstream minimatch 11's parser and limits intact. ESLint 9 and
// older plugins still expect a callable CommonJS default, while modern callers
// destructure named exports. The function already carries the legacy helpers.
const entry = require.resolve('minimatch');
const manifest = JSON.parse(readFileSync(path.resolve(path.dirname(entry), '../../package.json'), 'utf8'));
if (manifest.version !== '11.0.1') throw new Error('Review minimatch compatibility before changing its pinned version.');
const suffix = '\n// Verinaliz: preserve the legacy callable CommonJS export.\nmodule.exports = Object.assign(module.exports.minimatch, module.exports);\n';
const contents = readFileSync(entry, 'utf8');
const source = contents.endsWith(suffix) ? contents.slice(0, -suffix.length) : contents;
const checksum = createHash('sha256').update(source).digest('hex');
if (checksum !== 'd89e8ca7dda77bd9dc9efed6920b0ed09deb2f478ada54110980daa3080d3f9b') {
  throw new Error('Unexpected minimatch source; refusing to patch it.');
}
if (source === contents) writeFileSync(entry, source + suffix);
