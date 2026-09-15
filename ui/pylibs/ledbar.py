

from pcf8574 import PCF8574


class LEDBar:

    def __init__(self, pcf8574: "PCF8574") -> None:
        required_methods = ["check", "pin", "toggle"]
        for method in required_methods:
            if not hasattr(pcf8574, method) or not callable(getattr(pcf8574, method)):
                raise TypeError(f"pcf8574 must implement method: {method}")
        self.pcf = pcf8574
        self.clear()

    def set_led(self, index: int, value: bool) -> None:
        if not 0 <= index <= 7:
            raise ValueError("LED index must be 0~7")
        self.pcf.pin(index, 1 if value else 0)

    def set_all(self, value: int) -> None:
        if not 0 <= value <= 0xFF:
            raise ValueError("value must be between 0 and 255 (0x00–0xFF)")

        self.pcf.port = value & 0xFF

    def display_level(self, level: int) -> None:
        if not 0 <= level <= 8:
            raise ValueError("Level must be 0~8")

        value = (1 << level) - 1 if level > 0 else 0
        self.set_all(value)

    def clear(self) -> None:
        self.set_all(0x00)
