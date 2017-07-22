#!/usr/bin/env node

var sprintf = require('yow/sprintf');
var isObject = require('yow/is').isObject;
var prefixLogs = require('yow/logs').prefix;
var NeopixelStrip = require('./src/neopixel-strip.js');


var App = function() {

	function debug() {
		console.log.apply(this, arguments);
	}

	function parseArgs() {

		var args = require('yargs');

		args.usage('Usage: $0 [options]');
		args.help('h').alias('h', 'help');

		args.option('url', {alias:'u', describe:'Socket IO url', default:'http://app-o.se'});
		args.option('address', {alias:'a', describe:'I2C bus address', default:0x26});
		args.option('length', {alias:'l', describe:'Neopixel strip length', default:32});
		args.option('segments', {alias:'s', describe:'Number of segments in strip', default:4});

		args.wrap(null);

		args.check(function(argv) {
			return true;
		});

		return args.argv;
	}

	function run(argv) {

		prefixLogs();

		var strip = new NeopixelStrip({length:argv.length, address:argv.address});
		var socket = require('socket.io-client')(argv.url);


		socket.on('connect', function(data) {
			console.log('CONNECT!');

			socket.emit('join', {room:'neopixel-lamp'});

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


	run(parseArgs());
};

module.exports = new App();
