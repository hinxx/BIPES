var ds3231_genBlob = new Blob([
"# ds3231_gen.py General purpose driver for DS3231 precison real time clock.\n" +
"\n" +
"# Author: Peter Hinch\n" +
"# Copyright Peter Hinch 2023 Released under the MIT license.\n" +
"\n" +
"# Rewritten from datasheet to support alarms. Sources studied:\n" +
"# WiPy driver at https://github.com/scudderfish/uDS3231\n" +
"# https://github.com/notUnique/DS3231micro\n" +
"\n" +
"# Assumes date > Y2K and 24 hour clock.\n" +
"\n" +
"import time\n" +
"import machine\n" +
"\n" +
"\n" +
"_ADDR = const(104)\n" +
"\n" +
"EVERY_SECOND = 15  # Exported flags\n" +
"EVERY_MINUTE = 14\n" +
"EVERY_HOUR = 12\n" +
"EVERY_DAY = 128\n" +
"EVERY_WEEK = 64\n" +
"EVERY_MONTH = 0\n" +
"\n" +
"try:\n" +
"    rtc = machine.RTC()\n" +
"except:\n" +
"    print('Warning: machine module does not support the RTC.')\n" +
"    rtc = None\n" +
"\n" +
"\n" +
"class Alarm:\n" +
"    def __init__(self, device, n):\n" +
"        self._device = device\n" +
"        self._i2c = device.ds3231\n" +
"        self.alno = n  # Alarm no.\n" +
"        self.offs = 7 if self.alno == 1 else 11  # Offset into address map\n" +
"        self.mask = 0\n" +
"\n" +
"    def _reg(self, offs : int, buf = bytearray(1)) -> int:  # Read a register\n" +
"        self._i2c.readfrom_mem_into(_ADDR, offs, buf)\n" +
"        return buf[0]\n" +
"\n" +
"    def enable(self, run):\n" +
"        flags = self._reg(14) | 4  # Disable square wave\n" +
"        flags = (flags | self.alno) if run else (flags & ~self.alno & 0xFF)\n" +
"        self._i2c.writeto_mem(_ADDR, 14, flags.to_bytes(1, 'little'))\n" +
"\n" +
"    def __call__(self):  # Return True if alarm is set\n" +
"        return bool(self._reg(15) & self.alno)\n" +
"\n" +
"    def clear(self):\n" +
"        flags = (self._reg(15) & ~self.alno) & 0xFF\n" +
"        self._i2c.writeto_mem(_ADDR, 15, flags.to_bytes(1, 'little'))\n" +
"\n" +
"    def set(self, when, day=0, hr=0, min=0, sec=0):\n" +
"        if when not in (15, 14, 12, 128, 64, 0):\n" +
"            raise ValueError('Invalid alarm specifier.')\n" +
"        self.mask = when\n" +
"        if when == EVERY_WEEK:\n" +
"            day += 1  # Setting a day of week\n" +
"        self._device.set_time((0, 0, day, hr, min, sec, 0, 0), self)\n" +
"        self.enable(True)\n" +
"\n" +
"\n" +
"class DS3231:\n" +
"    def __init__(self, i2c):\n" +
"        self.ds3231 = i2c\n" +
"        self.alarm1 = Alarm(self, 1)\n" +
"        self.alarm2 = Alarm(self, 2)\n" +
"        if _ADDR not in self.ds3231.scan():\n" +
"            raise RuntimeError(f'DS3231 not found on I2C bus at {_ADDR}')\n" +
"\n" +
"    def get_time(self, data=bytearray(7)):\n" +
"        def bcd2dec(bcd):  # Strip MSB\n" +
"            return ((bcd & 112) >> 4) * 10 + (bcd & 15)\n" +
"\n" +
"        self.ds3231.readfrom_mem_into(_ADDR, 0, data)\n" +
"        ss, mm, hh, wday, DD, MM, YY = [bcd2dec(x) for x in data]\n" +
"        YY += 2000\n" +
"        # Time from DS3231 in time.localtime() format (less yday)\n" +
"        result = YY, MM, DD, hh, mm, ss, wday - 1, 0\n" +
"        return result\n" +
"\n" +
"    # Output time or alarm data to device\n" +
"    # args: tt A datetime tuple. If absent uses localtime.\n" +
"    # alarm: An Alarm instance or None if setting time\n" +
"    def set_time(self, tt=None, alarm=None):\n" +
"        # Given BCD value return a binary byte. Modifier:\n" +
"        # Set MSB if any of bit(1..4) or bit 7 set, set b6 if mod[6]\n" +
"        def gbyte(dec, mod=0):\n" +
"            tens, units = divmod(dec, 10)\n" +
"            n = (tens << 4) + units\n" +
"            n |= 128 if mod & 15 else mod & 12\n" +
"            return n.to_bytes(1, 'little')\n" +
"\n" +
"        YY, MM, mday, hh, mm, ss, wday, yday = time.localtime() if tt is None else tt\n" +
"        mask = 0 if alarm is None else alarm.mask\n" +
"        offs = 0 if alarm is None else alarm.offs\n" +
"        if alarm is None or alarm.alno == 1:  # Has a seconds register\n" +
"            self.ds3231.writeto_mem(_ADDR, offs, gbyte(ss, mask & 1))\n" +
"            offs += 1\n" +
"        self.ds3231.writeto_mem(_ADDR, offs, gbyte(mm, mask & 2))\n" +
"        offs += 1\n" +
"        self.ds3231.writeto_mem(_ADDR, offs, gbyte(hh, mask & 4))  # Sets to 24hr mode\n" +
"        offs += 1\n" +
"        if alarm is not None:  # Setting an alarm - mask holds MS 2 bits\n" +
"            self.ds3231.writeto_mem(_ADDR, offs, gbyte(mday, mask))\n" +
"        else:  # Setting time\n" +
"            self.ds3231.writeto_mem(_ADDR, offs, gbyte(wday + 1))  # 1 == Monday, 7 == Sunday\n" +
"            offs += 1\n" +
"            self.ds3231.writeto_mem(_ADDR, offs, gbyte(mday))  # Day of month\n" +
"            offs += 1\n" +
"            self.ds3231.writeto_mem(_ADDR, offs, gbyte(MM, 0x80))  # Century bit (>Y2K)\n" +
"            offs += 1\n" +
"            self.ds3231.writeto_mem(_ADDR, offs, gbyte(YY - 2000))\n" +
"\n" +
"    def temperature(self, degreesF):\n" +
"        def twos_complement(input_value: int, num_bits: int) -> int:\n" +
"            mask = 2 ** (num_bits - 1)\n" +
"            return -(input_value & mask) + (input_value & ~mask)\n" +
"\n" +
"        t = self.ds3231.readfrom_mem(_ADDR, 17, 2)\n" +
"        i = t[0] << 8 | t[1]\n" +
"        temp = twos_complement(i >> 6, 10) * 0.25\n" +
"        if degreesF:\n" +
"            temp = temp * 9 / 5 + 32\n"+
"        return temp\n" +
"\n" +
"    def __str__(self, buf=bytearray(0x13)):  # Debug dump of device registers\n" +
"        self.ds3231.readfrom_mem_into(_ADDR, 0, buf)\n" +
"        s = ''\n" +
"        for n, v in enumerate(buf):\n" +
"            s = f'{s}0x{n:02x} 0x{v:02x} {v >> 4:04b} {v & 15 :04b}'\n" +
"            if not (n + 1) % 4:\n" +
"                s = f'{s}'\n" +
"        return s\n" +
"\n"
], {type: 'text'});