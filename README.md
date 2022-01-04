# web in the dark

A simple app that aims to support playing **Blades in the Dark**.

Currently it only allows to keep track of clocks.

## deployment

This repository is ready for deploying to heroku. Call `heroku create` or
`heroku create --remote <remote name>` and after that execute `./configure.ps1`

You still need to populate the database manually. For that use the sql scripts 
* `create-types.sql`
* `create-tables.sql`
* `post-tables.sql`

in that order.

After pushing to your heroku remote the app should get deployed.

### local deployment

If you want to run this app locally you also need a postgres instance. You need
to change the DATABASE_URL in your .env file.

After that run `npm run local`

