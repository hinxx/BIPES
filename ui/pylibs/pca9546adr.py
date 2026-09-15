

from micropython import const


class PCA9546ADR:

    MAX_CH = const(4)

    def __init__(self, i2c, addr7=0x70):
        self.i2c = i2c
        self.addr = addr7
        self._current_mask = 0x00

    def write_ctl(self, ctl_byte):
        ctl = int(ctl_byte) & 0x0F
        try:
            self.i2c.writeto(self.addr, bytearray([ctl]))
        except OSError as e:

            raise
        else:

            self._current_mask = ctl

    def select_channel(self, ch):
        if ch < 0 or ch >= self.MAX_CH:
            raise ValueError("Invalid channel")
        self.write_ctl(1 << ch)

    def disable_all(self):
        self.write_ctl(0x00)

    def read_status(self):
        try:
            b = self.i2c.readfrom(self.addr, 1)
        except OSError as e:

            raise
        else:
            status = b[0] & 0x0F
            self._current_mask = status
            return status

    def current_mask(self):
        return self._current_mask
