

from machine import Pin, I2C

import micropython


class PCF8574:
    def __init__(self, i2c: I2C, address: int = 0x20,
                 int_pin: int = None,
                 callback: callable = None,
                 trigger: int = Pin.IRQ_FALLING) -> None:

        if not isinstance(i2c, I2C):
            raise TypeError("I2C object required.")

        if not 0x20 <= address <= 0x27:
            raise ValueError("I2C address must be between 0x20 and 0x27.")

        self._i2c = i2c
        self._address = address
        self._port = bytearray(1)
        self._callback = callback

        if int_pin is not None and callback is not None:

            if not isinstance(int_pin, int):
                raise TypeError("Pin number required.")

            if not callable(callback):
                raise TypeError("Callback function required.")

            pin = Pin(int_pin, Pin.IN, Pin.PULL_UP)

            def _int_handler(p):

                micropython.schedule(self._scheduled_handler, None)

            self._int_pin = pin

            self._int_pin.irq(trigger=trigger, handler=_int_handler)

    def _scheduled_handler(self, _: None) -> None:

        self._read()

        try:
            self._callback(self.port)
        except Exception as e:

            print("PCF8574 callback error:", e)

    def check(self) -> bool:

        if self._i2c.scan().count(self._address) == 0:
            raise OSError(
                f"PCF8574 not found at I2C address {self._address:#x}")
        return True

    @property
    def port(self) -> int:

        self._read()

        return self._port[0]

    @port.setter
    def port(self, value: int) -> None:

        self._port[0] = value & 0xFF

        self._write()

    def pin(self, pin: int, value: int = None) -> int:

        pin = self._validate_pin(pin)
        if value is None:

            self._read()
            return (self._port[0] >> pin) & 1

        if value:
            self._port[0] |= 1 << pin
        else:
            self._port[0] &= ~(1 << pin)

        self._write()

    def toggle(self, pin: int) -> None:

        pin = self._validate_pin(pin)

        self._port[0] ^= 1 << pin
        self._write()

    def _validate_pin(self, pin: int) -> int:

        if not 0 <= pin <= 7:
            raise ValueError(f"Invalid pin {pin}. Use 0-7.")
        return pin

    def _read(self) -> None:
        self._i2c.readfrom_into(self._address, self._port)

    def _write(self) -> None:
        self._i2c.writeto(self._address, self._port)
