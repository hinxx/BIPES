

from machine import Pin
import time
import micropython


class PIRSensor:

    def __init__(self, pin: int, callback: callable = None) -> None:

        self._pin = Pin(pin, Pin.IN)

        self._user_callback = callback

        self._irq_handler = None

        self._motion_detected = False

        if callback:

            self.enable()

    @property
    def pin(self) -> Pin:
        return self._pin

    def is_motion_detected(self) -> bool:
        return self._pin.value() == 1

    def set_callback(self, callback: callable) -> None:
        self._user_callback = callback
        if callback:

            self.enable()
        else:

            self.disable()

    def _internal_irq_handler(self, pin) -> None:
        self._motion_detected = True
        if self._user_callback:
            micropython.schedule(self._execute_callback, 0)

    def _execute_callback(self, arg: int) -> None:
        if self._user_callback:
            self._user_callback()

    def enable(self) -> None:
        if not self._irq_handler:
            self._irq_handler = self._pin.irq(trigger=Pin.IRQ_RISING,
                                              handler=self._internal_irq_handler)

    def disable(self) -> None:
        if self._irq_handler:
            self._irq_handler.disable()
            self._irq_handler = None

    def wait_for_motion(self, timeout: int = None) -> bool:
        start = time.ticks_ms()
        while True:
            if self.is_motion_detected():
                return True
            if timeout is not None:
                elapsed = time.ticks_diff(time.ticks_ms(), start)
                if elapsed >= timeout:
                    return False

            time.sleep_ms(10)

    def debug(self) -> None:
        pin_val = self._pin.value()
        print(
            f"[DEBUG] PIR Pin: {self._pin}, Value: {pin_val}, Motion Detected: {self.is_motion_detesct()}")
