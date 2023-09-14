import { DefaultMethods, Signale, SignaleBase } from 'signale'

export const botLog = new Signale({ scope: 'bot' });
export const telegramLog = new Signale({ scope: 'telegram' });
