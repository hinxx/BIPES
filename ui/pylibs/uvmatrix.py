

from machine import Pin, PWM


class UVMatrix:

    def __init__(self, pin: int, pwm_freq: int = 1000):
        self._digital = Pin(pin, Pin.OUT)
        self._pwm = PWM(self._digital)
        self._pwm.freq(pwm_freq)
        self._pwm.duty_u16(0)
        self._state = False

    def on(self) -> None:

        self._pwm.duty_u16(32766)
        self._state = True

    def off(self) -> None:
        self._pwm.duty_u16(0)
        self._state = False

    def toggle(self) -> None:
        if self._state:
            self.off()
        else:
            self.on()

    def set_brightness(self, duty: int) -> None:
        if not (0 <= duty <= 512):
            raise ValueError("PWM duty must be 0-512")

        self._pwm.duty_u16(int(duty * 65535 / 1023))

    def get_state(self) -> bool:
        return self._state

    @property
    def digital(self) -> Pin:
        return self._digital

    @property
    def pwm(self) -> PWM:
        return self._pwm
