from machine import ADC, Pin

class GL5516:
    def __init__(self, analog_pin: int):

        self._analog_pin = ADC(Pin(analog_pin))
        self.min_light = 0
        self.max_light = 0

    def read_light_intensity(self):
        adc_value = self._analog_pin.read_u16()
        voltage = self._analog_pin.read_u16() * 3.3 / 65535
        return round(voltage, 2), adc_value

    def set_min_light(self):
        adc_value = self._analog_pin.read_u16()
        self.min_light = adc_value
        return adc_value

    def set_max_light(self):
        adc_value = self._analog_pin.read_u16()
        self.max_light = adc_value
        return adc_value

    def get_calibrated_light(self):

        adc_value = self._analog_pin.read_u16()
        if self.max_light == self.min_light:
            return 0.0
        light_level = (adc_value - self.min_light) / (self.max_light - self.min_light) * 100
        light_level = max(0.0, min(100.0, light_level))
        return light_level
