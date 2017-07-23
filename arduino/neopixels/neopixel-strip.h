#ifdef __AVR__
#include <avr/power.h>
#endif

// IMPORTANT: To reduce NeoPixel burnout risk, add 1000 uF capacitor across
// pixel power leads, add 300 - 500 Ohm resistor on first pixel's data input
// and minimize distance between Arduino and first pixel.  Avoid connecting
// on a live circuit...if you must, connect GND first.

// Parameter 1 = number of pixels in strip
// Parameter 2 = Arduino pin number (most are valid)
// Parameter 3 = pixel type flags, add together as needed:
//   NEO_KHZ800  800 KHz bitstream (most NeoPixel products w/WS2812 LEDs)
//   NEO_KHZ400  400 KHz (classic 'v1' (not v2) FLORA pixels, WS2811 drivers)
//   NEO_GRB     Pixels are wired for GRB bitstream (most NeoPixel products)
//   NEO_RGB     Pixels are wired for RGB bitstream (v1 FLORA pixels, not v2)
//   NEO_RGBW    Pixels are wired for RGBW bitstream (NeoPixel RGBW products)


#include <Adafruit_NeoPixel.h>
#include "memory.h"


class NeopixelStrip : public Adafruit_NeoPixel {

    private:
        typedef struct RGB {
            uint8_t red;
            uint8_t green;
            uint8_t blue;
        };

        // Buffer to hold pixel colors during fading
        Memory _rgb;

    public:

        NeopixelStrip(int length, int pin, int type = NEO_GRB + NEO_KHZ800) : Adafruit_NeoPixel(length, pin, type) {
            _rgb.alloc(length * sizeof(RGB));
        };


        virtual ~NeopixelStrip() {
        };


        void setColor(int index, int length, int red, int green, int blue) {

            int count = numPixels();
            
            if (index + length > count)
                length = count - index;
                
            for (int i = 0; i < length; i++) {
                setPixelColor(index++, red, green, blue);
                
            }

            show();
        }
        
        void setColor(int red, int green, int blue) {
            setColor(0, numPixels(), red, green, blue);    
        }

        void wipeToColor(int index, int length, int red, int green, int blue, int wait) {

            int count = numPixels();
            
            if (index + length > count)
                length = count - index;

            for (int i = 0; i < length; i++) {
                setPixelColor(index++, red, green, blue);
                show();
                delay(wait);
            }
        }

        void wipeToColor(int red, int green, int blue, int wait) {
            wipeToColor(0, numPixels(), red, green, blue, wait);
        }

        void updateLength(int length) {
            Adafruit_NeoPixel::updateLength(length);

            // Set new size of color buffer
            _rgb.alloc(length * sizeof(RGB));
       
        }
        
        void fadeToColor(int offset, int length, int red, int green, int blue, int duration) {

            int count = numPixels();
            
            if (offset + length > count)
                length = count - offset;

            if (length > 0) {
                RGB *rgb = _rgb.bytes();
    
                if (rgb == NULL)
                    return setColor(offset, length, red, green, blue);
    
                for (int i = 0; i < length; i++) {
                    uint32_t color = getPixelColor(i + offset);
                    rgb[i].red   = (int)(uint8_t)(color >> 16);
                    rgb[i].green = (int)(uint8_t)(color >> 8);
                    rgb[i].blue  = (int)(uint8_t)(color);
                }
           

                // Calculate number of steps to be finished in specified time
                long numSteps = (long)((float)duration * 0.2);

                for (long step = 0; step < numSteps; step++) {

                    for (int i = 0; i < length; i++) {
                        int pixelRed   = (long)rgb[i].red   + (step * ((long)red   - (long)rgb[i].red))   / numSteps;
                        int pixelGreen = (long)rgb[i].green + (step * ((long)green - (long)rgb[i].green)) / numSteps;
                        int pixelBlue  = (long)rgb[i].blue  + (step * ((long)blue  - (long)rgb[i].blue))  / numSteps;
    
                        setPixelColor(offset + i, pixelRed, pixelGreen, pixelBlue);
                    }

                    
                    show();

                }
    
                setColor(offset, length, red, green, blue);
            }

                

        }

        void fadeToColor(int red, int green, int blue, int numSteps) {
            fadeToColor(0, numPixels(), red, green, blue, numSteps);
        }
};

