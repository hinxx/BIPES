import micropython
import time
from machine import Pin

class VibrationSensor:

    def __init__(self, pin: Pin, callback: callable = None, debounce_ms: int = 50) -> None:
        self._pin = pin
        self._callback = callback
        self._debounce_ms = debounce_ms
        self._last_trigger = 0
        self._last_state = False
        self._irq = None

    def init(self) -> None:
        self._pin.init(Pin.IN)
        if self._callback:
            self._irq = self._pin.irq(trigger=Pin.IRQ_RISING | Pin.IRQ_FALLING,
                                      handler=self._irq_handler)

    def deinit(self) -> None:
        if self._irq:
            self._pin.irq(handler=None)
            self._irq = None

    def read(self) -> bool:
        state = bool(self._pin.value())
        self._last_state = state
        return state

    def _irq_handler(self, pin: Pin) -> None:
        now = time.ticks_ms()
        if time.ticks_diff(now, self._last_trigger) > self._debounce_ms:
            self._last_trigger = now
            self._last_state = bool(pin.value())
            if self._callback:
                micropython.schedule(self._scheduled_callback, 0)

    def _scheduled_callback(self, arg: int) -> None:
        if self._callback:
            self._callback()

    def get_status(self) -> dict:
        return {
            "last_state": self._last_state,
            "debounce_ms": self._debounce_ms,
            "callback_set": self._callback is not None
        }
