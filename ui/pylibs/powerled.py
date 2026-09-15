

from machine import Pin, PWM
import time


class PowerLED:

    def __init__(self, pin: int, pwm_freq: int = 1000) -> None:
        if pwm_freq <= 0 or pwm_freq > 1000:
            raise ValueError("PWM frequency out of range (1-1000 Hz)")

        if not isinstance(pin, int):
            raise ValueError("Pin must be an integer")

        self._pin = Pin(pin, Pin.OUT)
        self._pwm_freq = pwm_freq
        self._pwm = PWM(self._pin)
        self._pwm.freq(self._pwm_freq)
        self._state = False
        self._pwm.duty_u16(0)

    def on(self) -> None:
        try:
            self._pwm.duty_u16(65535)
            self._state = True
        except Exception as e:
            raise RuntimeError("Failed to turn LED on") from e

    def off(self) -> None:
        try:
            self._pwm.duty_u16(0)
            self._state = False
        except Exception as e:
            raise RuntimeError("Failed to turn LED off") from e

    def toggle(self) -> None:
        if self._state:
            self.off()
        else:
            self.on()

    def set_brightness(self, duty: int) -> None:
        if duty < 0 or duty > 1023:
            raise ValueError("Duty must be 0-1023")
        try:
            duty16 = int(duty * 65535 / 1023)
            self._pwm.duty_u16(duty16)
            self._state = duty > 0
        except Exception as e:
            raise RuntimeError("Failed to set LED brightness") from e

    def get_state(self) -> bool:
        return self._state

    @property
    def digital(self) -> Pin:
        return self._pin

    @property
    def pwm(self) -> PWM:
        return self._pwm
