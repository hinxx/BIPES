

import time
from machine import ADC


class GUVA_S12SD:

    def __init__(self, analog_pin: int) -> None:
        try:
            self._adc = ADC(analog_pin)
        except Exception as e:
            raise ValueError(
                f"Failed to initialize ADC on pin {analog_pin}: {e}")

    def read(self) -> float:
        total = 0
        for _ in range(10):
            total += self._adc.read_u16()
            time.sleep(0.005)
        avg = total / 10
        voltage = (avg / 65535) * 3.3
        return voltage

    def get_uv_index(self) -> float:
        mV = self.read() * 1000

        if mV < 227:
            return 0
        elif 227 <= mV < 318:
            return 1
        elif 318 <= mV < 408:
            return 2
        elif 408 <= mV < 503:
            return 3
        elif 503 <= mV < 606:
            return 4
        elif 606 <= mV < 696:
            return 5
        elif 696 <= mV < 795:
            return 6
        elif 795 <= mV < 881:
            return 7
        elif 881 <= mV < 976:
            return 8
        elif 976 <= mV < 1079:
            return 9
        elif 1079 <= mV < 1170:
            return 10
        else:
            return 11

    @property
    def voltage(self) -> float:
        return self.read()

    @property
    def uvi(self) -> float:
        return self.get_uv_index()
