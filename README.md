# unity2

To install dependencies:

```bash
bun install
```

To run:

```bash
bun --cwd ./apps/telegram-bot/ start
```

## Database

This project uses the native bun Sqlite database. Everything is setup to be run
either directly from the host machine or from the docker container.

By default, when running from docker, a volume will be created to persist the
data, but it won't be acessible from the host machine. You can configure it to
be mapped to a local file. To do that, the container uses the `UNITY_DATA`
variable to decide where to mount the db. You can create a `.env` file in the
repository root and add a path that will be mounted and the database will be
created in that location. This is a great way to have the sqlite file shared
between the host and the containers

#### Generating migrations

Whenever you are ready to commit your database changes, you can generate the
migrations. Because these should be commited to the repository, you should run
them in the host machine, by using the command `sqlite:generate`:

```sh
bun ---cwd ./apps/telegram-bot/ sqlite:generate
```

If you run this from the container it won't work. Always generate migrations
from the host app

#### Running migrations

Whenever a new migration is created, you should run it using the
`sqlite:migrate` command. You can run this directly from the docker container:

`docker compose run --rm bot sqlite:migrate`

#### Sharing the SQLite DB between the container and the host

You can copy `.env.example` to `.env` and `./apps/telegram-bot/.env.example` to
`./apps/telegram-bot/.env.local` and it should work just fine.

The database will be available at `./apps/telegram-bot/.storage/db.sqlite`. If
you want to customize the path, make sure that `DATABASE_URL` points to a
`.sqlite` file that will be inside `UNITY2_DATA` folder.

###### Default values

`DATABASE_URL` inside `./apps/telegram-bot/.env.local`: `$PWD/.storage/db.sqlite`
`UNITY2_DATA` inside `./.env`: `./apps/telegram-bot/.storage/`
