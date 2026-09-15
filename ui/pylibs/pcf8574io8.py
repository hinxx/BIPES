

from pcf8574 import PCF8574


class PCF8574IO8:

    def __init__(self, pcf: PCF8574, ports_init: dict[int, tuple[int, int]] | None = None):
        if not isinstance(pcf, PCF8574):
            raise TypeError("pcf must be an instance of PCF8574")
        self._pcf = pcf

        self._cache = 0xFF
        self._ports_default = {i: (1, 1) for i in range(4)}

        if ports_init:
            for port, state in ports_init.items():
                self.configure_port(port, state)
        else:
            self.refresh()

    def configure_port(self, port: int, state: tuple[int, int]):
        if port not in range(4):
            raise ValueError("port must be 0..3")
        if len(state) != 2 or any(bit not in (0, 1) for bit in state):
            raise ValueError("state must be (0/1, 0/1)")
        self._ports_default[port] = tuple(state)
        self._update_cache_port(port, state)
        self.refresh()

    def set_port(self, port: int, value: int):
        if port not in range(4):
            raise ValueError("port must be 0..3")
        if not (0 <= value <= 3):
            raise ValueError("value must be 0..3")
        state = (value >> 1 & 1, value & 1)
        self._update_cache_port(port, state)
        self.refresh()

    def get_port(self, port: int) -> int:
        if port not in range(4):
            raise ValueError("port must be 0..3")
        pins = [port * 2, port * 2 + 1]
        saved_state = [self._get_cache_bit(p) for p in pins]

        for p in pins:
            self._set_cache_bit(p, 1)
        self.refresh()
        value = self._pcf.port
        result = ((value >> pins[0]) & 1) << 1 | ((value >> pins[1]) & 1)

        for p, bit in zip(pins, saved_state):
            self._set_cache_bit(p, bit)
        self.refresh()
        return result

    def set_pin(self, pin: int, value: int):
        if pin not in range(8):
            raise ValueError("pin must be 0..7")
        if value not in (0, 1):
            raise ValueError("value must be 0 or 1")
        self._set_cache_bit(pin, value)
        self.refresh()

    def get_pin(self, pin: int) -> int:
        if pin not in range(8):
            raise ValueError("pin must be 0..7")
        saved = self._get_cache_bit(pin)
        self._set_cache_bit(pin, 1)
        self.refresh()
        value = self._pcf.port
        result = (value >> pin) & 1
        self._set_cache_bit(pin, saved)
        self.refresh()
        return result

    def read_all(self) -> int:
        saved = self._cache
        self._cache = 0xFF
        self.refresh()
        value = self._pcf.port
        self._cache = saved
        self.refresh()
        return value

    def write_all(self, byte: int):
        if not (0 <= byte <= 0xFF):
            raise ValueError("byte must be 0..255")
        self._cache = byte
        self.refresh()

    def refresh(self):
        self._pcf.port = self._cache

    def ports_state(self) -> dict[int, tuple[int, int]]:
        return dict(self._ports_default)

    def deinit(self):
        self._pcf = None

    def _update_cache_port(self, port: int, state: tuple[int, int]):
        pins = [port * 2, port * 2 + 1]
        for p, bit in zip(pins, state):
            self._set_cache_bit(p, bit)

    def _set_cache_bit(self, pin: int, value: int):
        if value:
            self._cache |= (1 << pin)
        else:
            self._cache &= ~(1 << pin)

    def _get_cache_bit(self, pin: int) -> int:
        return (self._cache >> pin) & 1
