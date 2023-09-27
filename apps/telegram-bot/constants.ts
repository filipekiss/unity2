import { resolve } from "path";
import { useEnvOrDefault } from "./utils";

export const APP_DIR = resolve(__dirname);
export const DATABASE_URL = useEnvOrDefault(
  "DATABASE_URL",
  resolve(APP_DIR, "unity2.sqlite")
);
