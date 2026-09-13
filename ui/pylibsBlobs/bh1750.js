var bh1750Blob = new Blob([
"# https://github.com/flrrth/pico-bh1750\n" +
"\n" +
"import math\n" +
"\n" +
"from micropython import const\n" +
"from utime import sleep_ms\n" +
"\n" +
"\n" +
"class BH1750:\n" +
"    '''Class for the BH1750 digital Ambient Light Sensor\n" +
"\n" +
"    The datasheet can be found at https://components101.com/sites/default/files/component_datasheet/BH1750.pdf\n" +
"    '''\n" +
"    \n" +
"    MEASUREMENT_MODE_CONTINUOUSLY = const(1)\n" +
"    MEASUREMENT_MODE_ONE_TIME = const(2)\n" +
"    \n" +
"    RESOLUTION_HIGH = const(0)\n" +
"    RESOLUTION_HIGH_2 = const(1)\n" +
"    RESOLUTION_LOW = const(2)\n" +
"    \n" +
"    MEASUREMENT_TIME_DEFAULT = const(69)\n" +
"    MEASUREMENT_TIME_MIN = const(31)\n" +
"    MEASUREMENT_TIME_MAX = const(254)\n" +
"\n" +
"    def __init__(self, address, i2c):\n" +
"        self._address = address\n" +
"        self._i2c = i2c\n" +
"        self._measurement_mode = BH1750.MEASUREMENT_MODE_ONE_TIME\n" +
"        self._resolution = BH1750.RESOLUTION_HIGH\n" +
"        self._measurement_time = BH1750.MEASUREMENT_TIME_DEFAULT\n" +
"        \n" +
"        self._write_measurement_time()\n" +
"        self._write_measurement_mode()\n" +
"        \n" +
"    def configure(self, measurement_mode: int, resolution: int, measurement_time: int):\n" +
"        '''Configures the BH1750.\n" +
"\n" +
"        Keyword arguments:\n" +
"        measurement_mode -- measure either continuously or once\n" +
"        resolution -- return measurements in either high, high2 or low resolution\n" +
"        measurement_time -- the duration of a single measurement\n" +
"        '''\n" +
"        if measurement_time not in range(BH1750.MEASUREMENT_TIME_MIN, BH1750.MEASUREMENT_TIME_MAX + 1):\n" +
"            raise ValueError('measurement_time must be between {0} and {1}'\n" +
"                             .format(BH1750.MEASUREMENT_TIME_MIN, BH1750.MEASUREMENT_TIME_MAX))\n" +
"        \n" +
"        self._measurement_mode = measurement_mode\n" +
"        self._resolution = resolution\n" +
"        self._measurement_time = measurement_time\n" +
"        \n" +
"        self._write_measurement_time()\n" +
"        self._write_measurement_mode()\n" +
"    \n" +
"    def _write_measurement_time(self):\n" +
"        buffer = bytearray(1)\n" +
"        \n" +
"        high_bit = 1 << 6 | self._measurement_time >> 5\n" +
"        low_bit = 3 << 5 | (self._measurement_time << 3) >> 3\n" +
"                \n" +
"        buffer[0] = high_bit\n" +
"        self._i2c.writeto(self._address, buffer)\n" +
"        \n" +
"        buffer[0] = low_bit\n" +
"        self._i2c.writeto(self._address, buffer)\n" +
"        \n" +
"    def _write_measurement_mode(self):\n" +
"        buffer = bytearray(1)\n" +
"                \n" +
"        buffer[0] = self._measurement_mode << 4 | self._resolution\n" +
"        self._i2c.writeto(self._address, buffer)\n" +
"        sleep_ms(24 if self._measurement_time == BH1750.RESOLUTION_LOW else 180)\n" +
"        \n" +
"    def reset(self):\n" +
"        '''Clear the illuminance data register.'''\n" +
"        self._i2c.writeto(self._address, 7)\n" +
"    \n" +
"    def power_on(self):\n" +
"        '''Powers on the BH1750.'''\n" +
"        self._i2c.writeto(self._address, 1)\n" +
"\n" +
"    def power_off(self):\n" +
"        '''Powers off the BH1750.'''\n" +
"        self._i2c.writeto(self._address, 0)\n" +
"\n" +
"    @property\n" +
"    def measurement(self) -> float:\n" +
"        '''Returns the latest measurement.'''\n" +
"        if self._measurement_mode == BH1750.MEASUREMENT_MODE_ONE_TIME:\n" +
"            self._write_measurement_mode()\n" +
"            \n" +
"        buffer = bytearray(2)\n" +
"        self._i2c.readfrom_into(self._address, buffer)\n" +
"        lux = (buffer[0] << 8 | buffer[1]) / (1.2 * (BH1750.MEASUREMENT_TIME_DEFAULT / self._measurement_time))\n" +
"        \n" +
"        if self._resolution == BH1750.RESOLUTION_HIGH_2:\n" +
"            return lux / 2\n" +
"        else:\n" +
"            return lux\n" +
"    \n" +
"    def measurements(self) -> float:\n" +
"        '''This is a generator function that continues to provide the latest measurement. Because the measurement time\n" +
"        is greatly affected by resolution and the configured measurement time, this function attemts to calculate the\n" +
"        appropriate sleep time between measurements.\n" +
"\n" +
"        Example usage:\n" +
"\n" +
"        for measurement in bh1750.measurements():  # bh1750 is an instance of this class\n" +
"            print(measurement)\n" +
"        '''\n" +
"        while True:\n" +
"            yield self.measurement\n" +
"            \n" +
"            if self._measurement_mode == BH1750.MEASUREMENT_MODE_CONTINUOUSLY:\n" +
"                base_measurement_time = 16 if self._measurement_time == BH1750.RESOLUTION_LOW else 120\n" +
"                sleep_ms(math.ceil(base_measurement_time * self._measurement_time / BH1750.MEASUREMENT_TIME_DEFAULT))\n"
], {type: 'text'});