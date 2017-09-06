#!/usr/bin/env node

var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var isFunction = require('yow/is').isFunction;
var prefixLogs = require('yow/logs').prefix;
var config = require('../scripts/config.js');
var io = require('socket.io-client');
var SkyBightness = require('sky-brightness');
//var SkyBightness = require('../scripts/sky-brightness.js');


var Module = new function() {

	function debug() {
		console.log.apply(this, arguments);
	}

	function defineArgs(args) {

		args.help('help').alias('help', 'h');

		args.option('url',       {alias:'u', describe:'Socket IO url', default:config.service.url});
		args.option('address',   {alias:'a', describe:'I2C bus address', default:config.i2c.address});
		args.option('length',    {alias:'l', describe:'Neopixel strip length', default:config.strip.length});
		args.option('segments',  {alias:'s', describe:'Number of segments in strip', default:config.strip.segments});
		args.option('service',   {alias:'n', describe:'Service name', default:config.service.url});
		args.option('interval',  {alias:'i', describe:'Refresh interval for clock in seconds', default:60});

		args.wrap(null);

		args.check(function(argv) {
			return true;
		});
	}

	function registerService() {
		return Promise.resolve();
	}


	function run(argv) {

		var NeopixelStrip = require('../scripts/neopixel-strip.js');

		var timer = undefined;

		prefixLogs();

		registerService().then(function() {
			var strip = new NeopixelStrip({segments:argv.segments, length:argv.length, address:argv.address});
			var socket = io.connect(argv.service);

			function disableClock() {
				if (timer != undefined) {
					console.log('Disabling clock...');
					clearTimeout(timer);
					timer = undefined;
				}
			}

			function enableClock() {
				disableClock();
				showClock();

                timer = setInterval(showClock, 1000 * argv.interval);
			}

			function showClock() {


                return new Promise(function(resolve, reject) {
                    var sky = new SkyBightness({
    					latitude: 55.70,
    					longitude: 13.21
    				});

                    sky.getPerceptualBrightness().then(function(brightness) {
                        var now = new Date();
        				var hue = (((now.getHours() % 12) * 60) + now.getMinutes()) / 2;

        				var luminance = brightness * 100 * 0.5;

        				luminance = Math.min(50, luminance);
        				luminance = Math.max(1, luminance);

        				var options = {};
        				options.transition = 'fade';
        				options.duration   = 100;
        				options.color      = {h:hue, s:100, l:luminance};

                        console.log(options);

        				strip.colorize(options);

                    })
                    .catch(function(error) {
                        console.log(error);
                    })
                    .then(function() {
                        resolve();
                    })

                });

			}


			socket.on('connect', function() {
				debug('Connected to socket server.');

				// Register the service
				socket.emit('i-am-the-provider');

				enableClock();

			});

			socket.on('disconnect', function() {
				debug('Disconnected from socket server.');
				disableClock();
			});


			socket.on('enableClock', function(fn) {
				enableClock();

				if (isFunction(fn))
					fn({status:'OK'});
			});

			socket.on('disableClock', function(fn) {
				disableClock();

				if (isFunction(fn))
					fn({status:'OK'});
			});


			socket.on('colorize', function(options, fn) {
				disableClock();

				strip.colorize(options).then(function(reply) {
					socket.emit('color-changed', options);

					if (isFunction(fn))
						fn({status:'OK', reply:reply});
				})

				.catch(function(error) {
					console.error(error);

					if (isFunction(fn))
						fn({error: error.message});
				});
			})

		});


	}


	module.exports.command  = 'server [options]';
	module.exports.describe = 'Run Neopixel lamp server';
	module.exports.builder  = defineArgs;
	module.exports.handler  = run;

};
