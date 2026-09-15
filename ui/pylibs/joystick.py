

from machine import ADC, Timer, Pin

import micropython


class Joystick:

    conversion_factor = 3.3 / (65535)

    def __init__(self, vrx_pin: int, vry_pin: int, vsw_pin: int = None, freq: int = 100, callback: callable[[tuple], None] = None) -> None:

        self.adc_x = ADC(vrx_pin)
        self.adc_y = ADC(vry_pin)

        if vsw_pin is not None:
            self.sw = Pin(vsw_pin, Pin.IN, Pin.PULL_UP)

        self.timer = Timer(-1)
        self.freq = freq

        self.x_value = 0
        self.y_value = 0
        self.sw_value = 1

        self.callback = callback

        self.filter_alpha = 0.2

        self.filtered_x = 1.55

        self.filtered_y = 1.55

    def start(self) -> None:
        self.timer.init(period=int(1000/self.freq),
                        mode=Timer.PERIODIC, callback=self._timer_callback)

    def _timer_callback(self, timer: Timer) -> None:

        raw_x = self.adc_x.read_u16() * Joystick.conversion_factor
        raw_y = self.adc_y.read_u16() * Joystick.conversion_factor

        self.filtered_x = self.filter_alpha * raw_x + \
            (1 - self.filter_alpha) * self.filtered_x
        self.filtered_y = self.filter_alpha * raw_y + \
            (1 - self.filter_alpha) * self.filtered_y

        self.x_value = self.filtered_x
        self.y_value = self.filtered_y

        if hasattr(self, 'sw'):
            self.sw_value = self.sw.value()

        if self.callback is not None:
            micropython.schedule(
                self.callback, (self.x_value, self.y_value, self.sw_value))

    def stop(self) -> None:
        self.timer.deinit()

    def get_values(self) -> tuple:
        return self.x_value, self.y_value, self.sw_value
