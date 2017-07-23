#!/usr/bin/env node

var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var isFunction = require('yow/is').isFunction;
var prefixLogs = require('yow/logs').prefix;
var NeopixelStrip = require('../neopixel-strip.js');

var Module = new function() {

	function debug() {
		console.log.apply(this, arguments);
	}

	function defineArgs(args) {

		args.help('help').alias('help', 'h');

		args.option('url',      {alias:'u', describe:'Socket IO url', default:'http://app-o.se'});
		args.option('address',  {alias:'a', describe:'I2C bus address', default:0x26});
		args.option('length',   {alias:'l', describe:'Neopixel strip length', default:8});
		args.option('segments', {alias:'s', describe:'Number of segments in strip', default:4});
		args.option('room',     {alias:'r', describe:'Socket server chat room', default:'neopixel-lamp'});

		args.wrap(null);

		args.check(function(argv) {
			return true;
		});
	}

	function run(argv) {

		prefixLogs();

		var strip = new NeopixelStrip({segments:argv.segments, length:argv.length, address:argv.address});
		var socket = require('socket.io-client')(argv.url);

		socket.on('connect', function(data) {
			debug('Connected to socket server.');

			// Register the service
			socket.emit('service', {name:argv.room, timeout:10000});

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
				socket.emit('broadcast', argv.room, 'color-changed', data);

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


	module.exports.command  = 'server [options]';
	module.exports.describe = 'Run Neopixel lamp server';
	module.exports.builder  = defineArgs;
	module.exports.handler  = run;

};
