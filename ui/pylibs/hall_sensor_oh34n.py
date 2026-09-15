
import micropython
from machine import Pin


class HallSensorOH34N:

    def __init__(self, pin: int, callback: callable = None) -> None:
        self._pin = Pin(pin, Pin.IN)
        self._callback = callback
        self._irq = None

    def read(self) -> bool:
        return bool(self._pin.value())

    def set_callback(self, callback: callable) -> None:
        self._callback = callback

    def _irq_handler(self, pin: Pin) -> None:
        if self._callback:
            micropython.schedule(self._scheduled_callback, 0)

    def _scheduled_callback(self, arg: int) -> None:
        if self._callback:
            self._callback()

    def enable(self) -> None:
        if self._irq is None:
            self._irq = self._pin.irq(trigger=Pin.IRQ_RISING | Pin.IRQ_FALLING,
                                      handler=self._irq_handler)

    def disable(self) -> None:
        if self._irq:
            self._irq.handler(None)
            self._irq = None

    @property
    def digital(self) -> Pin:
        return self._pin
