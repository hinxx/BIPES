

import micropython
import time
from machine import Pin, Timer


class LimitSwitch:

    def __init__(self, pin: int, callback: callable = None, debounce_ms: int = 50):
        self._pin = Pin(pin, Pin.IN, Pin.PULL_UP)
        self._callback = callback
        self._debounce_ms = debounce_ms
        self._timer = Timer(-1)
        self._last_state = self._pin.value()

    def read(self) -> bool:
        return bool(self._pin.value())

    def set_callback(self, callback: callable):
        self._callback = callback

    def enable(self):
        self._timer.init(period=self._debounce_ms,
                         mode=Timer.PERIODIC, callback=self._debounce_handler)

    def disable(self):
        self._timer.deinit()

    def _debounce_handler(self, timer: Timer):
        state = self._pin.value()
        if state != self._last_state:
            self._last_state = state
            if self._callback:
                micropython.schedule(self._scheduled_callback, state)

    def _scheduled_callback(self, state: int):
        self._callback(bool(state))

    @property
    def digital(self) -> Pin:
        return self._pin
