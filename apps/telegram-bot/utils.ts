import { number } from "fp-ts";
import { IProcessEnv } from "./env";
import { parse, differenceInMinutes, add, isAfter } from "date-fns";

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
  defaultValue?: unknown
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

export function minutesInBetween(earlier: number, later: number) {
  return differenceInMinutes(later, earlier);
}

type RelativeTimeString = string;
export function parseTimeString(timestring: string) {
  const relativeTimeRe =
    /(\d+)\s*(minutes|minute|min|Min|Minute|Minutes|hr|Hr|hours|hour|Hour|Hours|days|day|Days|Day|weeks|week|Week|Weeks|months|month|mon|Month|Months|years|year|Year|Years|Quarters|Quarter|seconds|second|Seconds|Second|sec|s|m|h|d|D|M|y|Y|q|Q|Qr|qr|ms|w|wk|Wk)/gi;

  const convertCase = {
    ms: "milliseconds",
    s: "seconds",
    sec: "seconds",
    second: "seconds",
    seconds: "seconds",
    Second: "seconds",
    Seconds: "seconds",
    m: "minutes",
    min: "minutes",
    minute: "minutes",
    minutes: "minutes",
    Min: "minutes",
    Minute: "minutes",
    Minutes: "minutes",
    h: "hours",
    hr: "hours",
    Hr: "hours",
    hour: "hours",
    hours: "hours",
    Hour: "hours",
    Hours: "hours",
    d: "days",
    D: "days",
    day: "days",
    days: "days",
    Day: "days",
    Days: "days",
    w: "weeks",
    W: "weeks",
    wk: "weeks",
    Wk: "weeks",
    week: "weeks",
    weeks: "weeks",
    Week: "weeks",
    Weeks: "weeks",
    M: "months",
    mon: "months",
    month: "months",
    months: "months",
    Month: "months",
    Months: "months",
    y: "years",
    Y: "years",
    yr: "years",
    yrs: "years",
    year: "years",
    years: "years",
    Year: "years",
    Years: "years",
    q: "quarters",
    qr: "quarters",
    Q: "quarters",
    Qr: "quarters",
    qtr: "quarters",
    quarter: "quarters",
    quarters: "quarters",
    Quarter: "quarters",
    Quarters: "quarters",
  } as const;

  function relativeTime(relativeTimeString: RelativeTimeString) {
    const now = new Date();
    const reminderDuration: Record<string, number> = {};
    let m;
    relativeTimeRe.lastIndex = 0;
    let remindAt = now;

    while ((m = relativeTimeRe.exec(relativeTimeString)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === relativeTimeRe.lastIndex) {
        relativeTimeRe.lastIndex++;
      }

      const [, duration, unitToken] = m;

      const unit = convertCase[unitToken as keyof typeof convertCase] ?? null;

      if (!unit) {
        throw new Error(`Unable to parse time unit token ${unitToken}`);
      }

      reminderDuration[unit] = Number(duration);
      (remindAt = add(now, reminderDuration)),
        console.log({
          duration,
          unit,
          reminderDuration,
          now,
          remindAt,
        });
    }

    if (!isAfter(remindAt, now)) {
      throw new Error("Date in the past");
    }

    return remindAt;
  }

  function isRelativeTimeFormat(
    maybeRelativeTimeString: any
  ): maybeRelativeTimeString is RelativeTimeString {
    maybeRelativeTimeString = maybeRelativeTimeString.trim();
    if (maybeRelativeTimeString === "now") {
      return true;
    }
    return relativeTimeRe.test(maybeRelativeTimeString);
  }

  if (isRelativeTimeFormat(timestring)) {
    return relativeTime(timestring);
  }
  throw new Error("Unable to parse time string");
}
