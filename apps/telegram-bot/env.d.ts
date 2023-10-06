export interface IProcessEnv {
  NODE_ENV: "development" | "production" | "test";
  BOT_TOKEN: string;
  BOT_USERNAME: string;
  OPENAPI_KEY: string;
  SQLITE_DATA_DIR: string;
  TURSO_TOKEN: string;
  UNITY2_ENABLE_DEV_MIGRATIONS: string;
}
declare global {
  namespace NodeJS {
    interface ProcessEnv extends IProcessEnv {}
  }
}

export {};
