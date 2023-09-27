FROM oven/bun

ENV APP_DIR /opt/unity2

WORKDIR ${APP_DIR}

COPY ./ .

RUN bun install

ENTRYPOINT ["bun", "--cwd", "./apps/telegram-bot"]
CMD ["start"]
