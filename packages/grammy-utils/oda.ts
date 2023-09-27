import chalk, {
  BackgroundColorName,
  ForegroundColorName,
  ModifierName,
} from "chalk";
import { debug as d } from "debug";

const secrets = new Set<string>();

const defaultDebugger = d(`unity2`);

const createDebugger = (scope: string | string[]) => (message: string) => {
  const finalMessage = [...secrets].reduce((message, secret) => {
    const redactedSecret =
      secret.substring(0, 2) +
      "*".repeat(Math.max(0, Math.min(secret.length - 2, 8)));
    return message.replace(secret, redactedSecret);
  }, message);
  if (Array.isArray(scope)) {
    const scopedDebugger = scope.reduce((newDebugger, scope) => {
      return newDebugger.extend(scope);
    }, defaultDebugger);
    return scopedDebugger(finalMessage);
  }
  return defaultDebugger.extend(scope)(finalMessage);
};

const scopes = ["bot", "telegram", "system"] as const;

/**
 * Oda is a simple object that has a bunch of predefined debuggers
 *
 * You should always use it to sprinkle debug messages throughout your code
 *
 * It's name is Oda because it writes everything behind the scenes and you only
 * see the magic happening
 *
 */
const debuggers = scopes.reduce((debuggers, scope) => {
  if (debuggers[scope]) return debuggers;
  debuggers[scope] = createDebugger(scope);
  return debuggers;
}, {} as Record<(typeof scopes)[number], (message: string) => void>);

/*
 * Add here the VALUES that you wish to remove from the logs
 * These should come from external sources, like environment variables and
 * external apis
 */
const addDebugSecret = (secret: string) => secrets.add(secret);

const clearTerminalLine = () => {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
};

type ChalkOptions = Record<
  ModifierName | BackgroundColorName | ForegroundColorName,
  boolean
>;

type BannerOptions = Partial<ChalkOptions>;

type LabelOptions = {
  label: Partial<ChalkOptions>;
  message: Partial<ChalkOptions>;
};

const banner = (
  text: string,
  options: BannerOptions = { bgBlue: true, white: true, bold: true }
) => {
  let colorFunction = (
    Object.entries(options) as Array<[keyof BannerOptions, boolean]>
  ).reduce((chalkInstance, [optionName, optionValue]) => {
    if (optionValue) {
      return chalkInstance[optionName];
    }
    return chalkInstance;
  }, chalk);

  const header = `┌${"─".repeat(text.length + 2)}┐`;
  const footer = `└${"─".repeat(text.length + 2)}┘`;
  return colorFunction(`\n${header}\n│ ${text} │\n${footer}`);
};

const labeledMessage = (
  { label, message }: { label: string; message: string },
  options: LabelOptions = {
    label: { red: true, bold: true, dim: true },
    message: { green: true },
  }
) => {
  let labelColorFunction = (
    Object.entries(options.label) as Array<[keyof ChalkOptions, boolean]>
  ).reduce((chalkInstance, [optionName, optionValue]) => {
    if (optionValue) {
      return chalkInstance[optionName];
    }
    return chalkInstance;
  }, chalk);

  let messageColorFunction = (
    Object.entries(options.message) as Array<[keyof ChalkOptions, boolean]>
  ).reduce((chalkInstance, [optionName, optionValue]) => {
    if (optionValue) {
      return chalkInstance[optionName];
    }
    return chalkInstance;
  }, chalk);

  return `${labelColorFunction(label)}: ${messageColorFunction(message)}`;
};

const fromObjectToLabeledMessage = (
  obj: Record<string, string>,
  options?: LabelOptions
) =>
  Object.entries(obj).map(([label, message]) => {
    return labeledMessage(
      {
        label,
        message,
      },
      options
    );
  });

export const oda = {
  clearTerminalLine,
  addDebugSecret,
  banner,
  labeledMessage,
  fromObjectToLabeledMessage: fromObjectToLabeledMessage,
  ...debuggers,
  debug: (message: string, scope: string | string[] = "debug") =>
    createDebugger(scope)(message),
};
