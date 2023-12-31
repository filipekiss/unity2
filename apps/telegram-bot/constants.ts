import { resolve } from "path";
import { useEnvOrAbort, useEnvOrDefault, useEnvOrNothing } from "./utils";

export const APP_DIR = resolve(__dirname);
export const DATABASE_URL = useEnvOrDefault(
  "DATABASE_URL",
  resolve(APP_DIR, "unity2.sqlite")
);
export const TURSO_TOKEN = useEnvOrNothing("TURSO_TOKEN");
export const OPENAPI_KEY = useEnvOrAbort("OPENAPI_KEY");
