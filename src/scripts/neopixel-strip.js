var I2C = require('i2c-bus');
var Color = require('color');

var isString = require('yow/is').isString;
var isObject = require('yow/is').isObject;


module.exports = function NeopixelStrip(options) {

	const ACK = 6;
	const NAK = 21;

	if (options.length == undefined)
		throw new Error('Neopixel strip length not defined');

	if (options.segments == undefined)
		throw new Error('Number of segments not defined');

	if (options.address == undefined)
		throw new Error('I2C address not defined');

	const CMD_INITIALIZE    = 0x10;
	const CMD_SET_TO_COLOR  = 0x11;
	const CMD_FADE_TO_COLOR = 0x12;
	const CMD_WIPE_TO_COLOR = 0x13;
	const CMD_RESET         = 0x14;

	var _this          = this;         // That
	var _debug         = 1;            // Output log messages to console?
	var _timeout       = 30000;        // Read/write timeout in ms
	var _retryInterval = 200;          // Milliseconds to wait before retrying read/write

	var _length        = options.length;
	var _segments      = options.segments;
	var _address       = options.address;
	var _segmentLength = Math.floor(_length / _segments);
	var _wire          = I2C.openSync(1);

	function debug() {
		if (_debug)
			console.log.apply(this, arguments);
	}


	_this.pause = function(ms) {

		return new Promise(function(resolve, reject) {
			setTimeout(resolve, ms);
		});
	}

	_this.reset = function() {

		debug('Resetting...');
		return _this.send([CMD_RESET]);
	}

	_this.colorize = function(options) {

		return new Promise(function(resolve, reject) {
			var red   = 0;
			var green = 0;
			var blue  = 0;

			var length   = options.segment == undefined ? _length : _segmentLength;
			var offset   = options.segment == undefined ? 0 : options.segment * _segmentLength;
			var duration = options.duration == undefined ? 300 : options.duration;

			if (options.color != undefined) {
				var color = options.color;

				if (color.red != undefined && color.green != undefined && color.blue != undefined) {
					red   = color.red;
					green = color.green;
					blue  = color.blue;
				}
				else {
					try {
						// Try to parse color
						var color = Color(color);

						// Convert to rgb
						color = color.rgb();

						red   = color.red();
						green = color.green();
						blue  = color.blue();

					}
					catch(error) {
						return Promise.reject(error);
					}

				}

			}
			else {
				red   = options.red != undefined ? options.red : red;
				green = options.green != undefined ? options.green : green;
				blue  = options.blue != undefined ? options.blue : blue;

			}

			// Round of decimal values, if any
			red    = Math.round(red);
			green  = Math.round(green);
			blue   = Math.round(blue);

			var bytes = [];

			switch(options.transition) {
				case 'fade': {
					bytes = [CMD_FADE_TO_COLOR, offset, length, red, green, blue, (duration >> 8) & 0xFF, duration & 0xFF];
					break;
				}

				case 'wipe': {
					bytes = [CMD_WIPE_TO_COLOR, offset, length, red, green, blue, (duration >> 8) & 0xFF, duration & 0xFF];
					break;
				}

				default: {
					bytes = [CMD_SET_TO_COLOR, offset, length, red, green, blue];
					break;
				}
			}

			var startTime = new Date();

			_this.send(bytes).then(function() {
				var endTime = new Date();
				resolve({offset:offset, length:length, transition: options.transition, duration:duration, color:{red:red, green:green, blue:blue}, time:endTime - startTime});
			})
			.catch(function(error){
				reject(error);
			});

		});
	};

	_this.initialize = function() {
		return _this.send([CMD_INITIALIZE, parseInt(_length)]);
	}

	_this.send = function(bytes, timestamp) {

		if (timestamp == undefined)
			timestamp = new Date();

		return new Promise(function(resolve, reject) {

			_this.write(bytes).then(function() {
				return _this.waitForReply();
			})
			.catch(function(error) {
				var now = new Date();

				if (now.getTime() - timestamp.getTime() < _timeout) {

					return _this.pause(_retryInterval).then(function() {
						debug('send() failed, trying to send again...');
						return _this.send(bytes, timestamp);
					});
				}
				else {
					throw new Error('Device timed out. Could not write to device');

				}
			})
			.then(function() {
				resolve();
			})
			.catch(function(error) {
				reject(error);
			});
		});

	};



	_this.waitForReply = function(timestamp) {

		if (timestamp == undefined)
			timestamp = new Date();

		return new Promise(function(resolve, reject) {

			_this.read(1).then(function(bytes) {
				return Promise.resolve(bytes.length > 0 && bytes[0] == ACK ? ACK : NAK);
			})
			.catch(function(error) {
				// If read failure, assume we got back NAK
				return Promise.resolve(NAK);
			})
			.then(function(status) {
				if (status == ACK) {
					return Promise.resolve();
				}
				else {
					var now = new Date();

					if (now.getTime() - timestamp.getTime() < _timeout) {
						return _this.pause(_retryInterval).then(function() {
							return _this.waitForReply(timestamp);
						})
					}
					else
						throw new Error('Device timed out.');
				}
			})

			.then(function() {
				resolve();
			})
			.catch(function(error) {
				reject(error);
			});

		});

	}


	_this.write = function(data) {
		return new Promise(function(resolve, reject) {
			var buffer = new Buffer(data);

			_wire.i2cWrite(options.address, data.length, buffer, function(error, bytes, buffer) {
				if (error) {
					console.log('write error', error);
					reject(error);

				}
				else {
					resolve();

				}
			});


		});

	}


	_this.read = function(bytes) {
		return new Promise(function(resolve, reject) {
			var buffer = new Buffer(bytes);
			_wire.i2cRead(options.address, bytes, buffer, function(error, bytes, buffer) {
				if (error) {
					console.log('read error', error);
					reject(error)

				}
				else {
					var array = Array.prototype.slice.call(buffer, 0);
					resolve(array);

				}
			});
		});

	}



};
