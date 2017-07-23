#!/usr/bin/env node

var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var isFunction = require('yow/is').isFunction;
var prefixLogs = require('yow/logs').prefix;

var App = function() {

	function debug() {
		console.log.apply(this, arguments);
	}

	function parseArgs() {

		var args = require('yargs');

		args.usage('Usage: $0 [options]');
		args.help('help').alias('help', 'h');



		args.wrap(null);

		args.check(function(argv) {
			return true;
		});

		return args.argv;
	}

	function run() {

		prefixLogs();

		var socket = require('socket.io-client')('http://app-o.se');

		socket.on('connect', function(data) {
			debug('Connected to socket server.');

			// Register the service
			socket.emit('join', 'neopixel-lamp');

		});

		socket.on('color-changed', function(data) {

			console.log('color-changed', data);

		});


	}


	run(parseArgs());
};

module.exports = new App();
