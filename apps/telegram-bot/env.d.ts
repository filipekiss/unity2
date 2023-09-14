declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      BOT_TOKEN: string;
      BOT_USERNAME: string;
      OPENAPI_KEY: string;
    }
  }
}

export { };
