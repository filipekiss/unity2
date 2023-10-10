export interface IProcessEnv {
  NODE_ENV: "development" | "production" | "test";
  BOT_TOKEN: string;
  BOT_USERNAME: string;
  OPENAPI_KEY: string;
  SQLITE_DATA_DIR: string;
  TURSO_TOKEN: string;
  UNITY2_ENABLE_DEV_MIGRATIONS: string;
  UNITY2_SUMMARY_EXPIRATION: string;
  UNITY2_SUMMARY_MESSAGES_COUNT: string;
  UNITY2_SUMMARY_COMMAND_TIMEOUT: string;
}
declare global {
  namespace NodeJS {
    interface ProcessEnv extends IProcessEnv {}
  }
}

export {};
