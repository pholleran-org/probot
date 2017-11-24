#!/usr/bin/env node

require('dotenv').config();

const pkgConf = require('pkg-conf');
const program = require('commander');

program
  .usage('[options] <plugins...>')
  .option('-p, --port <n>', 'Port to start the server on', process.env.PORT || 3000)
  .option('-t, --tunnel <subdomain>', 'Expose your local bot to the internet', process.env.SUBDOMAIN || process.env.NODE_ENV !== 'production')
  .option('-o, --oauthtoken <token>', 'OAuth token for your application', process.env.TOKEN)
  .option('-c, --clientid <id>', 'OAuth token for your application', process.env.CLIENT_ID)
  .option('-s, --secret <secret>', 'Webhook secret of the GitHub App', process.env.WEBHOOK_SECRET)
  .option('-s, --clientsecret <secret>', 'OAuth token for your application', process.env.CLIENT_SECRET)
  .option('-w, --webhook-path <path>', 'URL path which receives webhooks. Ex: `/webhook`', process.env.WEBHOOK_PATH)

  .parse(process.argv);

process.env.AUTH_METHOD = 'oauth';
program.app = program.integration;

/* If (!program.oauthtoken) {
  console.warn('Missing GitHub OAuth Token.\nUse --oauthtoken flag or set token environment variable.');
  program.help();
} */

if (program.tunnel && !process.env.DISABLE_TUNNEL) {
  try {
    const setupTunnel = require('../lib/tunnel')
    setupTunnel(program.tunnel, program.port).then(tunnel => {
      console.log('Listening on ' + tunnel.url)
    }).catch(err => {
      console.warn('Could not open tunnel: ', err.message)
    })
  } catch (err) {
    console.warn('Run `npm install --save-dev localtunnel` to enable localtunnel.')
  }
}

const createProbot = require('../');

const probot = createProbot({
  port: program.port,
  clientid: program.clientid,
  clientsecret: program.clientsecret,
  secret: program.secret
})

pkgConf('probot').then(pkg => {
  probot.setup(program.args.concat(pkg.apps || pkg.plugins || []))
  probot.start()
})