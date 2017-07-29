
var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var isFunction = require('yow/is').isFunction;
var random = require('yow/random');
var extend  = require('yow/extend');
var config = require('../scripts/config.js');
var io = require('socket.io-client');

var Module = new function() {

	function debug() {
		console.log.apply(this, arguments);
	}

	function defineArgs(args) {

		args.help('help').alias('help', 'h');
		args.option('url', {alias:'u', describe:'Socket IO url', default:config.service.url});
		args.option('service', {alias:'n', describe:'Service name', default:config.service.name});
		args.wrap(null);


		args.check(function(argv) {
			return true;
		});

	}

	function run(argv) {

		try {

			var socket = io.connect(argv.url + '/neopixel-lamp');
			var bars = [0, 0, 0, 0];
			var index = 0;
			var colorIndex = 0;

			var colors = [
				{red:16, green:0, blue:0},
				{red:0, green:16, blue:0},
				{red:0, green:0, blue:16}
			];

			function loop() {
				var options = {};
				options.segment = index % 4;
				options.transition = 'set';
				options.duration = 1000;
				extend(options, colors[colorIndex % 3]);

				socket.emit('colorize', options, function(data) {
					console.log('Reply', data);
					index = (index + 1) % 4;
					colorIndex = (colorIndex + 1) % 3;
					setTimeout(loop, data.error ? 5000 : 100);
				});

			}

			function loopX() {
				var options = {};
				options.red = random([0, 32]);
				options.green = random([0, 32]);
				options.blue = random([0, 32]);
				options.segment = index % 4;
				options.transition = 'fade';
				options.duration = 1000;
				socket.emit('colorize', options, function(data) {
					console.log('Reply', data);
					index = (index + 1) % 4;
					setTimeout(loop, data.error ? 5000 : 0);
				});

			}

			socket.on('disconnect', function() {
				console.log('Disconnected!');
			});

			socket.on('connect', function(data) {
				debug('Connected to socket server.');

				// Register the service
				//socket.emit('join', argv.service);

				loop();

			});

			socket.on('color-changed', function(data) {

				console.log('color-changed', data);

			});

		}
		catch(error) {
			console.log(error.message);
		}
	}

	module.exports.command  = 'test [options]';
	module.exports.describe = 'Test module';
	module.exports.builder  = defineArgs;
	module.exports.handler  = run;



};
