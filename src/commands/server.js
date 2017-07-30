#!/usr/bin/env node

var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var isFunction = require('yow/is').isFunction;
var prefixLogs = require('yow/logs').prefix;
var NeopixelStrip = require('../scripts/neopixel-strip.js');
var config = require('../scripts/config.js');
var io = require('socket.io-client');

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
		args.option('service',  {alias:'n', describe:'Service name', default:config.service.url});

		args.wrap(null);

		args.check(function(argv) {
			return true;
		});
	}

	function registerService() {

		return Promise.resolve();

	}


	function run(argv) {

		prefixLogs();

		registerService().then(function() {
			var strip = new NeopixelStrip({segments:argv.segments, length:argv.length, address:argv.address});
			var socket = io.connect(argv.service);


			socket.on('connect', function() {
				debug('Connected to socket server.');

				// Register the service
				socket.emit('i-am-the-provider');

			});

			socket.on('disconnect', function() {
				debug('Disconnected from socket server.');
				registerService();

			});


			socket.on('colorize', function(options, fn) {

				var startTime = new Date();

				strip.colorize(options).then(function() {
					socket.emit('color-changed', options);

					var endTime = new Date();

					if (isFunction(fn))
						fn({status:'OK', time: endTime - startTime});
				})

				.catch(function(error) {
					console.error(error);

					if (isFunction(fn))
						fn({error: error.message});
				});

			});


		});


	}


	module.exports.command  = 'server [options]';
	module.exports.describe = 'Run Neopixel lamp server';
	module.exports.builder  = defineArgs;
	module.exports.handler  = run;

};
