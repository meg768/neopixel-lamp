#!/usr/bin/env node

var sprintf = require('yow/sprintf');
var config = require('./src/scripts/config.js');

var App = function() {


	function run() {
		try {
			var args = require('yargs');

			args.usage('Usage: $0 <command> [options]')

			args.help();

			args.command(require('./src/commands/server.js'));

			args.wrap(null);
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
