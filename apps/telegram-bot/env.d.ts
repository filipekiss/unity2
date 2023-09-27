export interface IProcessEnv {
  NODE_ENV: "development" | "production" | "test";
  BOT_TOKEN: string;
  BOT_USERNAME: string;
  OPENAPI_KEY: string;
  SQLITE_DATA_DIR: string;
}
declare global {
  namespace NodeJS {
    interface ProcessEnv extends IProcessEnv {}
  }
}

export {};
