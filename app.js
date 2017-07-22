#!/usr/bin/env node

var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var prefixLogs = require('yow/logs').prefix;
var NeopixelStrip = require('./src/neopixel-strip.js');


var App = function() {

	function debug() {
		console.log.apply(this, arguments);
	}



	function parseArgs() {

		var args = require('yargs');

		args.usage('Usage: $0 [options]');
		args.help('help').alias('help', 'h');

		args.option('url',      {alias:'u', describe:'Socket IO url', default:'http://app-o.se'});
		args.option('address',  {alias:'a', describe:'I2C bus address', default:0x26});
		args.option('length',   {alias:'l', describe:'Neopixel strip length', default:32});
		args.option('segments', {alias:'s', describe:'Number of segments in strip', default:4});
		args.option('room',     {alias:'r', describe:'Socket server chat room', default:'neopixel-lamp'});

		args.wrap(null);

		args.check(function(argv) {
			return true;
		});

		return args.argv;
	}

	function run(argv) {

		prefixLogs();

		var strip = new NeopixelStrip({segments:argv.segments, length:argv.length, address:argv.address});
		var socket = require('socket.io-client')(argv.url);

		socket.on('connect', function(data) {
			debug('Connected to socket server.');

			// Join the socket room
			socket.emit('join', {room:argv.room});

			socket.on('fade-to-color', function(data) {

				strip.fadeToColor(data).then(function() {
				})

				.catch(function(error) {
					console.error(error);
				});

			});

			socket.on('wipe-to-color', function(data) {

				strip.wipeToColor(data).then(function() {
				})

				.catch(function(error) {
					console.error(error);
				});

			});

			socket.on('set-to-color', function(data) {

				strip.setToColor(options).then(function() {
				})
				
				.catch(function(error) {
					console.error(error);
				});

			});
		});


	}


	run(parseArgs());
};

module.exports = new App();
