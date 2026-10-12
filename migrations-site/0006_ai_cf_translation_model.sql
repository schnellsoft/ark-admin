-- Use Cloudflare Workers AI translation model (m2m100) via /ai/run.
UPDATE site_settings
SET value_json = '{"endpoint":"https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID","model":"@cf/meta/m2m100-1.2b","apiKey":""}',
    updated_at = datetime('now')
WHERE key = 'ai'
  AND value_json LIKE '%"apiKey":""%'
  AND (
    value_json LIKE '%api.openai.com%'
    OR value_json LIKE '%gpt-4o-mini%'
    OR value_json LIKE '%llama-3.1-8b-instruct%'
    OR value_json LIKE '%/ai/v1"%'
  );

INSERT OR IGNORE INTO site_settings (key, value_json, updated_at)
VALUES (
  'ai',
  '{"endpoint":"https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID","model":"@cf/meta/m2m100-1.2b","apiKey":""}',
  datetime('now')
);
