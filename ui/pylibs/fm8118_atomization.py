

from machine import Pin

import time


class FM8118_Atomization:

    def __init__(self, pin: int):
        self._pin = Pin(pin, Pin.OUT)

        self._state = False

        self._pin.value(1)

    def on(self):

        self._pin.value(0)
        self._state = True

    def off(self):

        self._pin.value(1)

        time.sleep_ms(100)

        self._pin.value(0)

        time.sleep_ms(100)

        self._pin.value(1)
        self._state = False

    def toggle(self):
        if self._state:
            self.off()
        else:
            self.on()

    def is_on(self) -> bool:
        return self._state
