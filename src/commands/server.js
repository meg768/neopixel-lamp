#!/usr/bin/env node

var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var isFunction = require('yow/is').isFunction;
var prefixLogs = require('yow/logs').prefix;
var config = require('../scripts/config.js');
var io = require('socket.io-client');
var SkyBightness = require('sky-brightness');

/*

class SkyBrightness {

    constuctor(options) {

        this.latitude = options.latitude;
        this.longitude = options.longitude;
        this.time = new Date();
    }

    // Returns an index of sun brightness 0 - 1, 1 - local zenith, 0 - local nadir
    getSolarBrightness() {


        var now = new Date();

        var latitude = 55.7;
        var longitude = 13.1833333;
        var times = suncalc.getTimes(now, latitude, longitude);

        var zenithPosition = suncalc.getPosition(times.solarNoon,  latitude, longitude);
        var nadirPosition  = suncalc.getPosition(times.nadir,  latitude, longitude);
        var thisPosition   = suncalc.getPosition(now, latitude, longitude);

        return (thisPosition.altitude - nadirPosition.altitude) / (zenithPosition.altitude - nadirPosition.altitude);
    }

    getWeatherBrightness() {

        return new Promise(function(resolve, reject) {
            var request = new Request('https://query.yahooapis.com');

            var query = {};
            query.q      = 'select * from weather.forecast where woeid in (select woeid from geo.places(1) where text="Lund, Sweden")'
            query.format = 'json';
            query.env    = 'store://datatables.org/alltableswithkeys';

            request.get('/v1/public/yql', {query:query}).then(function(reply) {
                console.log(reply.body.query.results.channel.item.condition);
                resolve();
            })
            .catch(function(error) {
                reject(error);
            })

        });

    }

    getLunarBrightness() {
        return this.getSolarBrightness();

    }

    getPerceptualBrightness() {
        return this.getSolarBrightness();
    }



}
*/


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

				//timer = setInterval(showClock, 60000);
                timer = setInterval(showClock, 1000);
			}

			function showClock() {


				var sky = new SkyBightness({
					latitude: 55.7,
					longitude: 13.1833333,
					time: new Date()
				});

                sky.getPerceptualBrightness().then(function(brightness) {
                    var now = new Date();
    				var hue = (((now.getHours() % 12) * 60) + now.getMinutes()) / 2;

    				var luminance = brightness * 100;;

    				luminance = Math.min(100, luminance);
    				luminance = Math.max(1, luminance);

    				var options = {};
    				options.transition = 'fade';
    				options.duration   = 100;
    				options.color      = {h:hue, s:100, l:luminance};

    				strip.colorize(options);

                })
                .catch(function(error) {
                    console.log(error);
                })

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
