

import time

from machine import SoftI2C, Pin


class JEDMGasMeas:

    READ_CMD: int = 0xA1

    CALIBRATE_CMD: int = 0x32

    MAX_I2C_FREQ: int = 100000

    CALIB_MIN: int = 0

    CALIB_MAX: int = 65535

    def __init__(self, i2c: SoftI2C, addr: int = 0x2A) -> None:

        self.i2c: SoftI2C = i2c

        self._addr_7bit: int = addr

    def read_concentration(self) -> int:

        try:

            ack_count = self.i2c.writeto(
                self._addr_7bit, bytes([JEDMGasMeas.READ_CMD]), False)
            if ack_count != 1:
                raise OSError("No ACK for read command")

            data = self.i2c.readfrom(self._addr_7bit, 2)
            if len(data) != 2:
                raise OSError("Incomplete data received")

            concentration = (data[0] << 8) | data[1]
            return concentration
        except OSError as e:
            print(f"Failed to read concentration: {str(e)}")
            return 0

    def calibrate_zero(self, calib_value: int | None = None) -> bool:

        if calib_value is None:
            calib_value = self.read_concentration()

        if calib_value > JEDMGasMeas.CALIB_MAX or calib_value < JEDMGasMeas.CALIB_MIN:
            raise ValueError("Calibration value must be between 0 and 65535")

        high_byte: int = (calib_value >> 8) & 0xFF
        low_byte: int = calib_value & 0xFF

        try:

            ack_count = self.i2c.writeto(
                self._addr_7bit,
                bytes([JEDMGasMeas.CALIBRATE_CMD, high_byte, low_byte])
            )

            if ack_count != 1:
                raise OSError("No ACK for calibrate command or data")

            post_calib_value = self.read_concentration()
            if post_calib_value != 0:
                print(
                    f"Calibration confirmation failed: Read value {post_calib_value} is not 0")
                return False

            return True

        except OSError as e:
            print(f"Failed to calibrate zero: {str(e)}")
            return False
