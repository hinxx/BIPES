

import time


from micropython import const


from machine import I2C


class DS3502:

    REG_WIPER = const(0x00)

    REG_CONTROL = const(0x02)

    def __init__(self, i2c: I2C, addr: int):

        if addr < 0x28 or addr > 0x2B:
            raise ValueError("Address must be between 0x28 and 0x2B")

        self.i2c = i2c

        self.addr = addr

        self.mode = 0

    def write_wiper(self, value: int) -> None:

        if value < 0 or value > 127:
            raise ValueError("Value must be between 0 and 127")

        self.i2c.writeto_mem(self.addr, DS3502.REG_WIPER, bytes([value]))

        if self.mode == 0:

            time.sleep_ms(100)

    def read_control_register(self) -> int:

        self.i2c.writeto_mem(self.addr, DS3502.REG_CONTROL, b"")

        data = self.i2c.readfrom_mem(self.addr, DS3502.REG_CONTROL, 1)

        if data[0] == 0x80:
            self.mode = 1

        return self.mode

    def set_mode(self, mode: int) -> None:
        if mode not in (0, 1):
            raise ValueError("Mode must be 0 or 1")

        if mode == 0:

            self.i2c.writeto_mem(self.addr, DS3502.REG_CONTROL, bytes([0x00]))
            self.mode = 0

        else:

            self.i2c.writeto_mem(self.addr, DS3502.REG_CONTROL, bytes([0x80]))
            self.mode = 1

    def read_wiper(self) -> int:

        self.i2c.writeto_mem(self.addr, DS3502.REG_WIPER, b"")

        data = self.i2c.readfrom_mem(self.addr, DS3502.REG_WIPER, 1)

        return data[0]
