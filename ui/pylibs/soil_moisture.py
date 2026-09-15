from machine import ADC, Pin

class SoilMoistureSensor:

    def __init__(self, pin: int):

        self.adc = ADC(Pin(pin))
        self.dry_value = None
        self.wet_value = None

    def read_raw(self) -> int:
        return self.adc.read_u16()

    def calibrate_dry(self) -> int:
        self.dry_value = self.read_raw()
        return self.dry_value

    def calibrate_wet(self) -> int:
        self.wet_value = self.read_raw()
        return self.wet_value

    def set_calibration(self, dry: int, wet: int) -> None:
        self.dry_value = dry
        self.wet_value = wet

    def get_calibration(self) -> tuple:
        return (self.dry_value, self.wet_value)

    def read_moisture(self) -> float:
        if self.dry_value is None or self.wet_value is None:
            raise ValueError("Sensor not calibrated")
        raw = self.read_raw()
        
        if self.wet_value > self.dry_value:
            percent = (raw - self.dry_value) * 100.0 / \
                (self.wet_value - self.dry_value)
        else:
            percent = (self.dry_value - raw) * 100.0 / \
                (self.dry_value - self.wet_value)
        return max(0.0, min(100.0, percent))

    def get_level(self) -> str:
        percent = self.read_moisture()
        if percent < 30:
            return "dry"
        elif percent < 70:
            return "moist"
        else:
            return "wet"

    @property
    def is_calibrated(self) -> bool:
        return self.dry_value is not None and self.wet_value is not None

    @property
    def raw(self) -> int:
        return self.read_raw()

    @property
    def moisture(self) -> float:
        return self.read_moisture()

    @property
    def level(self) -> str:
        return self.get_level()
