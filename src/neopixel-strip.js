var I2C = require('i2c-bus');


module.exports = function NeopixelStrip(options) {

	const ACK = 6;
	const NAK = 21;

	const CMD_INITIALIZE    = 0x10;
	const CMD_SET_TO_COLOR  = 0x11;
	const CMD_FADE_TO_COLOR = 0x12;
	const CMD_WIPE_TO_COLOR = 0x13;

	var _this          = this;         // That
	var _debug         = 1;            // Output log messages to console?
	var _timeout       = 10000;        // Read/write timeout in ms
	var _retryInterval = 300;          // Milliseconds to wait before retrying read/write

	var _length        = options.length == undefined ? 32 : options.length;            // Length of Neopixels
	var _segments      = options.segments == undefined ? 1 : options.segments;
	var _address       = options.address == undefined ? 0x26 : options.address;
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




	_this.setColor = function(options) {

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


		var red    = options.red     == undefined ? 0 : options.red;
		var green  = options.green   == undefined ? 0 : options.green;
		var blue   = options.blue    == undefined ? 0 : options.blue;
		var length = options.segment == undefined ? _length : _segmentLength;
		var offset = options.segment == undefined ? 0 : options.segment * _segmentLength;
		var delay  = options.delay   == undefined ? 300 : options.delay;

		return _this.send([CMD_WIPE_TO_COLOR, offset, length, red, green, blue, delay]);
	}

	_this.fadeToColor = function(options) {

		debug('Fading to color', options);

		var red    = options.red     == undefined ? 0 : options.red;
		var green  = options.green   == undefined ? 0 : options.green;
		var blue   = options.blue    == undefined ? 0 : options.blue;
		var length = options.segment == undefined ? _length : _segmentLength;
		var offset = options.segment == undefined ? 0 : options.segment * _segmentLength;
		var delay  = options.delay   == undefined ? 300 : options.delay;

		return _this.send([CMD_FADE_TO_COLOR, offset, length, red, green, blue, (delay >> 8) & 0xFF, delay & 0xFF]);
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



};
