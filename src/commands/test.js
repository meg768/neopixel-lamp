
var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var isFunction = require('yow/is').isFunction;
var random = require('yow/random');


var Module = new function() {

	function debug() {
		console.log.apply(this, arguments);
	}

	function defineArgs(args) {

		args.help('help').alias('help', 'h');

		args.wrap(null);


		args.check(function(argv) {
			return true;
		});

	}

	function run(argv) {

		try {
			console.log(argv);
			var socket = require('socket.io-client')('http://app-o.se');

			function loop() {
				var options = {};
				options.red = random([0, 128, 256]);
				options.green = random([0, 128, 256]);
				options.blue = random([0, 128, 256]);
				options.segment = random([0, 1, 2, 3, null]);
				options.transition = 'fade';
				options.duration = 1000;
					socket.emit('invoke', 'neopixel-lamp', 'colorize', options, function(data) {
					console.log('Reply', data);
					setTimeout(loop, 0);
				});

			}

			socket.on('connect', function(data) {
				debug('Connected to socket server.');

				// Register the service
				socket.emit('join', 'neopixel-lamp');

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
