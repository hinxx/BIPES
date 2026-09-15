

from machine import Pin, ADC


class MAX9814Mic:

    def __init__(self, adc: ADC, gain_pin: Pin = None, shdn_pin: Pin = None) -> None:
        self._adc = adc
        self._gain_pin = gain_pin
        self._shdn_pin = shdn_pin

        if self._gain_pin:
            self._gain_pin.value(0)
            self._high_gain = False
        else:
            self._high_gain = None

        if self._shdn_pin:
            self._shdn_pin.value(1)
            self._enabled = True
        else:
            self._enabled = True

    def read(self) -> int:
        return self._adc.read_u16()

    def read_normalized(self) -> float:
        return self._adc.read_u16() / 65535.0

    def read_voltage(self, vref: float = 3.3) -> float:
        return (self._adc.read_u16() / 65535.0) * vref

    def enable(self) -> None:
        if self._shdn_pin:
            self._shdn_pin.value(1)
            self._enabled = True

    def disable(self) -> None:
        if self._shdn_pin:
            self._shdn_pin.value(0)
            self._enabled = False

    def set_gain(self, high: bool) -> None:
        if self._gain_pin:
            self._gain_pin.value(1 if high else 0)
            self._high_gain = high
        else:
            raise RuntimeError("No gain control pin available")

    def get_state(self) -> dict:
        return {
            'enabled': self._enabled,
            'high_gain': self._high_gain,
            'has_gain_control': self._gain_pin is not None,
            'has_shdn_control': self._shdn_pin is not None,
            'current_reading': self.read(),
            'current_voltage': self.read_voltage()
        }

    def get_average_reading(self, samples: int = 10) -> int:
        if samples <= 0:
            raise ValueError("samples must > 0")
        total = 0
        for _ in range(samples):
            total += self.read()
        return total // samples

    def get_peak_reading(self, samples: int = 100) -> int:
        if samples <= 0:
            raise ValueError("samples must > 0")
        peak = 0
        for _ in range(samples):
            reading = self.read()
            if reading > peak:
                peak = reading
        return peak

    def detect_sound_level(self, threshold: int = 35000, samples: int = 50) -> bool:
        if samples <= 0:
            raise ValueError("samples must > 0")
        for _ in range(samples):
            if self.read() > threshold:
                return True
        return False

    def calibrate_baseline(self, samples: int = 100) -> int:
        if samples <= 0:
            raise ValueError("samples must > 0")
        return self.get_average_reading(samples)
