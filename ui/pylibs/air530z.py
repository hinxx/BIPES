
from micropython import const
from machine import UART
from nemapar import NMEAParser
import time


class NMEASender:

    def _checksum(self, sentence: str) -> str:
        cs = 0
        for c in sentence:
            cs ^= ord(c)
        return f"{cs:02X}"

    def _build(self, body: str) -> str:
        cs = self._checksum(body)
        return f"${body}*{cs}\r\n"

    def set_baudrate(self, baud: int) -> str:
        return self._build(f"PCAS01,{baud}")

    def set_update_rate(self, rate: int) -> str:
        return self._build(f"PCAS02,{rate}")

    def set_protocol(self, mode: int) -> str:
        return self._build(f"PCAS05,{mode}")

    def set_system_mode(self, mode: int) -> str:
        return self._build(f"PCAS06,{mode}")

    def set_startup_mode(self, mode: int) -> str:
        return self._build(f"PCAS07,{mode}")

    def query_product_info(self) -> str:
        return self._build("PCAS10,0")


class Air530Z(NMEAParser):

    BAUDRATE_9600 = const(9600)
    BAUDRATE_115200 = const(115200)

    UPDATE_1HZ = const(1)
    UPDATE_5HZ = const(5)
    UPDATE_10HZ = const(10)

    NMEA_V41 = const(2)
    NMEA_BDS_GPS = const(5)
    NMEA_GPS_ONLY = const(9)

    MODE_BDS_GPS = const(1)
    MODE_GPS_ONLY = const(2)
    MODE_BDS_ONLY = const(3)

    COLD_START = const(1)
    WARM_START = const(2)
    HOT_START = const(3)

    MSG_GGA = const(1)
    MSG_GLL = const(2)
    MSG_GSA = const(3)
    MSG_GSV = const(4)
    MSG_RMC = const(5)
    MSG_VTG = const(6)
    MSG_ZDA = const(7)
    MSG_ANT = const(8)
    MSG_DHV = const(9)
    MSG_LPS = const(10)
    MSG_UTC = const(11)
    MSG_GST = const(12)
    MSG_TIM = const(13)

    def __init__(self, uart: UART):
        self._uart = uart
        self._sender = NMEASender()
        self._parser = NMEAParser()
        self.last_known_fix = {}

    def _send(self, sentence: str) -> bool:
        try:
            self._uart.write(f'{sentence}\r\n'.encode())
            return True
        except Exception:
            return False

    def _recv(self) -> str:
        try:
            if self._uart.any():
                resp = self._uart.read()
            return True, resp.decode('utf-8', errors='ignore')
        except Exception as e:
            return False, 'RECV NONE'

    def set_baudrate(self, baudrate: int) -> (bool, str):
        if baudrate not in (self.BAUDRATE_9600, self.BAUDRATE_115200):
            return False, "Invalid baudrate"
        cmd = self._sender.set_baudrate(baudrate)
        ok = self._send(cmd)
        return ok, cmd

    def set_update_rate(self, rate: int) -> (bool, str):
        if rate not in (self.UPDATE_1HZ, self.UPDATE_5HZ, self.UPDATE_10HZ):
            return False, "Invalid update rate"
        cmd = self._sender.set_update_rate(rate)
        ok = self._send(cmd)
        return ok, cmd

    def set_protocol(self, mode: int) -> (bool, str):
        if mode not in (self.NMEA_V41, self.NMEA_BDS_GPS, self.NMEA_GPS_ONLY):
            return False, "Invalid protocol mode"
        cmd = self._sender.set_protocol(mode)
        ok = self._send(cmd)
        return ok, cmd

    def set_system_mode(self, mode: int) -> (bool, str):
        if mode not in (self.MODE_BDS_GPS, self.MODE_GPS_ONLY, self.MODE_BDS_ONLY):
            return False, "Invalid system mode"
        cmd = self._sender.set_system_mode(mode)
        ok = self._send(cmd)
        return ok, cmd

    def set_startup_mode(self, mode: int) -> (bool, str):
        if mode not in (self.COLD_START, self.WARM_START, self.HOT_START):
            return False, "Invalid startup mode"
        cmd = self._sender.set_startup_mode(mode)
        ok = self._send(cmd)
        return ok, cmd

    def query_product_info(self) -> (bool, str):
        cmd = self._sender.query_product_info()
        ok = self._send(cmd)
        response = self._recv()
        return ok, response

    def read(self) -> dict:
        if self._uart.any():
            data = self._uart.read()

            self.feed(data)

            fix = self.last_known_fix

            result = {
                "latitude": fix.get('latitude'),
                "longitude": fix.get('longitude'),
                "satellites": fix.get('num_satellites', 0),
                "altitude": fix.get('altitude'),
                "timestamp": fix.get('time', [0, 0, 0.0])
            }
            return result
