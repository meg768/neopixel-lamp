

var random = require('yow/random');
var logs = require('yow/logs');
var NeopixelStrip = require('../js/neopixel-strip.js');


module.exports.command  = 'lamp';
module.exports.describe = 'Lamp server';

module.exports.builder = function(args) {

	args.wrap(null);
};

module.exports.handler = function(args) {

	try {
		logs.prefix();

		var strip = new NeopixelStrip({length:32, address:0x26});
		
		var socket = require('socket.io-client')('http://app-o.se');

		socket.on('connect', function(data) {
			console.log('CONNECT!');

			socket.emit('join', {room:'lamp'});

			socket.on('fade-to-color', function(data) {

				var red     = parseInt(data.red);
				var green   = parseInt(data.green);
				var blue    = parseInt(data.blue);
				var segment = parseInt(data.segment);
				var time    = data.time == undefined ? 300 : data.time;

				console.log('Fading to color', [red, green, blue], 'segment', segment);

				strip.fadeToColor(red, green, blue, time, segment * 8, 8).then(function() {
				})
				.catch(function(error) {
					console.log(error);
				});

			});

			socket.on('set-to-color', function(data) {

				console.log('Incoming', data);

				var red     = parseInt(data.red);
				var green   = parseInt(data.green);
				var blue    = parseInt(data.blue);
				var segment = parseInt(data.segment);

				console.log('Setting to color', [red, green, blue], 'segment', segment);

				strip.setColor(red, green, blue, segment * 8, 8).then(function() {
				})
				.catch(function(error) {
					console.log(error);
				});

			});
		});



	}
	catch(error) {
		console.log(error.stack);
	}

};
