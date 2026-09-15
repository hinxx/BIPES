

from machine import Pin, PWM
import time


class OptoMosSimple:

    def __init__(self, pwm: "PWM", pwm_max: int = 65535, inverted: bool = False) -> None:
        if pwm is None:
            raise ValueError("PWM object must be provided")
        self.pwm = pwm
        self.pwm_max = pwm_max
        self.inverted = inverted
        self._duty = 0

    def init(self) -> None:
        self.set_duty(0)

    def set_duty(self, duty: int) -> None:

        duty = max(0, min(duty, self.pwm_max))
        if self.inverted:

            duty = self.pwm_max - duty
        self._duty = duty
        self.pwm.duty_u16(duty)

    def set_percent(self, percent: float) -> None:
        percent = max(0.0, min(percent, 100.0))
        duty = int(percent / 100.0 * self.pwm_max)
        self.set_duty(duty)

    def full_on(self) -> None:
        self.set_duty(self.pwm_max)

    def off(self) -> None:
        self.set_duty(0)

    def get_status(self) -> dict:
        percent = (self._duty / self.pwm_max) * 100.0
        return {
            "duty": self._duty,
            "percent": percent,
            "pwm_max": self.pwm_max,
            "inverted": self.inverted,
        }

    def deinit(self) -> None:
        try:
            self.pwm.deinit()
        except AttributeError:
            self.set_duty(0)
