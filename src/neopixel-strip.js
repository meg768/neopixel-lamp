


module.exports = function NeopixelStrip(options) {

	const ACK = 6;
	const NAK = 21;

	const CMD_INITIALIZE    = 0x10;
	const CMD_SET_TO_COLOR  = 0x11;
	const CMD_FADE_TO_COLOR = 0x12;
	const CMD_WIPE_TO_COLOR = 0x13;

	var _this          = this;         // That
	var _wire          = undefined;    // I2C communication
	var _length        = 32;            // Length of Neopixels
	var _debug         = 1;            // Output log messages to console?
	var _timeout       = 10000;        // Read/write timeout in ms
	var _retryInterval = 300;          // Milliseconds to wait before retrying read/write

	function debug() {
		if (_debug)
			console.log.apply(this, arguments);
	}

	_this.segment = function(offset, length) {

		var _strip = _this;

		this.setColor = function(red, green, blue) {
			return _strip.setColor(red, green, blue, offset, length);
		}

		this.fadeToColor = function(red, green, blue, time) {
			return _strip.fadeToColor(red, green, blue, time, offset, length);
		}

		this.wipeToColor = function(red, green, blue, delay) {
			return _strip.wipeToColor(red, green, blue, delay, offset, length);
		}

		this.pause = function(ms) {

			return _strip.pause(ms);
		}

	};



	_this.pause = function(ms) {

		return new Promise(function(resolve, reject) {
			setTimeout(resolve, ms);
		});
	}




	_this.setColor = function(red, green, blue, offset, length) {

		if (offset == undefined)
			offset = 0;

		if (length == undefined)
			length = _length;

		red   = parseInt(red);
		green = parseInt(green);
		blue  = parseInt(blue);

		return _this.send([CMD_SET_TO_COLOR, offset, length, red, green, blue]);
	}


	_this.wipeToColor = function(red, green, blue, delay, offset, length) {

		debug('Wiping to color', [red, green, blue]);

		if (offset == undefined)
			offset = 0;

		if (length == undefined)
			length = _length;

		if (delay == undefined)
			delay = 1;

		red    = parseInt(red);
		green  = parseInt(green);
		blue   = parseInt(blue);
		delay  = parseInt(delay);

		return _this.send([CMD_WIPE_TO_COLOR, offset, length, red, green, blue, delay]);
	}

	_this.fadeToColor = function(red, green, blue, time, offset, length) {

		debug('Fading to color', [red, green, blue]);

		if (offset == undefined)
			offset = 0;

		if (length == undefined)
			length = _length;

		if (time == undefined)
			time = 1000;

		offset = parseInt(offset);
		length = parseInt(length);
		red    = parseInt(red);
		green  = parseInt(green);
		blue   = parseInt(blue);
		time   = parseInt(time);

		return _this.send([CMD_FADE_TO_COLOR, offset, length, red, green, blue, (time >> 8) & 0xFF, time & 0xFF]);
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

			_this.pause(_retryInterval).then(function() {
				return _this.read(1);
			})
			.then(function(bytes) {
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
						return _this.waitForReply(timestamp);
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

	function init() {
        if (options == undefined)
            options = {};

        if (options.address == undefined)
            options.address = 0x26;

		var I2C = require('i2c-bus');

		_wire = I2C.openSync(1);
	}

	init();

};
