

from machine import ADC


class Potentiometer:

    def __init__(self, adc: ADC, vref: float = 3.3) -> None:
        self._adc = adc
        self._vref = vref

    def read_raw(self) -> int:
        return self._adc.read_u16()

    def read_voltage(self) -> float:
        raw = self.read_raw()
        return raw / 65535 * self._vref

    def read_ratio(self) -> float:
        raw = self.read_raw()

        min_offset = 65535 * 0.05
        max_offset = 65535 * 0.9

        clamped_raw = max(min_offset, min(raw, max_offset))

        ratio = (clamped_raw - min_offset) / (max_offset - min_offset)
        return max(0.0, min(1.0, ratio))

    def get_state(self) -> dict:
        raw = self.read_raw()
        voltage = self.read_voltage()
        ratio = self.read_ratio()
        return {'raw': raw, 'voltage': voltage, 'ratio': ratio}

    @property
    def adc(self) -> ADC:
        return self._adc

    @property
    def vref(self) -> float:
        return self._vref
