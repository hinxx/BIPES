

import time


from micropython import const
import micropython


from machine import Pin


class ADS1115:

    REGISTER_CONVERT = const(0x00)

    REGISTER_CONFIG = const(0x01)

    REGISTER_LOWTHRESH = const(0x02)

    REGISTER_HITHRESH = const(0x03)

    OS_MASK = const(0x8000)

    OS_SINGLE = const(0x8000)

    OS_BUSY = const(0x0000)

    OS_NOTBUSY = const(0x8000)

    MUX_MASK = const(0x7000)

    MUX_DIFF_0_1 = const(0x0000)

    MUX_DIFF_0_3 = const(0x1000)

    MUX_DIFF_1_3 = const(0x2000)

    MUX_DIFF_2_3 = const(0x3000)

    MUX_SINGLE_0 = const(0x4000)

    MUX_SINGLE_1 = const(0x5000)

    MUX_SINGLE_2 = const(0x6000)

    MUX_SINGLE_3 = const(0x7000)

    PGA_MASK = const(0x0E00)

    PGA_6_144V = const(0x0000)

    PGA_4_096V = const(0x0200)

    PGA_2_048V = const(0x0400)

    PGA_1_024V = const(0x0600)

    PGA_0_512V = const(0x0800)

    PGA_0_256V = const(0x0A00)

    MODE_MASK = const(0x0100)

    MODE_CONTIN = const(0x0000)

    MODE_SINGLE = const(0x0100)

    DR_MASK = const(0x00E0)

    DR_8SPS = const(0x0000)

    DR_16SPS = const(0x0020)

    DR_32SPS = const(0x0040)

    DR_64SPS = const(0x0060)

    DR_128SPS = const(0x0080)

    DR_250SPS = const(0x00A0)

    DR_475SPS = const(0x00C0)

    DR_860SPS = const(0x00E0)

    CMODE_MASK = const(0x0010)

    CMODE_TRAD = const(0x0000)

    CMODE_WINDOW = const(0x0010)

    CPOL_MASK = const(0x0008)

    CPOL_ACTVLOW = const(0x0000)

    CPOL_ACTVHI = const(0x0008)

    CLAT_MASK = const(0x0004)

    CLAT_NONLAT = const(0x0000)

    CLAT_LATCH = const(0x0004)

    CQUE_MASK = const(0x0003)

    CQUE_1CONV = const(0x0000)

    CQUE_2CONV = const(0x0001)

    CQUE_4CONV = const(0x0002)

    CQUE_NONE = const(0x0003)

    GAINS = (

        PGA_6_144V,

        PGA_4_096V,

        PGA_2_048V,

        PGA_1_024V,

        PGA_0_512V,

        PGA_0_256V,
    )

    GAINS_V = (

        6.144,

        4.096,

        2.048,

        1.024,

        0.512,

        0.256,
    )

    CHANNELS = {
        (0, None): MUX_SINGLE_0,
        (1, None): MUX_SINGLE_1,
        (2, None): MUX_SINGLE_2,
        (3, None): MUX_SINGLE_3,
        (0, 1): MUX_DIFF_0_1,
        (0, 3): MUX_DIFF_0_3,
        (1, 3): MUX_DIFF_1_3,
        (2, 3): MUX_DIFF_2_3,
    }

    RATES = (

        DR_8SPS,

        DR_16SPS,

        DR_32SPS,

        DR_64SPS,

        DR_128SPS,

        DR_250SPS,

        DR_475SPS,

        DR_860SPS,
    )

    def __init__(self, i2c, address=0x48, gain=2, alert_pin=None, callback=None):

        if not 0x48 <= address <= 0x4B:
            raise ValueError("Invalid I2C address: 0x{:02X}".format(address))

        if gain not in (2 / 3, 1, 2, 4, 8, 16):
            raise ValueError("Invalid gain: {}".format(gain))

        self.i2c = i2c

        self.address = address

        try:
            self.gain_index = ADS1115.GAINS.index(
                self._get_gain_register_value(gain))
        except ValueError:
            raise ValueError("Gain setting not found in GAINS tuple.")

        self.temp2 = bytearray(2)

        if alert_pin is not None:

            self.alert_pin = Pin(alert_pin, Pin.IN)

            self.callback = callback

            self.alert_trigger = Pin.IRQ_FALLING

            self.alert_pin.irq(handler=lambda p: self._irq_handler(
                p), trigger=self.alert_trigger)

    def _get_gain_register_value(self, gain):
        gain_map = {2 / 3: ADS1115.GAINS[0], 1: ADS1115.GAINS[1], 2: ADS1115.GAINS[2],
                    4: ADS1115.GAINS[3], 8: ADS1115.GAINS[4], 16: ADS1115.GAINS[5]}
        return gain_map[gain]

    def _irq_handler(self, pin):
        if hasattr(self, "callback") and self.callback:
            micropython.schedule(self.callback, pin)

    def _write_register(self, register, value):

        self.temp2[0] = (value >> 8) & 0xFF

        self.temp2[1] = value & 0xFF

        self.i2c.writeto_mem(self.address, register, self.temp2)

    def _read_register(self, register):

        self.i2c.readfrom_mem_into(self.address, register, self.temp2)

        return (self.temp2[0] << 8) | self.temp2[1]

    def raw_to_v(self, raw):

        v_p_b = ADS1115.GAINS_V[self.gain_index] / 32768

        return raw * v_p_b

    def set_conv(self, rate=4, channel1=0, channel2=None):

        if rate not in range(len(ADS1115.RATES)):
            raise ValueError("Invalid rate: {}".format(rate))

        if channel1 not in range(4) or (channel2 is not None and channel2 not in range(4)):
            raise ValueError("Invalid channel: {}".format(channel1))

        self.mode = (
            ADS1115.CQUE_NONE
            | ADS1115.CLAT_NONLAT
            | ADS1115.CPOL_ACTVLOW
            | ADS1115.CMODE_TRAD
            | ADS1115.RATES[rate]
            | ADS1115.MODE_SINGLE
            | ADS1115.OS_SINGLE
            | ADS1115.GAINS[self.gain_index]
            | ADS1115.CHANNELS.get((channel1, channel2), ADS1115.MUX_SINGLE_0)
        )

    def read(self, rate=4, channel1=0, channel2=None):

        if rate not in range(len(ADS1115.RATES)):
            raise ValueError("Invalid rate: {}".format(rate))

        if channel1 not in range(4) or (channel2 is not None and channel2 not in range(4)):
            raise ValueError("Invalid channel: {}".format(channel1))

        self._write_register(
            ADS1115.REGISTER_CONFIG,
            (
                ADS1115.CQUE_NONE
                | ADS1115.CLAT_NONLAT
                | ADS1115.CPOL_ACTVLOW
                | ADS1115.CMODE_TRAD
                | ADS1115.RATES[rate]
                | ADS1115.MODE_SINGLE
                | ADS1115.OS_SINGLE
                | ADS1115.GAINS[self.gain_index]
                | ADS1115.CHANNELS.get((channel1, channel2), ADS1115.MUX_SINGLE_0)
            ),
        )

        while not (self._read_register(ADS1115.REGISTER_CONFIG) & ADS1115.OS_NOTBUSY):

            time.sleep_ms(1)

        res = self._read_register(ADS1115.REGISTER_CONVERT)

        return res if res < 32768 else res - 65536

    def read_rev(self):

        res = self._read_register(ADS1115.REGISTER_CONVERT)

        self._write_register(ADS1115.REGISTER_CONFIG, self.mode)

        return res if res < 32768 else res - 65536

    def alert_start(self, rate=4, channel1=0, channel2=None, threshold_high=0x4000, threshold_low=0, latched=False):

        if rate not in range(len(ADS1115.RATES)):
            raise ValueError("Invalid rate: {}".format(rate))

        if channel1 not in range(4) or (channel2 is not None and channel2 not in range(4)):
            raise ValueError("Invalid channel: {}".format(channel1))

        if threshold_high < threshold_low:
            raise ValueError("Invalid threshold: {} > {}".format(
                threshold_high, threshold_low))

        self._write_register(ADS1115.REGISTER_LOWTHRESH, threshold_low)

        self._write_register(ADS1115.REGISTER_HITHRESH, threshold_high)

        self._write_register(
            ADS1115.REGISTER_CONFIG,
            (
                ADS1115.CQUE_1CONV
                | (ADS1115.CLAT_LATCH if latched else ADS1115.CLAT_NONLAT)
                | ADS1115.CPOL_ACTVLOW
                | ADS1115.CMODE_TRAD
                | ADS1115.RATES[rate]
                | ADS1115.MODE_CONTIN
                | ADS1115.GAINS[self.gain_index]
                | ADS1115.CHANNELS.get((channel1, channel2), ADS1115.MUX_SINGLE_0)
            ),
        )

    def conversion_start(self, rate=4, channel1=0, channel2=None):

        if rate not in range(len(ADS1115.RATES)):
            raise ValueError("Invalid rate: {}".format(rate))

        if channel1 not in range(4) or (channel2 is not None and channel2 not in range(4)):
            raise ValueError("Invalid channel: {}".format(channel1))

        self._write_register(ADS1115.REGISTER_LOWTHRESH, 0)

        self._write_register(ADS1115.REGISTER_HITHRESH, 0x8000)

        self._write_register(
            ADS1115.REGISTER_CONFIG,
            (
                ADS1115.CQUE_1CONV
                | ADS1115.CLAT_NONLAT
                | ADS1115.CPOL_ACTVLOW
                | ADS1115.CMODE_TRAD
                | ADS1115.RATES[rate]
                | ADS1115.MODE_CONTIN
                | ADS1115.GAINS[self.gain_index]
                | ADS1115.CHANNELS.get((channel1, channel2), ADS1115.MUX_SINGLE_0)
            ),
        )

    def alert_read(self):

        res = self._read_register(ADS1115.REGISTER_CONVERT)

        return res if res < 32768 else res - 65536
