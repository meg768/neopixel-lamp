#ifndef __IO_H
#define __IO_H

#ifdef __AVR_ATtiny85__
#include "./libraries/TinyWireS/TinyWireS.h"
#else
#include <Wire.h>
#endif




class I2C {

    public:

         
#ifdef __AVR_ATtiny85__
		static inline void begin(int address) {
			TinyWireS.begin(address);
		};
      

        static void onReceive( void (*function)(uint8_t) ) {
            TinyWireS.onReceive(function);
        };
        
        static void onRequest(  void (*function)()) {
            TinyWireS.onRequest(function);            
        };
		
		static inline int read() {
			return TinyWireS.receive();
		};
      
		static inline void write(uint8_t byte) {
			TinyWireS.send(byte);
		};
      
		static inline int available() {
			return TinyWireS.available();
		};

        static void idle() {
            TinyWireS_stop_check();
        }


#else
		static inline void begin(int address) {
			Wire.begin(address);
		}


        static void onReceive( void (*function)(uint8_t) ) {
            Wire.onReceive(function);
        };
        
        static void onRequest(  void (*function)()) {
            Wire.onRequest(function);            
        };
               
		static inline int read() {
			return Wire.read();
		};
		static inline void write(uint8_t byte) {
			Wire.write(byte);
		}
		static inline int available() {
			return Wire.available();
		}

       static inline void idle() {
       }

       static inline void flush() {
            Wire.flush();
       }

#endif

        static int waitForAvailableByte()
        {
            for (int i = 0; i < 10; i++) {
                if (available()) {
                    return true;
                }

                delay(10);
            }

            return false;
        };

        static int readWord(uint16_t &data) {
            uint8_t high = 0, low = 0;

            if (readByte(high) && readByte(low)) {
                data = high << 8 | low;
                return true;
            }

            return false;
        };

        
        static int readByte(uint8_t &data) {

            if (!waitForAvailableByte())
                return false;

            data = read();

            return true;
        };

       static int readByte(int &data) {

            if (!waitForAvailableByte())
                return false;

            data = read();

            return true;
        };

        static int readRGB(int &red, int &green, int &blue) {
            return readByte(red) && readByte(green) && readByte(blue);
        };





};

#endif
