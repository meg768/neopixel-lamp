#include "neopixel-strip.h"
#include "i2c.h"
#include "blinker.h"

class App;


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


const int LED_HEARTBEAT = 0;
const int LED_ERROR     = 1;
const int LED_BUSY      = 2;
const int LED_DEBUG_1   = 3;
const int LED_DEBUG_2   = 4;

static App *_app = NULL;


class App {

    public:

        App(int length, int pin) : _strip(length, pin) {

            _app = this;
            _status = ACK;
            _loop = 0;
        }

        void setup() {
            io.onReceive(App::onReceiveService);
            io.onRequest(App::onRequestService);
            io.begin(APP_I2C_ADDRESS);
            
            _leds[LED_HEARTBEAT].setPin(13);
            _leds[LED_ERROR].setPin(12);
            _leds[LED_BUSY].setPin(11);
            _leds[LED_DEBUG_1].setPin(10);
            _leds[LED_DEBUG_2].setPin(9);

            
            for (int i = 0; i < 5; i++) {
                _leds[i].blink();
            }
            
            _strip.begin();
            _strip.setColor(0, 0, 0);
        }

        static void onReceiveService() {
            //_app->onReceive();
        }

        static void onRequestService() {
            _app->onRequest();
        }

        void onReceive() {
            _leds[LED_DEBUG_1].toggleState();
            
            if (io.available()) {
                _leds[LED_BUSY].setState(HIGH);
                _status = NAK;

                int command = 0, error = ERR_INVALID_PARAMETER;

                if (io.readByte(command))
                    error = onCommand(command);

                if (error != ERR_OK)
                    _leds[LED_ERROR].toggleState();

                _status = ACK;
 
                _leds[LED_BUSY].setState(LOW);

            }


        }

        void onRequest() {
            _leds[LED_DEBUG_2].toggleState();
            io.write(_status);
        }


        void loop() {
            io.idle();
            
            _loop++;

            _leds[LED_HEARTBEAT].toggleState();

            onReceive();
            delay(100);

        };


        int onCommand(int command) {

            static unsigned int foo = 0;

            switch (command) {
                case CMD_INITIALIZE: {
                    int length = 0;

                    if (!io.readByte(length))
                        return ERR_PARAMETER_MISSING;

                    if (length < 0 || length > 240)
                        return ERR_INVALID_PARAMETER;
                    
                    _strip.setColor(0, 0, 0);

                    _strip.updateLength(length);
                    _strip.setColor(16, 0, 0);

                    break;
                }

                case CMD_SET_TO_COLOR: {

                    int index = 0, lengthX = 0, red = 0, green = 0, blue = 0;

                    if (!io.readByte(index) || !io.readByte(lengthX) || !io.readRGB(red, green, blue))
                        return ERR_INVALID_PARAMETER;


//                    _strip.setColor(foo * 8, 8, red, green, blue);
  //                  foo = (foo + 1) % 4;
                    _strip.setColor(index, lengthX, red, green, blue);

                    break;
                };

                case CMD_WIPE_TO_COLOR: {

                    int index = 0, length = 0, red = 0, green = 0, blue = 0, delay = 0;

                    if (!io.readByte(index) || !io.readByte(length) || !io.readRGB(red, green, blue))
                        return ERR_INVALID_PARAMETER;

                    if (!io.readByte(delay))
                        return ERR_INVALID_PARAMETER;

                    _strip.wipeToColor(index, length, red, green, blue, delay);

                    break;
                }

                case CMD_FADE_TO_COLOR: {

                    int index = 0, length = 0, red = 0, green = 0, blue = 0;
                    uint16_t speed = 0;
                    
                    if (!io.readByte(index) || !io.readByte(length) || !io.readRGB(red, green, blue))
                        return ERR_INVALID_PARAMETER;

                    if (!io.readWord(speed))
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
        I2C io;
        NeopixelStrip _strip;
        Blinker _leds[5];

        volatile int _status;
        volatile uint32_t _loop;

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
