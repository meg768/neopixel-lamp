#!/usr/bin/env node

var sprintf = require('yow/sprintf');

var App = function() {


	function run() {
		try {
			var args = require('yargs');

			args.usage('Usage: $0 <command> [options]')

			args.command(require('./src/commands/test.js'));
			//args.command(require('./src/commands/server.js'));

			args.help();

			args.check(function(argv) {
				return true;
			});

			args.demand(1);

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
