import { env } from "cloudflare:workers";

export type AppEnv = Env;

export function getEnv(): AppEnv {
  return env as unknown as AppEnv;
}

export async function db() {
  return getEnv().DB;
}

export async function siteDb() {
  return getEnv().SITE_DB;
}
