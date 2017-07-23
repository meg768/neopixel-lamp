#ifndef __INDICATORS_H
#define __INDICATORS_H

#include "blinker.h"

class Indicators {

    public:
        Indicators() {
            #ifdef __AVR_ATtiny85__
				_heartbeat.setPin(3);
				//_error.setPin(-1);
                _busy.setPin(4);
            #else
				_heartbeat.setPin(13);
                _error.setPin(12);
	            _busy.setPin(11);

            #endif

        }

        ~Indicators() {
        }


        inline begin() {
            _heartbeat.blink(2, 100);
            _error.blink(2, 100);
            _busy.blink(2, 100);
        }

		inline void busy(int state) {
			_busy.setState(state);
		}

		inline void error(int value) {
            if (value > 0)
    			_error.blink(value, 200);
		}

		inline void heartbeat() {
			_heartbeat.toggleState();
		}

    private:
		Blinker _heartbeat, _error, _busy, debug1, _;

};

#endif
