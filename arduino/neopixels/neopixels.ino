#include <Wire.h>

#include "neopixel-strip.h"
#include "blinker.h"

const int APP_I2C_ADDRESS  = 0x26;
const int APP_NEOPIXEL_PIN = 4;
const int APP_STRIP_LENGTH = 32;

const int ACK = 6;
const int NAK = 21;

const int CMD_INITIALIZE    = 0x10;  // size
const int CMD_SET_TO_COLOR  = 0x11;  // red, green, blue
const int CMD_FADE_TO_COLOR = 0x12;  // red, green, blue
const int CMD_WIPE_TO_COLOR = 0x13;  // red, green, blue, delay

const int ERR_OK                = 0;
const int ERR_INVALID_PARAMETER = 1;
const int ERR_PARAMETER_MISSING = 2;
const int ERR_NOT_INITIALIZED   = 3;
const int ERR_INVALID_COMMAND   = 4;

static void *_app = NULL;

class App {

    public:

        App(int length, int pin) : _strip(length, pin) {

            _app          = this;
            _status       = ACK;
            _bufferIndex  = 0;
            _bufferLength = 0;
            _loop         = 0;
            
            memset(_buffer, 0, sizeof(_buffer));
        }


        static void onReceiveService(int bytes) {
            return ((App *)_app)->onReceive(bytes);
        }

        static void onRequestService() {
            return ((App *)_app)->onRequest();
        }
        
        void setup() {
            Wire.onReceive(App::onReceiveService);
            Wire.onRequest(App::onRequestService);
            Wire.begin(APP_I2C_ADDRESS);
            
            _hartBeat.setPin(13);
            _error.setPin(12);
            _busy.setPin(11);
            _debug1.setPin(10);
            _debug2.setPin(9);

            
            _strip.begin();
            _strip.setColor(0, 0, 0);

            _hartBeat.blink(5, 100);
       
        }




        void onReceive(int bytes) {
            _debug1.setState(HIGH);

            // Clear buffer
            memset(_buffer, 0, sizeof(_buffer));

            if (bytes > sizeof(_buffer))
                bytes = sizeof(_buffer);

            // Read all bytes
            for (int i = 0; i < bytes; i++)
                _buffer[i] = Wire.read();

            // Skip the rest if any
            while (Wire.available())
                Wire.read();

            // Reset buffer
            _bufferIndex  = 0;
            _bufferLength = bytes;

            _debug1.setState(LOW);

        }

        void onRequest() {
            _debug2.setState(HIGH);
            Wire.write(_status);
            _debug2.setState(LOW);
        }

        int available() {
            return _bufferLength - _bufferIndex;
        }

        int readByte(int &byte) {
            if (!available())
                return false;
                
            byte = _buffer[_bufferIndex++];

            return true;
        }
       
        int readRGB(int &red, int &green, int &blue) {
            return readByte(red) && readByte(green) && readByte(blue);
        }

        int readWord(uint16_t &data) {
            int high = 0, low = 0;

            if (readByte(high) && readByte(low)) {
                data = high << 8 | low;
                return true;
            }

            return false;
        };     



        void loop() {

            if ((_loop++ % 5000) == 0)
                _hartBeat.toggleState();

            if (available()) {
                _busy.setState(HIGH);
                _status = NAK;

                if (parseRequest() != ERR_OK)
                    _error.blink(2, 50);

                _status = ACK; 
                _busy.setState(LOW);

                _bufferIndex  = 0;
                _bufferLength = 0;
            }

        };


        int parseRequest() {

            int command = 0;
            
            if (!readByte(command))
                return ERR_INVALID_COMMAND;

            switch (command) {
                case CMD_INITIALIZE: {
                    int length = 0;

                    if (!readByte(length))
                        return ERR_PARAMETER_MISSING;

                    if (length < 0 || length > 240)
                        return ERR_INVALID_PARAMETER;
                    
                    _strip.setColor(0, 0, 0);

                    _strip.updateLength(length);

                    break;
                }

                case CMD_SET_TO_COLOR: {

                    int index = 0, lengthX = 0, red = 0, green = 0, blue = 0;

                    if (!readByte(index) || !readByte(lengthX) || !readRGB(red, green, blue))
                        return ERR_INVALID_PARAMETER;

                    _strip.setColor(index, lengthX, red, green, blue);

                    break;
                };

                case CMD_WIPE_TO_COLOR: {

                    int index = 0, length = 0, red = 0, green = 0, blue = 0, delay = 0;

                    if (!readByte(index) || !readByte(length) || !readRGB(red, green, blue))
                        return ERR_INVALID_PARAMETER;

                    if (!readByte(delay))
                        return ERR_INVALID_PARAMETER;

                    _strip.wipeToColor(index, length, red, green, blue, delay);

                    break;
                }

                case CMD_FADE_TO_COLOR: {

                    int index = 0, length = 0, red = 0, green = 0, blue = 0;
                    uint16_t speed = 0;
                    
                    if (!readByte(index) || !readByte(length) || !readRGB(red, green, blue))
                        return ERR_INVALID_PARAMETER;

                    if (!readWord(speed))
                        return ERR_INVALID_PARAMETER;

                    _strip.fadeToColor(index, length, red, green, blue, speed);

                    break;
                }

                default: {
                    return ERR_INVALID_COMMAND;
                }
            };

            return ERR_OK;

        }


    private:
        NeopixelStrip _strip;
        Blinker _hartBeat, _error, _busy, _debug1, _debug2;

        volatile uint8_t _buffer[32]; 
        volatile int _bufferIndex, _bufferLength;
    
        volatile int _status;
        volatile int _loop;

};


static App app(APP_STRIP_LENGTH, APP_NEOPIXEL_PIN);


void setup()
{
    app.setup();
}


void loop()
{
    app.loop();
}
