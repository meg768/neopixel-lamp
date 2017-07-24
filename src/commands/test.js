
var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var isFunction = require('yow/is').isFunction;
var random = require('yow/random');
var config = require('../scripts/config.js');


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

			var socket = require('socket.io-client')(argv.url + '/neopixel-lamp');

			function loop() {
				var options = {};
				options.red = random([0, 128, 256]);
				options.green = random([0, 128, 256]);
				options.blue = random([0, 128, 256]);
				options.segment = random([0, 1, 2, 3, null]);
				options.transition = 'fade';
				options.duration = 1000;
				socket.emit('colorize', options, function(data) {
					console.log('Reply', data);
					setTimeout(loop, data.error ? 5000 : 0);
				});

			}

			socket.on('disconnect', function() {
				console.log('Disconnected!');
				socket.socket.reconnect();
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
