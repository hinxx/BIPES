

import sys


from micropython import const


class SI5351_I2C:

    SI5351_I2C_ADDRESS_DEFAULT = const(0x60)

    SI5351_CRYSTAL_LOAD_6PF = const(1)
    SI5351_CRYSTAL_LOAD_8PF = const(2)
    SI5351_CRYSTAL_LOAD_10PF = const(3)

    SI5351_CLK_DRIVE_STRENGTH_2MA = const(0)
    SI5351_CLK_DRIVE_STRENGTH_4MA = const(1)
    SI5351_CLK_DRIVE_STRENGTH_6MA = const(2)
    SI5351_CLK_DRIVE_STRENGTH_8MA = const(3)

    SI5351_DIS_STATE_LOW = const(0)
    SI5351_DIS_STATE_HIGH = const(1)
    SI5351_DIS_STATE_HIGH_IMPEDANCE = const(2)
    SI5351_DIS_STATE_NEVER_DISABLED = const(3)
    SI5351_MULTISYNTH_RX_MAX = const(7)
    SI5351_MULTISYNTH_C_MAX = const(1048575)

    SI5351_MULTISYNTH_DIV_MIN = const(8)
    SI5351_MULTISYNTH_DIV_MAX = const(2048)

    SI5351_MULTISYNTH_MUL_MIN = const(15)
    SI5351_MULTISYNTH_MUL_MAX = const(90)

    SI5351_PLL_RESET_A = const(1 << 5)
    SI5351_PLL_RESET_B = const(1 << 7)

    SI5351_CLK_POWERDOWN = const(1 << 7)
    SI5351_CLK_INPUT_MULTISYNTH_N = const(3 << 2)
    SI5351_CLK_INTEGER_MODE = const(1 << 6)
    SI5351_CLK_PLL_SELECT_A = const(0 << 5)
    SI5351_CLK_PLL_SELECT_B = const(1 << 5)
    SI5351_CLK_INVERT = const(1 << 4)

    SI5351_REGISTER_DEVICE_STATUS = const(0)
    SI5351_REGISTER_OUTPUT_ENABLE_CONTROL = const(3)
    SI5351_REGISTER_OEB_ENABLE_CONTROL = const(9)
    SI5351_REGISTER_CLK0_CONTROL = const(16)
    SI5351_REGISTER_DIS_STATE_1 = const(24)
    SI5351_REGISTER_DIS_STATE_2 = const(25)
    SI5351_REGISTER_PLL_A = const(26)
    SI5351_REGISTER_PLL_B = const(34)
    SI5351_REGISTER_MULTISYNTH0_PARAMETERS_1 = const(42)
    SI5351_REGISTER_MULTISYNTH1_PARAMETERS_1 = const(50)
    SI5351_REGISTER_MULTISYNTH2_PARAMETERS_1 = const(58)
    SI5351_REGISTER_CLK0_PHOFF = const(165)
    SI5351_REGISTER_PLL_RESET = const(177)
    SI5351_REGISTER_CRYSTAL_LOAD = const(183)

    def _read_bulk(self, register, nbytes):

        buf = bytearray(nbytes)
        self.i2c.readfrom_mem_into(self.address, register, buf)
        return buf

    def _write_bulk(self, register, values):
        self.i2c.writeto_mem(self.address, register, bytes(values))

    def _read(self, register):
        return self._read_bulk(register, 1)[0]

    def _write(self, register, value):
        self._write_bulk(register, [value])

    def write_config(self, reg, whole, num, denom, rdiv):

        for name, value in zip(["reg", "whole", "num", "denom", "rdiv"], [reg, whole, num, denom, rdiv]):
            if not isinstance(value, int):
                raise TypeError(f"{name} must be an int")

        if not 0 <= reg <= 0xFF:
            raise ValueError("reg must be 0x00..0xFF")
        if not 0 <= whole <= 16383:
            raise ValueError("whole must be 0..16383")
        if denom == 0:
            raise ValueError("denom cannot be 0")
        if not 0 <= rdiv <= 7:
            raise ValueError("rdiv must be 0..7")

        P1 = 128 * whole + int(128.0 * num / denom) - 512
        P2 = 128 * num - denom * int(128.0 * num / denom)
        P3 = denom

        self._write_bulk(
            reg,
            [
                (P3 & 0x0FF00) >> 8,
                (P3 & 0x000FF),
                (P1 & 0x30000) >> 16 | rdiv << 4,
                (P1 & 0x0FF00) >> 8,
                (P1 & 0x000FF),
                (P3 & 0xF0000) >> 12 | (P2 & 0xF0000) >> 16,
                (P2 & 0x0FF00) >> 8,
                (P2 & 0x000FF),
            ],
        )

    def set_phase(self, output, div):

        if not isinstance(output, int):
            raise TypeError("output must be an int")
        if not isinstance(div, int):
            raise TypeError("div must be an int")

        if not 0 <= output <= 2:
            raise ValueError("output must be in range 0..2")
        if not 0 <= div <= 255:
            raise ValueError("div must be in range 0..255")

        self._write(self.SI5351_REGISTER_CLK0_PHOFF + output, div & 0xFF)

    def reset_pll(self, pll):

        if not isinstance(pll, int):
            raise TypeError("pll must be an int")

        if pll not in (0, 1):
            raise ValueError("pll must be 0 (PLLA) or 1 (PLLB)")
        if pll == 0:
            value = self.SI5351_PLL_RESET_A
        if pll == 1:
            value = self.SI5351_PLL_RESET_B
        self._write(self.SI5351_REGISTER_PLL_RESET, value)

    def init_multisynth(self, output, integer_mode):

        if not isinstance(output, int):
            raise TypeError("output must be an int")
        if not isinstance(integer_mode, bool):
            raise TypeError("integer_mode must be a bool")

        if not 0 <= output <= 2:
            raise ValueError("output must be in range 0..2")

        pll = self.pll[output]
        value = self.SI5351_CLK_INPUT_MULTISYNTH_N
        value |= self.drive_strength[output]
        if integer_mode:
            value |= self.SI5351_CLK_INTEGER_MODE
        if self.invert[output] or self.quadrature[output]:
            value |= self.SI5351_CLK_INVERT
        if pll == 0:
            value |= self.SI5351_CLK_PLL_SELECT_A
        if pll == 1:
            value |= self.SI5351_CLK_PLL_SELECT_B
        self._write(self.SI5351_REGISTER_CLK0_CONTROL + output, value)

    def approximate_fraction(self, n, d, max_denom):

        for name, value in zip(["n", "d", "max_denom"], [n, d, max_denom]):
            if not isinstance(value, int):
                raise TypeError(f"{name} must be an int")

        if d == 0:
            raise ValueError("d (denominator) cannot be 0")
        if max_denom <= 0:
            raise ValueError("max_denom must be positive")

        denom = d
        if denom > max_denom:
            num = n
            p0 = 0
            q0 = 1
            p1 = 1
            q1 = 0
            while denom != 0:
                a = num // denom
                b = num % denom
                q2 = q0 + a * q1
                if q2 > max_denom:
                    break
                p2 = p0 + a * p1
                p0 = p1
                q0 = q1
                p1 = p2
                q1 = q2
                num = denom
                denom = b
            n = p1
            d = q1
        return n, d

    def __init__(self, i2c, crystal, load=SI5351_CRYSTAL_LOAD_10PF, address=SI5351_I2C_ADDRESS_DEFAULT):

        allowed_loads = (self.SI5351_CRYSTAL_LOAD_6PF,
                         self.SI5351_CRYSTAL_LOAD_8PF, self.SI5351_CRYSTAL_LOAD_10PF)
        if load not in allowed_loads:
            raise ValueError(f"load must be one of {allowed_loads}")
        if not 0x00 <= address <= 0x7F:
            raise ValueError("address must be 7-bit (0x00..0x7F)")
        self.i2c = i2c
        self.crystal = crystal
        self.address = address
        self.vco = {}
        self.pll = {}
        self.quadrature = {}
        self.invert = {}
        self.drive_strength = {}
        self.div = {}

        while self._read(self.SI5351_REGISTER_DEVICE_STATUS) & 0x80:
            pass

        self._write(self.SI5351_REGISTER_OUTPUT_ENABLE_CONTROL, 0xFF)

        values = [self.SI5351_CLK_POWERDOWN] * 8
        self._write_bulk(self.SI5351_REGISTER_CLK0_CONTROL, values)

        self._write(self.SI5351_REGISTER_CRYSTAL_LOAD, load << 6)

    def init_clock(self, output, pll, quadrature=False, invert=False, drive_strength=SI5351_CLK_DRIVE_STRENGTH_8MA):

        if not isinstance(output, int):
            raise TypeError("output must be int")
        if not isinstance(pll, int):
            raise TypeError("pll must be int")
        if not isinstance(quadrature, bool):
            raise TypeError("quadrature must be bool")
        if not isinstance(invert, bool):
            raise TypeError("invert must be bool")
        if not isinstance(drive_strength, int):
            raise TypeError("drive_strength must be int")

        if not 0 <= output <= 2:
            raise ValueError("output must be in range 0..2")
        if pll not in (0, 1):
            raise ValueError("pll must be 0 (PLLA) or 1 (PLLB)")
        allowed_drives = (
            self.SI5351_CLK_DRIVE_STRENGTH_2MA,
            self.SI5351_CLK_DRIVE_STRENGTH_4MA,
            self.SI5351_CLK_DRIVE_STRENGTH_6MA,
            self.SI5351_CLK_DRIVE_STRENGTH_8MA,
        )
        if drive_strength not in allowed_drives:
            raise ValueError(f"drive_strength must be one of {allowed_drives}")

        self.pll[output] = pll
        self.quadrature[output] = quadrature
        self.invert[output] = invert
        self.drive_strength[output] = drive_strength
        self.div[output] = None

    def enable_output(self, output):

        if not isinstance(output, int):
            raise TypeError("output must be an int")

        if not 0 <= output <= 2:
            raise ValueError("output must be in range 0..2")
        mask = self._read(self.SI5351_REGISTER_OUTPUT_ENABLE_CONTROL)
        self._write(self.SI5351_REGISTER_OUTPUT_ENABLE_CONTROL,
                    mask & ~(1 << output))

    def disable_output(self, output):

        if not isinstance(output, int):
            raise TypeError("output must be an int")

        if not 0 <= output <= 2:
            raise ValueError("output must be in range 0..2")
        mask = self._read(self.SI5351_REGISTER_OUTPUT_ENABLE_CONTROL)
        self._write(self.SI5351_REGISTER_OUTPUT_ENABLE_CONTROL,
                    mask | (1 << output))

    def setup_pll(self, pll, mul, num=0, denom=1):

        for name, val in (("pll", pll), ("mul", mul), ("num", num), ("denom", denom)):
            if not isinstance(val, int):
                raise TypeError(f"{name} must be int")

        if pll not in (0, 1):
            raise ValueError("pll must be 0 (PLLA) or 1 (PLLB)")
        if not 15 <= mul <= 90:
            raise ValueError("mul must be in range 15..90")
        if not 0 <= num <= 1048574:
            raise ValueError("num must be in range 0..1048574")
        if not 1 <= denom <= 1048575:
            raise ValueError("denom must be in range 1..1048575")

        vco = self.crystal * (mul + num / denom)
        if pll == 0:
            reg = self.SI5351_REGISTER_PLL_A
        if pll == 1:
            reg = self.SI5351_REGISTER_PLL_B
        self.write_config(reg, whole=mul, num=num, denom=denom, rdiv=0)
        self.vco[pll] = vco

    def setup_multisynth(self, output, div, num=0, denom=1, rdiv=0):

        if type(div) is not int or div < 4:
            raise ValueError(
                "bad multisynth divisor：div (int): Integer divider [4-2047].")
        if output == 0:
            reg = self.SI5351_REGISTER_MULTISYNTH0_PARAMETERS_1
        if output == 1:
            reg = self.SI5351_REGISTER_MULTISYNTH1_PARAMETERS_1
        if output == 2:
            reg = self.SI5351_REGISTER_MULTISYNTH2_PARAMETERS_1
        self.write_config(reg, whole=div, num=num, denom=denom, rdiv=rdiv)
        if self.div[output] != div:
            pll = self.pll[output]
            self.set_phase(output, div if self.quadrature[output] else 0)

            self.reset_pll(pll)
            integer_mode = num == 0
            self.init_multisynth(output, integer_mode=integer_mode)
            self.div[output] = div

    def set_freq_fixedpll(self, output, freq):

        pll = self.pll[output]
        vco = self.vco[pll]

        for rdiv in range(self.SI5351_MULTISYNTH_RX_MAX + 1):
            if freq * self.SI5351_MULTISYNTH_DIV_MAX > vco:
                break
            freq *= 2
        else:
            raise ValueError("maximum Rx divisor exceeded")

        vco = int(10 * vco)
        denom = int(10 * freq)
        num = vco % denom

        div = vco // denom
        if div < self.SI5351_MULTISYNTH_DIV_MIN or div >= self.SI5351_MULTISYNTH_DIV_MAX:
            raise ValueError("multisynth divisor out of range")
        max_denom = self.SI5351_MULTISYNTH_C_MAX
        num, denom = self.approximate_fraction(num, denom, max_denom=max_denom)
        self.setup_multisynth(output, div=div, num=num, denom=denom, rdiv=rdiv)

    def set_freq_fixedms(self, output, freq):
        if not isinstance(output, int):
            raise TypeError("output must be an int")
        if not isinstance(freq, (int, float)):
            raise TypeError("freq must be int or float")

        if not 0 <= output <= 2:
            raise ValueError("output must be in range 0..2")
        if freq <= 0:
            raise ValueError("freq must be positive")
        pll = self.pll[output]
        crystal = self.crystal
        vco = freq * div * 2**rdiv

        vco = int(10 * vco)
        denom = int(10 * crystal)
        num = vco % denom

        mul = vco // denom
        if mul < self.SI5351_MULTISYNTH_MUL_MIN or mul >= self.SI5351_MULTISYNTH_MUL_MAX:
            raise ValueError("pll multiplier out of range")
        max_denom = self.SI5351_MULTISYNTH_C_MAX
        num, denom = self.approximate_fraction(num, denom, max_denom=max_denom)
        self.setup_pll(pll, mul=mul, num=num, denom=denom)

    def disabled_states(self, output, state):

        if not isinstance(output, int):
            raise TypeError("output must be an int")
        if not isinstance(state, int):
            raise TypeError("state must be an int")

        if not 0 <= output <= 7:
            raise ValueError("output must be in range 0..7")
        if not 0 <= state <= 3:
            raise ValueError("state must be 0..3")
        if output < 4:
            reg = self.SI5351_REGISTER_DIS_STATE_1
        else:
            reg = self.SI5351_REGISTER_DIS_STATE_2
            output -= 4
        value = self._read(reg)
        s = [(value >> (n * 2)) & 0x3 for n in range(4)]
        s[output] = state
        self._write(reg, s[3] << 6 | s[2] << 4 | s[1] << 2 | s[0])

    def disable_oeb(self, mask):

        if not isinstance(mask, int):
            raise TypeError("mask must be an int")

        if not 0 <= mask <= 0xFF:
            raise ValueError("mask must be in range 0..0xFF")

        self._write(self.SI5351_REGISTER_OEB_ENABLE_CONTROL, mask & 0xFF)
