-- Default AI provider: Cloudflare Workers AI (OpenAI-compatible), not OpenAI.
-- Only replace empty OpenAI seed defaults (preserve custom API keys).
UPDATE site_settings
SET value_json = '{"endpoint":"https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID","model":"@cf/meta/m2m100-1.2b","apiKey":""}',
    updated_at = datetime('now')
WHERE key = 'ai'
  AND (
    value_json IS NULL
    OR trim(value_json) = ''
    OR (
      value_json LIKE '%api.openai.com%'
      AND value_json LIKE '%"apiKey":""%'
    )
  );

INSERT OR IGNORE INTO site_settings (key, value_json, updated_at)
VALUES (
  'ai',
  '{"endpoint":"https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID","model":"@cf/meta/m2m100-1.2b","apiKey":""}',
  datetime('now')
);
