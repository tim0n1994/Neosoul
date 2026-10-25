import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.endsWith('.lock') && !file.endsWith('.lockb'));

const suspicious = [
  /SUPABASE_TOKEN\s*=\s*(?!<set-outside-repository>|\$\{SUPABASE_TOKEN\})\S+/i,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/,
  /\bwhsec_[A-Za-z0-9]{16,}/,
  /\b(?:rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./,
];

const findings = [];
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (suspicious.some((pattern) => pattern.test(line))) {
      findings.push(`${file}:${index + 1}`);
    }
  });
}

if (findings.length > 0) {
  console.error('Credential-shaped material found in tracked files:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(`Security scan passed: ${files.length} tracked text files checked.`);
