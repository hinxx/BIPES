

from machine import Pin, time_pulse_us

import time

from micropython import const


class RCWL9623:

    GPIO_MODE, ONEWIRE_MODE, UART_MODE, I2C_MODE = [0, 1, 2, 3]

    I2C_DEFAULT_ADDR = const(0x57)

    def __init__(self, mode: int, *, gpio_pins=None, onewire_pin=None, uart=None, i2c=None, addr=None):

        if mode not in [RCWL9623.GPIO_MODE, RCWL9623.ONEWIRE_MODE, RCWL9623.UART_MODE, RCWL9623.I2C_MODE]:
            raise ValueError("unknown mode: %s" % mode)

        self.mode = mode

        if self.mode == RCWL9623.GPIO_MODE:
            if not (isinstance(gpio_pins, (tuple, list)) and len(gpio_pins) == 2):
                raise ValueError(
                    "GPIO mode requires gpio_pins=(trig_pin, echo_pin)")
            trig_pin, echo_pin = gpio_pins

            if not isinstance(trig_pin, int) or not isinstance(echo_pin, int):
                raise ValueError(
                    "gpio_pins must be two integers (pin numbers)")
            self.trig = Pin(trig_pin, Pin.OUT)
            self.echo = Pin(echo_pin, Pin.IN)

        elif self.mode == RCWL9623.ONEWIRE_MODE:
            if onewire_pin is None or not isinstance(onewire_pin, int):
                raise ValueError("OneWire mode requires onewire_pin (int)")
            self.pin = Pin(onewire_pin, Pin.OUT)

        elif self.mode == RCWL9623.UART_MODE:

            if uart is None:
                raise ValueError(
                    "UART mode requires an initialized UART instance via 'uart='")

            if not (hasattr(uart, "read") and hasattr(uart, "write")):
                raise ValueError(
                    "provided 'uart' does not look like a UART instance")
            self.uart = uart

        elif self.mode == RCWL9623.I2C_MODE:
            if i2c is None:
                raise ValueError(
                    "I2C mode requires an initialized I2C instance via 'i2c='")
            if not (hasattr(i2c, "readfrom") and hasattr(i2c, "writeto")):
                raise ValueError(
                    "provided 'i2c' does not look like an I2C instance")
            self.i2c = i2c
            self.addr = addr if addr is not None else RCWL9623.I2C_DEFAULT_ADDR

    def read_distance(self) -> float:

        if self.mode == RCWL9623.GPIO_MODE:
            return self._read_gpio()
        elif self.mode == RCWL9623.ONEWIRE_MODE:
            return self._read_onewire()
        elif self.mode == RCWL9623.UART_MODE:
            return self._read_uart()
        elif self.mode == RCWL9623.I2C_MODE:
            return self._read_i2c()

    def _read_gpio(self) -> float:

        self.trig.value(0)
        time.sleep_us(2)
        self.trig.value(1)
        time.sleep_us(10)
        self.trig.value(0)

        timeout = 1000000
        count = 0
        while self.echo.value() == 0:
            count += 1
            if count > timeout:

                return None
        start = time.ticks_us()

        count = 0
        while self.echo.value() == 1:
            count += 1
            if count > timeout:

                return None
        end = time.ticks_us()

        duration = time.ticks_diff(end, start)

        distance_cm = duration * 34300 / 1000000 / 2
        if distance_cm < 2 or distance_cm > 700:
            return None

        return round(distance_cm, 2)

    def _read_onewire(self) -> float:

        self.pin.init(Pin.OUT)
        self.pin.value(1)
        time.sleep_us(14)
        self.pin.value(0)
        time.sleep_us(14)
        self.pin.value(1)
        self.pin.init(Pin.IN)

        try:

            duration = time_pulse_us(self.pin, 1, 30000)
        except OSError:
            return None

        distance_cm = (duration * 340) / 2 / 10000
        if distance_cm < 2 or distance_cm > 700:
            return None
        return round(distance_cm, 2)

    def _read_uart(self, max_retries: int = 5) -> float:
        for _ in range(max_retries):
            while self.uart.any():

                self.uart.read()

            self.uart.write(bytes([0xA0]))

            time.sleep_ms(150)

            if self.uart.any() >= 3:
                data = self.uart.read(3)
                if data and len(data) == 3:

                    distance = (data[0] << 16) + (data[1] << 8) + data[2]
                    distance_cm = distance / 10000
                    if 25 <= distance_cm <= 700:
                        return round(distance_cm, 2)
            time.sleep_ms(30)
        return None

    def _read_i2c(self) -> float:
        try:

            self.i2c.writeto(self.addr, bytes([0x01]))
            time.sleep_ms(120)

            data = self.i2c.readfrom(self.addr, 3)
            if len(data) == 3:
                distance = (data[0] << 16) + (data[1] << 8) + data[2]
                distance_cm = distance / 10000
                if 2 <= distance_cm <= 700:
                    return round(distance_cm, 2)
        except Exception as e:
            raise RuntimeError("I2C read error: %s" % e)
        return None
