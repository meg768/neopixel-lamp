#!/usr/bin/env node

var sprintf = require('yow/sprintf');
var config = require('./src/scripts/config.js');

var App = function() {


	function run() {
		try {
			var args = require('yargs');

			args.usage('Usage: $0 <command> [options]')

			args.help();
			args.option('url', {alias:'u', describe:'Socket IO url', default:config.service.url});

			args.command(require('./src/commands/test.js'));
			args.command(require('./src/commands/server.js'));

			args.wrap(null);
			args.demand(1);

			args.check(function(argv) {
				return true;
			});


			args.argv;

		}
		catch(error) {
			console.log(error.stack);
			process.exit(-1);
		}

	};

	run();
};

module.exports = new App();
