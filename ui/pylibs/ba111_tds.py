from machine import UART
import time

class BA111TDS:
    READ_TDS_TEMPERATURE = bytes([0xA0])
    BASELINE_CALIBRATION = bytes([0xA6])
    SET_NTC_RESISTANCE = bytes([0xA3])
    SET_NTC_B = bytes([0xA5])

    SUCCESS_RESPONSE = bytes([0xAC, 0x00, 0x00, 0x00, 0x00, 0xAC])
    ERROR_RESPONSE_PREFIX = bytes([0xAC])
    ERROR_RESPONSE_SUFFIX = bytes([0x00, 0x00, 0x00, 0xAE])

    ERROR_CODES = {
        0x01: "Command Frame Exception",
        0x02: "Busy coding",
        0x03: "Calibration failed",
        0x04: "Detection temperature out of range"
    }

    def __init__(self, uart: UART):
        self._uart = uart
        self._timeout = 2000
        self.ntc_resistance = 10000
        self.ntc_b_value = 3950
        self.tds_value = 0.0
        self.temperature = 0.0

    def _calculate_crc(self, data_bytes):
        return sum(data_bytes) & 0xFF

    def _validate_crc(self, frame_data):
        data_to_check = frame_data[:-1]
        calculated_crc = sum(data_to_check) & 0xFF
        received_crc = frame_data[-1]

        return calculated_crc == received_crc

    def _build_frame(self, command, parameters=bytes([0x00, 0x00, 0x00, 0x00])):
        if len(parameters) != 4:
            raise ValueError("The parameter length must be 4 bytes")

        frame = command + parameters
        crc = self._calculate_crc(frame)
        return frame + bytes([crc])

    def _send_and_receive(self, frame, response_length=6):
        while self._uart.any():
            self._uart.read()
        time.sleep_ms(50)

        self._uart.write(frame)

        start_time = time.ticks_ms()
        response = bytearray()

        while len(response) < response_length:
            if time.ticks_diff(time.ticks_ms(), start_time) > self._timeout:
                return None

            if self._uart.any():
                response.append(self._uart.read(1)[0])

            time.sleep_ms(10)

        return bytes(response)

    def detect(self) -> tuple[float, float] | None:
        frame = self._build_frame(self.READ_TDS_TEMPERATURE)
        response = self._send_and_receive(frame)

        if not response:
            return None

        if response[0] != 0xAA:
            return None

        if not self._validate_crc(response):
            return None

        tds_raw = (response[1] << 8) | response[2]
        tds_value = float(tds_raw) 
        self.tds_value = tds_value
        print(tds_value)

        temp_raw = (response[3] << 8) | response[4]

        temp_value = float(temp_raw) / 100.0
        self.temperature = temp_value
        print(temp_value)

        return (tds_value, temp_value)

    def calibrate(self) -> bool:
        frame = self._build_frame(self.BASELINE_CALIBRATION)
        response = self._send_and_receive(frame)

        if not response or len(response) < 6:
            return False

        if response == self.SUCCESS_RESPONSE:
            return True

        if (response[0] == self.ERROR_RESPONSE_PREFIX[0] and
                response[5] == self.ERROR_RESPONSE_SUFFIX[3]):
            error_code = response[1]
            if error_code in self.ERROR_CODES:
                print(f"Calibration failed: {self.ERROR_CODES[error_code]}")
            else:
                print(f"Calibration failed: Unknown error code 0x{error_code:02X}")

        return False

    def set_ntc_resistance(self, resistance: int) -> bool:
        if resistance < 0 or resistance > 0xFFFFFFFF:
            print(f"Resistance value {resistance}Ω out of range")
            return False

        parameters = bytes([
            (resistance >> 24) & 0xFF,
            (resistance >> 16) & 0xFF,
            (resistance >> 8) & 0xFF,
            resistance & 0xFF
        ])

        frame = self._build_frame(self.SET_NTC_RESISTANCE, parameters)
        response = self._send_and_receive(frame)

        if not response or len(response) < 6:
            return False

        if response == self.SUCCESS_RESPONSE:
            self.ntc_resistance = resistance
            return True

        if (response[0] == self.ERROR_RESPONSE_PREFIX[0] and
                response[5] == self.ERROR_RESPONSE_SUFFIX[3]):
            error_code = response[1]
            if error_code in self.ERROR_CODES:
                print(f"Failed to set NTC resistor: {self.ERROR_CODES[error_code]}")
            else:
                print(f"Failed to set NTC resistor: Unknown error code 0x{error_code:02X}")

        return False

    def set_ntc_b_value(self, b_value: int) -> bool:
        if b_value < 0 or b_value > 0xFFFF:
            print(f"B value {b_value} is out of range")
            return False

        parameters = bytes([
            (b_value >> 8) & 0xFF,
            b_value & 0xFF,
            0x00,
            0x00
        ])

        frame = self._build_frame(self.SET_NTC_B, parameters)
        response = self._send_and_receive(frame)

        if not response or len(response) < 6:
            return False

        if response == self.SUCCESS_RESPONSE:
            self.ntc_b_value = b_value
            return True

        if (response[0] == self.ERROR_RESPONSE_PREFIX[0] and
                response[5] == self.ERROR_RESPONSE_SUFFIX[3]):
            error_code = response[1]
            if error_code in self.ERROR_CODES:
                print(f"Failed to set NTC B value: {self.ERROR_CODES[error_code]}")
            else:
                print(f"Failed to set NTC B value: unknown error code 0x{error_code:02X}")

        return False