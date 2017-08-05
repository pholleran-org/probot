#!/usr/bin/env node

require('dotenv').config();

const pkgConf = require('pkg-conf');
const program = require('commander');
const {findPrivateKey} = require('../lib/private-key');

program
  .usage('[options] <plugins...>')
  .option('-p, --port <n>', 'Port to start the server on', process.env.PORT || 3000)
  .option('-t, --tunnel <subdomain>', 'Expose your local bot to the internet', process.env.SUBDOMAIN || process.env.NODE_ENV !== 'production')
  .option('-a, --app <id>', 'ID of the GitHub App', process.env.APP_ID)
  .option('-P, --private-key <file>', 'Path to certificate of the GitHub App', findPrivateKey)
  .option('-s, --secret <secret>', 'Webhook secret of the GitHub App', process.env.WEBHOOK_SECRET)
.parse(process.argv);

process.env.AUTH_METHOD = 'githubapp';

if (!program.app) {
  console.warn('Missing GitHub App ID.\nUse --app flag or set APP_ID environment variable.');
  program.help();
}

if (!program.privateKey) {
  program.privateKey = findPrivateKey();
}

if (program.tunnel) {
  try {
    const setupTunnel = require('../lib/tunnel');
    setupTunnel(program.tunnel, program.port).then(tunnel => {
      console.log('Listening on ' + tunnel.url);
    }).catch(err => {
      console.warn('Could not open tunnel: ', err.message);
    });
  } catch (err) {
    console.warn('Run `npm install --save-dev localtunnel` to enable localtunnel.');
  }
}

const createProbot = require('../');

const probotopts = {
  id: program.app,
  secret: program.secret,
  cert: program.privateKey,
  port: program.port
};

const probot = createProbot(probotopts);

pkgConf('probot').then(pkg => {
  const plugins = require('../lib/plugin')(probot);
  const requestedPlugins = program.args.concat(pkg.plugins || []);

  // If we have explicitly requested plugins, load them; otherwise use autoloading
  if (requestedPlugins.length > 0) {
    plugins.load(requestedPlugins);
  } else {
    plugins.autoload();
  }
  probot.start();
});
