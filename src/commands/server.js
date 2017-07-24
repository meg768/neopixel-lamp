#!/usr/bin/env node

var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var isFunction = require('yow/is').isFunction;
var prefixLogs = require('yow/logs').prefix;
var NeopixelStrip = require('../scripts/neopixel-strip.js');
var config = require('../scripts/config.js');

var Module = new function() {

	function debug() {
		console.log.apply(this, arguments);
	}

	function defineArgs(args) {

		args.help('help').alias('help', 'h');

		args.option('url',      {alias:'u', describe:'Socket IO url', default:config.service.url});
		args.option('address',  {alias:'a', describe:'I2C bus address', default:config.i2c.address});
		args.option('length',   {alias:'l', describe:'Neopixel strip length', default:config.strip.length});
		args.option('segments', {alias:'s', describe:'Number of segments in strip', default:config.strip.segments});
		args.option('service',  {alias:'n', describe:'Service name', default:config.service.name});

		args.wrap(null);

		args.check(function(argv) {
			return true;
		});
	}

	function run(argv) {

		prefixLogs();

		var strip = new NeopixelStrip({segments:argv.segments, length:argv.length, address:argv.address});
		var socket = require('socket.io-client')(argv.url + '/bar');

		socket.on('connect', function(data) {
			debug('Connected to socket server.');

			// Register the service
			socket.emit('service', {name:argv.service, timeout:10000});
			socket.emit('join', argv.service);

		});

		socket.on('color-changed', function(data) {
			console.log('I changed color');
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
				console.log('Bradcasting!');
				socket.emit('broadcast', argv.service, 'color-changed', data);

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
