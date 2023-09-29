import { Client, createClient } from "@libsql/client";
import { DATABASE_URL, TURSO_TOKEN } from "~/constants";

let dbInstance: Client;

export const getDbInstance = () => {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = createClient({
    url: DATABASE_URL,
    authToken: TURSO_TOKEN,
  });
  return dbInstance;
};
