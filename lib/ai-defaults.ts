/** Default AI settings: Cloudflare Workers AI translation model. */
export const DEFAULT_AI_SETTINGS = {
  /**
   * Account API root (not /ai/v1).
   * Replace ACCOUNT_ID with your Cloudflare account id.
   */
  endpoint: "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID",
  model: "@cf/meta/m2m100-1.2b",
  apiKey: "",
} as const;

export const DEFAULT_AI_SETTINGS_JSON = JSON.stringify(DEFAULT_AI_SETTINGS);
