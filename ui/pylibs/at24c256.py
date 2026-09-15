

import time


class AT24CXX:

    AT24C32 = 4096

    AT24C64 = 8192

    AT24C128 = 16384

    AT24C256 = 32768

    AT24C512 = 65536

    def __init__(self, i2c, chip_size=AT24C512, addr=0x50):

        if chip_size not in [AT24CXX.AT24C32, AT24CXX.AT24C64, AT24CXX.AT24C128, AT24CXX.AT24C256, AT24CXX.AT24C512]:
            raise ValueError("chip_size is not in the range of AT24CXX")

        self.i2c = i2c
        self.chip_size = chip_size
        self.addr = addr

        self.max_address = chip_size - 1

    def write_byte(self, address, data):

        if address < 0 or address > self.max_address:
            raise ValueError("address is out of range")

        if data < 0 or data > 255:
            raise ValueError("data must be 0-255")

        self.i2c.writeto_mem(self.addr, address, bytes([data]), addrsize=16)

        time.sleep_ms(5)

    def read_byte(self, address):

        if address < 0 or address > self.max_address:
            raise ValueError("address is out of range")

        value_read = self.i2c.readfrom_mem(self.addr, address, 1, addrsize=16)

        return int.from_bytes(value_read, "big")

    def write_page(self, address, data):

        if address < 0 or address > self.max_address:
            raise ValueError("address is out of range")

        for i in data:
            if i < 0 or i > 255:
                raise ValueError("data must be 0-255")

        if address + len(data) > self.max_address:
            raise ValueError("data exceeds maximum limit")

        page_boundary = (address // 64 + 1) * 64

        while data:

            write_length = min(len(data), page_boundary - address)

            self.i2c.writeto_mem(self.addr, address,
                                 data[:write_length], addrsize=16)

            time.sleep_ms(5)

            address += write_length
            data = data[write_length:]

            page_boundary = (address // 64 + 1) * 64

            if address > self.max_address:
                raise ValueError("address exceeds maximum limit")

    def read_sequence(self, start_address, length):

        if start_address < 0 or (start_address + length) > self.max_address:
            raise ValueError("address is out of range")

        return self.i2c.readfrom_mem(self.addr, start_address, length, addrsize=16)
