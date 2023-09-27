import Database from "bun:sqlite";
import { DATABASE_URL } from "~/constants";

let dbInstance: Database;

export const getDbInstance = () => {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = new Database(DATABASE_URL, { create: true });
  return dbInstance;
};
