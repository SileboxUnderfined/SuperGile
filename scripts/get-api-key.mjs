#!/usr/bin/env node
// Gets a YouGile API key for the plugin settings:
//   npm run api-key
// Asks for your YouGile login and password, lets you pick a company and
// prints a new key. The password is sent only to YouGile and is not stored.
import readline from 'node:readline';

const HOST = (process.env.YOUGILE_HOST || 'https://yougile.com').replace(/\/+$/, '');
const API = `${HOST}/api-v2`;

const ask = (question, { hidden = false } = {}) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Print the prompt, then swallow the echo of every typed character
      rl._writeToOutput = (text) => {
        if (text.includes(question)) rl.output.write(text);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });

const post = async (path, body) => {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${res.status} ${data.error || data.message || res.statusText}`);
  }
  return data;
};

const main = async () => {
  console.log(`YouGile: ${HOST}`);
  const login = await ask('Login (email): ');
  const password = await ask('Password: ', { hidden: true });

  const companies = (await post('/auth/companies', { login, password })).content || [];
  if (!companies.length) {
    throw new Error('No companies found for this account');
  }
  companies.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} (${c.id})`));
  const choice = companies.length === 1 ? 1 : Number(await ask('Company number: '));
  const company = companies[choice - 1];
  if (!company) {
    throw new Error('Unknown company number');
  }

  const { key } = await post('/auth/keys', { login, password, companyId: company.id });
  console.log(`\nAPI key for "${company.name}":\n\n  ${key}\n`);
  console.log('Paste it into Super Productivity → YouGile provider settings. Keep it private.');
};

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
