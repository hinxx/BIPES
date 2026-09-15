

from machine import Pin, PWM
import time


class LMSpeaker:
    def __init__(self, pin: int, freq: int = 1000):
        self.pin = Pin(pin)
        self.freq = freq
        self._pwm = None
        self._init_pwm()

    def _init_pwm(self):
        self._pwm = PWM(self.pin)
        self._pwm.freq(self.freq)
        self._pwm.duty_u16(0)

    def play_tone(self, frequency: int, duration: float):

        self._pwm.freq(frequency)
        self._pwm.duty_u16(32768)
        time.sleep(duration)
        self.stop()

    def play_sequence(self, notes: list[tuple[int, float]]):
        for freq, dur in notes:
            self.play_tone(freq, dur)

            time.sleep(0.05)

    def set_volume(self, percent: int):

        percent = max(1, min(100, percent))

        if hasattr(self._pwm, "duty_u16"):

            duty = int(percent / 100 * 65535)
            self._pwm.duty_u16(duty)
        elif hasattr(self._pwm, "duty"):

            duty = int(percent / 100 * 1023)
            self._pwm.duty(duty)
        else:
            raise RuntimeError("Unsupported PWM driver")

    def stop(self):
        self._pwm.duty_u16(0)
