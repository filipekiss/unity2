import { IProcessEnv } from "./env";

let _is_production: boolean;
export function isProduction() {
  if (_is_production === undefined) {
    _is_production = process.env.NODE_ENV === "production";
  }
  return _is_production;
}

type LooseAutocomplete<T extends string> = T | Omit<string, T>;
type StringKeys = Extract<keyof IProcessEnv, string>;
export function useEnvOrDefault(
  name: LooseAutocomplete<StringKeys>,
  defaultValue?: string
) {
  if (process.env[name as string] === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    return "";
  }
  return process.env[name as string] as string;
}

export function useEnvOrAbort(name: LooseAutocomplete<StringKeys>) {
  if (process.env[name as string] === undefined) {
    throw new Error(`process.env.${name} must be set. Aborting…`);
  }
  return process.env[name as string] as string;
}

export function useEnvOrNothing(name: LooseAutocomplete<StringKeys>) {
  return process.env[name as string]
    ? (process.env[name as string] as string)
    : undefined;
}
