

from machine import Pin

from micropython import const


POLARITY_CATHODE = const(0)

POLARITY_ANODE = const(1)


def _calculate_output(desired_on: bool, polarity: int) -> int:
    if polarity == POLARITY_CATHODE:
        return 1 if desired_on else 0
    elif polarity == POLARITY_ANODE:
        return 0 if desired_on else 1
    else:
        raise ValueError(f"Invalid polarity: {polarity}")


class PiranhaLED:

    def __init__(self, pin_number: int, polarity: int = POLARITY_CATHODE):

        if polarity not in (POLARITY_CATHODE, POLARITY_ANODE):
            raise ValueError(f"Invalid polarity: {polarity}")

        if pin_number < 0:
            raise ValueError(f"Invalid pin number: {pin_number}")

        self._pin = Pin(pin_number, Pin.OUT)
        self._polarity = polarity

    def on(self) -> None:
        try:
            level = _calculate_output(True, self._polarity)
            self._pin.value(level)
        except Exception as e:
            raise RuntimeError(f"Failed to turn LED on: {e}")

    def off(self) -> None:
        try:
            level = _calculate_output(False, self._polarity)
            self._pin.value(level)
        except Exception as e:
            raise RuntimeError(f"Failed to turn LED off: {e}")

    def toggle(self) -> None:
        try:
            self._pin.value(not self._pin.value())
        except Exception as e:
            raise RuntimeError(f"Failed to toggle LED: {e}")

    def is_on(self) -> bool:
        current_level = self._pin.value()
        return current_level == _calculate_output(True, self._polarity)
