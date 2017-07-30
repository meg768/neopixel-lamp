var I2C = require('i2c-bus');
var Color = require('color');

var isString = require('yow/is').isString;


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
	var _timeout       = 10000;        // Read/write timeout in ms
	var _retryInterval = 300;          // Milliseconds to wait before retrying read/write

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

		var red   = 0;
		var green = 0;
		var blue  = 0;

		var length   = options.segment == undefined ? _length : _segmentLength;
		var offset   = options.segment == undefined ? 0 : options.segment * _segmentLength;
		var duration = options.duration == undefined ? 300 : options.duration;

		if (isString(options.color)) {
			try {
				var color = Color(options.color);
				console.log('Color', color);
				red   = color.red();
				green = color.green();
				blue  = color.blue();

			}
			catch(error) {
				Promise.reject(error.message);
			}
		}
		else {
			red = options.red != undefined ? options.red : red;
			green = options.green != undefined ? options.green : green;
			blue = options.blue != undefined ? options.blue : blue;

		}

		if (options.color) {
			red = options.color.red != undefined ? options.color.red : red;
		}

		switch(options.transition) {
			case 'fade': {
				return _this.send([CMD_FADE_TO_COLOR, offset, length, red, green, blue, (duration >> 8) & 0xFF, duration & 0xFF]);
			}
			case 'wipe': {
				return _this.send([CMD_WIPE_TO_COLOR, offset, length, red, green, blue, duration]);
			}
		}

		return _this.send([CMD_SET_TO_COLOR, offset, length, red, green, blue]);
	};

	_this.setToColor = function(options) {

		debug('Setting to color', options);

		var red    = options.red     == undefined ? 0 : options.red;
		var green  = options.green   == undefined ? 0 : options.green;
		var blue   = options.blue    == undefined ? 0 : options.blue;
		var length = options.segment == undefined ? _length : _segmentLength;
		var offset = options.segment == undefined ? 0 : options.segment * _segmentLength;

		return _this.send([CMD_SET_TO_COLOR, offset, length, red, green, blue]);
	}


	_this.wipeToColor = function(options) {

		debug('Wiping to color', options);


		var red      = options.red      == undefined ? 0 : options.red;
		var green    = options.green    == undefined ? 0 : options.green;
		var blue     = options.blue     == undefined ? 0 : options.blue;
		var length   = options.segment  == undefined ? _length : _segmentLength;
		var offset   = options.segment  == undefined ? 0 : options.segment * _segmentLength;
		var duration = options.duration == undefined ? 300 : options.duration;

		return _this.send([CMD_WIPE_TO_COLOR, offset, length, red, green, blue, duration]);
	}

	_this.fadeToColor = function(options) {

		debug('Fading to color', options);

		var red      = options.red      == undefined ? 0 : options.red;
		var green    = options.green    == undefined ? 0 : options.green;
		var blue     = options.blue     == undefined ? 0 : options.blue;
		var length   = options.segment  == undefined ? _length : _segmentLength;
		var offset   = options.segment  == undefined ? 0 : options.segment * _segmentLength;
		var duration = options.duration == undefined ? 300 : options.duration;

		return _this.send([CMD_FADE_TO_COLOR, offset, length, red, green, blue, (duration >> 8) & 0xFF, duration & 0xFF]);
	}


	_this.initialize = function(length) {
		_length = length;
		return _this.send([CMD_INITIALIZE, parseInt(length)]);
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
