

from machine import Pin
import micropython


class TCR5000:

    def __init__(self, pin: int, *, trigger: int = Pin.IRQ_FALLING | Pin.IRQ_RISING) -> None:
        self._pin = Pin(pin, Pin.IN)
        self._callback = None
        self._irq = self._pin.irq(handler=self._irq_handler, trigger=trigger)

    def read(self) -> int:
        return self._pin.value()

    def set_callback(self, func) -> None:
        if not callable(func):
            raise TypeError("callback must be callable")
        self._callback = func

    def _irq_handler(self, pin: Pin) -> None:
        if self._callback:
            micropython.schedule(self._scheduled_callback, pin.value())

    def _scheduled_callback(self, value: int) -> None:
        if self._callback:
            self._callback(value)

    def deinit(self) -> None:
        if self._irq:
            self._irq.handler(None)
            self._irq = None
        self._callback = None
