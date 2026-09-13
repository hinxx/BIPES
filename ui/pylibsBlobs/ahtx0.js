var ahtx0Blob = new Blob([
"# The MIT License (MIT)\n" +
"#\n" +
"# Copyright (c) 2020 Kattni Rembor for Adafruit Industries\n" +
"# Copyright (c) 2020 Andreas Bühl\n" +
"# Copyright (c) 2025 J.E. Tannenbaum - Converted HEX to Decimal for BIPES\n" +
"#\n" +
"# Permission is hereby granted, free of charge, to any person obtaining a copy\n" +
"# of this software and associated documentation files (the 'Software'), to deal\n" +
"# in the Software without restriction, including without limitation the rights\n" +
"# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n" +
"# copies of the Software, and to permit persons to whom the Software is\n" +
"# furnished to do so, subject to the following conditions:\n" +
"#\n" +
"# The above copyright notice and this permission notice shall be included in\n" +
"# all copies or substantial portions of the Software.\n" +
"#\n" +
"# THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n" +
"# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n" +
"# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n" +
"# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n" +
"# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n" +
"# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\n" +
"# THE SOFTWARE.\n" +
"'''\n" +
"\n" +
"MicroPython driver for the AHT10 and AHT20 Humidity and Temperature Sensor\n" +
"\n" +
"Author(s): Andreas Bühl, Kattni Rembor\n" +
"\n" +
"'''\n" +
"\n" +
"import utime\n" +
"from micropython import const\n" +
"\n" +
"\n" +
"class AHT10:\n" +
"    '''Interface library for AHT10/AHT20 temperature+humidity sensors'''\n" +
"\n" +
"    AHTX0_I2CADDR_DEFAULT = const(56)   # Default I2C address\n" +
"    AHTX0_CMD_INITIALIZE = 225          # Initialization command\n" +
"    AHTX0_CMD_TRIGGER = const(172)      # Trigger reading command\n" +
"    AHTX0_CMD_SOFTRESET = const(186)    # Soft reset command\n" +
"    AHTX0_STATUS_BUSY = const(128)      # Status bit for busy\n" +
"    AHTX0_STATUS_CALIBRATED = const(8)  # Status bit for calibrated\n" +
"\n" +
"    def __init__(self, i2c, address=AHTX0_I2CADDR_DEFAULT):\n" +
"        utime.sleep_ms(20)  # 20ms delay to wake up\n" +
"        self._i2c = i2c\n" +
"        self._address = address\n" +
"        self._buf = bytearray(6)\n" +
"        self.reset()\n" +
"        if not self.initialize():\n" +
"            raise RuntimeError('Could not initialize')\n" +
"        self._temp = None\n" +
"        self._humidity = None\n" +
"\n" +
"    def reset(self):\n" +
"        '''Perform a soft-reset of the AHT'''\n" +
"        self._buf[0] = self.AHTX0_CMD_SOFTRESET\n" +
"        self._i2c.writeto(self._address, self._buf[0:1])\n" +
"        utime.sleep_ms(20)  # 20ms delay to wake up\n" +
"\n" +
"    def initialize(self):\n" +
"        '''Ask the sensor to self-initialize. Returns True on success, False otherwise'''\n" +
"        self._buf[0] = self.AHTX0_CMD_INITIALIZE\n" +
"        self._buf[1] = 8\n" +
"        self._buf[2] = 0\n" +
"        self._i2c.writeto(self._address, self._buf[0:3])\n" +
"        self._wait_for_idle()\n" +
"        if not self.status & self.AHTX0_STATUS_CALIBRATED:\n" +
"            return False\n" +
"        return True\n" +
"\n" +
"    @property\n" +
"    def status(self):\n" +
"        '''The status byte initially returned from the sensor, see datasheet for details'''\n" +
"        self._read_to_buffer()\n" +
"        return self._buf[0]\n" +
"\n" +
"    @property\n" +
"    def relative_humidity(self):\n" +
"        '''The measured relative humidity in percent.'''\n" +
"        self._perform_measurement()\n" +
"        self._humidity = (\n" +
"            (self._buf[1] << 12) | (self._buf[2] << 4) | (self._buf[3] >> 4)\n" +
"        )\n" +
"        self._humidity = (self._humidity * 100) / 1048576\n" +
"        return self._humidity\n" +
"\n" +
"    @property\n" +
"    def temperature(self):\n" +
"        '''The measured temperature in degrees Celcius.'''\n" +
"        self._perform_measurement()\n" +
"        self._temp = ((self._buf[3] & 15) << 16) | (self._buf[4] << 8) | self._buf[5]\n" +
"        self._temp = ((self._temp * 200.0) / 1048576) - 50\n" +
"        return self._temp\n" +
"\n" +
"    def _read_to_buffer(self):\n" +
"        '''Read sensor data to buffer'''\n" +
"        self._i2c.readfrom_into(self._address, self._buf)\n" +
"\n" +
"    def _trigger_measurement(self):\n" +
"        '''Internal function for triggering the AHT to read temp/humidity'''\n" +
"        self._buf[0] = self.AHTX0_CMD_TRIGGER\n" +
"        self._buf[1] = 51\n" +
"        self._buf[2] = 0\n" +
"        self._i2c.writeto(self._address, self._buf[0:3])\n" +
"\n" +
"    def _wait_for_idle(self):\n" +
"        '''Wait until sensor can receive a new command'''\n" +
"        while self.status & self.AHTX0_STATUS_BUSY:\n" +
"            utime.sleep_ms(5)\n" +
"\n" +
"    def _perform_measurement(self):\n" +
"        '''Trigger measurement and write result to buffer'''\n" +
"        self._trigger_measurement()\n" +
"        self._wait_for_idle()\n" +
"        self._read_to_buffer()\n" +
"\n" +
"\n" +
"class AHT20(AHT10):\n" +
"    AHTX0_CMD_INITIALIZE = 190  # Calibration command\n"
], {type: 'text'});