

import time
from machine import Timer


DEBOUNCE_MS = 20

KEYS_MAP = {
    'UP': 0,
    'DOWN': 3,
    'LEFT': 1,
    'RIGHT': 2,
    'CENTER': 4,
    'SW1': 5,
    'SW2': 7,
}


class PCF8574Keys:

    def __init__(self, pcf: object, keys: dict, callback: callable = None):

        if not hasattr(pcf, "pin"):
            raise TypeError("pcf parameter must have a read(pin) method")
        if not isinstance(keys, dict) or not keys:
            raise ValueError("keys parameter must be a non-empty dictionary")
        if callback is not None and not callable(callback):
            raise TypeError("callback must be callable")

        self._pcf = pcf
        self._keys = keys
        self._callback = callback

        self._state = {k: False for k in keys.keys()}
        self._last_state = self._state.copy()
        self._last_time = {k: 0 for k in keys.keys()}
        self._pcf.port = 0b01000000

        self._timer = Timer(-1)
        self._timer.init(period=10, mode=Timer.PERIODIC,
                         callback=self._scan_keys)

    def led_on(self):
        self._pcf.port = 0b00000000

    def led_off(self):
        self._pcf.port = 0b01000000

    def _scan_keys(self, t):
        now = time.ticks_ms()
        for key_name, pin in self._keys.items():
            try:

                raw = bool(self._pcf.pin(pin))
            except Exception:

                continue

            if raw != self._state[key_name]:
                if time.ticks_diff(now, self._last_time[key_name]) > DEBOUNCE_MS:
                    self._state[key_name] = raw
                    self._last_time[key_name] = now

                    if self._callback and raw != self._last_state[key_name]:
                        try:
                            self._callback(key_name, raw)
                        except Exception:
                            pass
            self._last_state[key_name] = self._state[key_name]

    def read_key(self, key_name: str) -> bool:
        if key_name not in self._keys:
            raise ValueError(f"Unknown button name: {key_name}")
        return self._state[key_name]

    def read_all(self) -> dict:
        return self._state.copy()

    def deinit(self):
        self._timer.deinit()
        self._callback = None
        self._state.clear()
        self._last_state.clear()
        self._last_time.clear()
        self._keys.clear()
        self._pcf = None
