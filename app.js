#!/usr/bin/env node

var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var isFunction = require('yow/is').isFunction;
var prefixLogs = require('yow/logs').prefix;
var NeopixelStrip = require('./src/neopixel-strip.js');
var config = require('./src/config.js');

var App = function() {

	function debug() {
		console.log.apply(this, arguments);
	}

	function parseArgs() {

		var args = require('yargs');

		args.usage('Usage: $0 [options]');
		args.help('help').alias('help', 'h');

		args.option('url',      {alias:'u', describe:'Socket IO url', default:config.url});
		args.option('address',  {alias:'a', describe:'I2C bus address', default:config.i2c.address});
		args.option('length',   {alias:'l', describe:'Neopixel strip length', default:config.strip.length});
		args.option('segments', {alias:'s', describe:'Number of segments in strip', default:config.strip.segments});
		args.option('room',     {alias:'r', describe:'Socket server chat room', default:config.room});

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

		});

		socket.on('colorize', function(data, fn) {

			var promise = Promise.resolve();

			if (data.transition == 'fade') {
				promise = strip.fadeToColor(data);
			}
			else if (data.transition == 'wipe') {
				promise = strip.wipeToColor(data);
			}
			else {
				promise = strip.setToColor(data);
			}

			promise.then(function() {
				if (isFunction(fn))
					fn({status:'OK'});
			})

			.catch(function(error) {
				console.error(error);

				if (isFunction(fn))
					fn({error: error.message});
			});

		});


	}


	run(parseArgs());
};

module.exports = new App();
