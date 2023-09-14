FROM oven/bun

WORKDIR /opt/unity2/

COPY . .
RUN bun install

ENV DEBUG=""

CMD ["bun", "./apps/telegram-bot/bot.ts"]
