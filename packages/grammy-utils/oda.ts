import chalk, {
  BackgroundColorName,
  ForegroundColorName,
  ModifierName,
} from "chalk";
import debug, { debug as d } from "debug";
import * as util from "util";

const secrets = new Set<string>();

const defaultDebugger = d(`unity2`);

const createDebugger = (scope: string) => {
  const newDebugger = defaultDebugger.extend(scope);
  newDebugger.log = function (message) {
    const finalMessage = [...secrets]
      .filter(Boolean)
      .reduce((message, secret) => {
        const redactedSecret =
          secret.substring(0, 2) +
          "*".repeat(Math.max(0, Math.min(secret.length - 2, 8)));
        return message.replace(secret, redactedSecret);
      }, message);
    process.stderr.write(util.format(finalMessage + `\n`));
  };
  return newDebugger;
};

const scopes = ["bot", "telegram", "system", "module", "middleware"] as const;

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
}, {} as Record<(typeof scopes)[number], debug.Debugger>);

/*
 * Add here the VALUES that you wish to remove from the logs
 * These should come from external sources, like environment variables and
 * external apis
 */
const addDebugSecret = (secret: string) => secrets.add(secret);
const addDebugSecrets = (...secrets: string[]) =>
  secrets.forEach(addDebugSecret);

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
  { label, message }: { label: string; message?: unknown },
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

  return `${labelColorFunction(label)}: ${messageColorFunction(
    message ? String(message) : "(UNDEFINED)"
  )}`;
};

const fromObjectToLabeledMessage = (
  obj: Record<string, unknown>,
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

type OnOffOptions = {
  on?: string;
  off?: string;
};

function onOff(options?: OnOffOptions) {
  const { on = "on", off = "off" } = options ?? {};
  return function (value: boolean) {
    if (value === true) {
      return chalk.green(`${on} ✔`);
    }
    return chalk.red(`${off} ✘`);
  };
}

export const oda = {
  clearTerminalLine,
  addDebugSecret,
  addDebugSecrets,
  onOff,
  banner,
  labeledMessage,
  fromObjectToLabeledMessage: fromObjectToLabeledMessage,
  ...debuggers,
  debug: defaultDebugger,
};
