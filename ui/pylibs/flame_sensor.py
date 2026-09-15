

import time
import micropython
from machine import Pin, ADC


class FlameSensor:

    def __init__(self, analog_pin: int, digital_pin: int, callback: callable = None) -> None:
        self._analog_pin = ADC(analog_pin)
        self._digital_pin = Pin(digital_pin, Pin.IN)
        self._callback = callback
        self._irq = None
        self._last_trigger = 0

    def is_flame_detected(self) -> bool:
        return bool(self._digital_pin.value())

    def get_analog_value(self) -> int:
        return self._analog_pin.read_u16()

    def get_voltage(self) -> float:
        return self.get_analog_value() / 65535 * 3.3

    def set_callback(self, callback: callable) -> None:
        self._callback = callback

    def _irq_handler(self, pin: Pin) -> None:

        self._flame_detected = pin.value() == 1

        self._event_flag = True

        if self._callback:
            micropython.schedule(self._scheduled_callback, 0)

    def _scheduled_callback(self, arg: int) -> None:
        if self._callback:
            self._callback()

    def enable(self) -> None:
        if self._irq is None:
            self._irq = self._digital_pin.irq(
                trigger=Pin.IRQ_FALLING, handler=self._irq_handler)

    def disable(self) -> None:
        if self._irq:
            self._digital_pin.irq(handler=None)
            self._irq = None

    def wait_for_flame(self, timeout: int = None) -> bool:
        start = time.time()
        while True:
            if self.is_flame_detected():
                return True
            if timeout and (time.time() - start) > timeout:
                return False
            time.sleep(0.05)

    @property
    def digital(self) -> Pin:
        return self._digital_pin

    @property
    def analog(self) -> ADC:
        return self._analog_pin
