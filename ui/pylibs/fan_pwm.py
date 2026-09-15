

from machine import Pin, PWM


class FanPWM:

    def __init__(self, pin: int, pwm_freq: int = 25000) -> None:
        self._pin = Pin(pin, Pin.OUT)
        self._pwm = PWM(self._pin)
        self._pwm.freq(pwm_freq)
        self._duty = 0
        self._pwm.duty_u16(0)

    def on(self) -> None:
        self.set_speed(1023)

    def off(self) -> None:
        self.set_speed(0)

    def set_speed(self, duty: int) -> None:
        duty = max(0, min(1023, duty))
        self._duty = duty
        self._pwm.duty_u16(int(duty / 1023 * 65535))

    def get_speed(self) -> int:
        return self._duty

    @property
    def digital(self) -> "Pin":
        return self._pin

    @property
    def pwm(self) -> "PWM":
        return self._pwm
