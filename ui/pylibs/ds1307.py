

from micropython import const
from machine import I2C


_DATETIME_REGISTER = const(0x00)
_CONTROL_REGISTER = const(0x07)


class DS1307:

    def __init__(self, i2c_bus: I2C, addr=None):
        if not isinstance(i2c_bus, I2C):
            raise TypeError("i2c_bus must be an instance of machine.I2C")
        if not (0x00 <= addr <= 0x7F):
            raise ValueError("I2C address must be 0x00~0x7F")
        self.i2c = i2c_bus
        self.addr = addr
        self.buf = bytearray(7)
        self.buf1 = bytearray(1)

    @property
    def datetime(self) -> tuple:
        self.i2c.readfrom_mem_into(self.addr, _DATETIME_REGISTER, self.buf)
        hr24 = False if (self.buf[2] & 0x40) else True
        _datetime = (self._bcd2dec(self.buf[6]) + 2000,
                     self._bcd2dec(self.buf[5]),
                     self._bcd2dec(self.buf[4]),
                     self._bcd2dec(self.buf[2]) if hr24 else
                     self._bcd2dec((self.buf[2] & 0x1f))
                     + 12 if (self.buf[2] & 0x20) else 0,
                     self._bcd2dec(self.buf[1]),

                     self._bcd2dec(self.buf[0] & 0x7f),
                     self.buf[3] - 1,
                     None
                     )
        return _datetime

    @datetime.setter
    def datetime(self, datetime: tuple = None):
        if not isinstance(datetime, tuple):
            raise TypeError("datetime must be a tuple")
        if len(datetime) != 7:
            raise ValueError("datetime tuple must have 7 elements")
        self.buf[6] = self._dec2bcd(datetime[0] % 100)
        self.buf[5] = self._dec2bcd(datetime[1])
        self.buf[4] = self._dec2bcd(datetime[2])
        self.buf[2] = self._dec2bcd(datetime[3])
        self.buf[1] = self._dec2bcd(datetime[4])
        self.buf[0] = self._dec2bcd(datetime[5])
        self.buf[3] = self._dec2bcd(datetime[6] + 1)
        self.i2c.writeto_mem(self.addr, _DATETIME_REGISTER, self.buf)

    @property
    def datetimeRTC(self) -> tuple:
        _dt = self.datetime
        return _dt[0:3] + (None,) + _dt[3:6] + (None,)

    @property
    def disable_oscillator(self) -> bool:
        self.i2c.readfrom_mem_into(self.addr, _DATETIME_REGISTER, self.buf1)
        self._disable_oscillator = bool(self.buf1[0] & 0x80)
        return self._disable_oscillator

    @disable_oscillator.setter
    def disable_oscillator(self, value: bool):
        self._disable_oscillator = value
        self.i2c.readfrom_mem_into(self.addr, _DATETIME_REGISTER, self.buf1)

        self.buf1[0] &= 0x7f
        self.buf1[0] |= self._disable_oscillator << 7
        self.i2c.writeto_mem(self.addr, _DATETIME_REGISTER, self.buf1)

    def _bcd2dec(self, bcd) -> int:
        return (bcd >> 4) * 10 + (bcd & 0x0F)

    def _dec2bcd(self, decimal) -> int:
        return ((decimal // 10) << 4) + (decimal % 10)
