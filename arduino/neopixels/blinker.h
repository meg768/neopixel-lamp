
#ifndef __BLINKER_H
#define __BLINKER_H

class Blinker {

    public:

        Blinker(int pin = -1, int state = LOW) {
            setPin(pin, state);
        }

        ~Blinker() {
        };

        void setPin(int pin, int state = LOW) {
            _pin = pin;
            _state = state ? HIGH : LOW;
 
            if (_pin >= 0) {
                pinMode(pin, OUTPUT);
                digitalWrite(pin, _state);
            }
        }

        int getState() {
            return _state;
        }

        
        void setState(int state) {
            _state = state ? HIGH : LOW;
 
            if (_pin >= 0)
                digitalWrite(_pin, _state);
        }

        void toggleState() {
            setState(!_state);
        }

        void blink(int blinks = 1, int wait = 200) {

            setState(LOW);
            
            for (int i = 0; i < blinks; i++) {
                setState(HIGH);
                delay(wait);
                setState(LOW);
                delay(wait);
            }
        }

    private:
        int _state;
        int _pin;
};

#endif

