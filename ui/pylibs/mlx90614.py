

import ustruct
from machine import I2C, Pin


class SensorBase:

    def _read16(self, register: int) -> int:
        data = self.i2c.readfrom_mem(self.address, register, 2)

        return ustruct.unpack('<H', data)[0]

    def _read_temp(self, register: int) -> float:
        temp = self._read16(register)
        temp *= 0.02
        temp -= 273.15
        return temp

    def read_ambient(self) -> float:

        return self._read_temp(self._REGISTER_TA)

    def read_object(self) -> float:
        return self._read_temp(self._REGISTER_TOBJ1)

    def read_object2(self) -> float:
        if self.dual_zone:
            return self._read_temp(self._REGISTER_TOBJ2)
        else:
            raise RuntimeError("Device only has one thermopile")

    @property
    def ambient(self) -> float:
        return self.read_ambient()

    @property
    def object(self) -> float:
        return self.read_object()

    @property
    def object2(self) -> float:
        return self.read_object2()


class MLX90614(SensorBase):

    _REGISTER_TA = 0x06
    _REGISTER_TOBJ1 = 0x07
    _REGISTER_TOBJ2 = 0x08

    def __init__(self, i2c, address: int = None):

        if not isinstance(i2c, I2C):
            raise TypeError(
                f"i2c must be an I2C instance, got {type(i2c).__name__}")
        if not isinstance(address, int):
            raise TypeError(
                f"address must be int, got {type(address).__name__}")
        if not (0x5A <= address <= 0x5D):
            raise ValueError(f"Invalid MLX90615 I2C address: 0x{address:x}")
        self.i2c = i2c
        self.address = address
        _config1 = i2c.readfrom_mem(address, 0x25, 2)
        _dz = ustruct.unpack('<H', _config1)[0] & (1 << 6)
        self.dual_zone = True if _dz else False

    def read(self) -> dict:
        return {
            "ambient": self.read_ambient(),
            "object": self.read_object(),
            "object2": self.read_object2() if self.dual_zone else None,
        }

    def get(self) -> dict:
        return self.read()


class MLX90615(SensorBase):

    def __init__(self, i2c, address: int = None):

        if not isinstance(i2c, I2C):
            raise TypeError(
                f"i2c must be an I2C instance, got {type(i2c).__name__}")

        if not isinstance(address, int):
            raise TypeError(
                f"address must be int, got {type(address).__name__}")

        if not (0x5A <= address <= 0x5D):
            raise ValueError(f"Invalid MLX90615 I2C address: 0x{address:x}")
        self.i2c = i2c
        self.address = address
        self.dual_zone = False
