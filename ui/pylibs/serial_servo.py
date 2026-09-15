

from machine import UART

import time


class SerialServo:

    SERVO_MOVE_TIME_WRITE = (1, 7)

    SERVO_MOVE_TIME_READ = (2, 3, 7)

    SERVO_MOVE_TIME_WAIT_WRITE = (7, 7)

    SERVO_MOVE_TIME_WAIT_READ = (8, 3, 7)

    SERVO_MOVE_START = (11, 3)

    SERVO_MOVE_STOP = (12, 3)

    SERVO_ID_WRITE = (13, 4)

    SERVO_ID_READ = (14, 3, 4)

    SERVO_ANGLE_OFFSET_ADJUST = (17, 4)

    SERVO_ANGLE_OFFSET_WRITE = (18, 3)

    SERVO_ANGLE_OFFSET_READ = (19, 3, 4)

    SERVO_ANGLE_LIMIT_WRITE = (20, 7)

    SERVO_ANGLE_LIMIT_READ = (21, 3, 7)

    SERVO_VIN_LIMIT_WRITE = (22, 7)

    SERVO_VIN_LIMIT_READ = (23, 3, 7)

    SERVO_TEMP_MAX_LIMIT_WRITE = (24, 4)

    SERVO_TEMP_MAX_LIMIT_READ = (25, 3, 4)

    SERVO_TEMP_READ = (26, 3, 4)

    SERVO_VIN_READ = (27, 3, 5)

    SERVO_POS_READ = (28, 3, 5)

    SERVO_OR_MOTOR_MODE_WRITE = (29, 7)

    SERVO_OR_MOTOR_MODE_READ = (30, 3, 7)

    SERVO_LOAD_OR_UNLOAD_WRITE = (31, 4)

    SERVO_LOAD_OR_UNLOAD_READ = (32, 3, 4)

    SERVO_LED_CTRL_WRITE = (33, 4)

    SERVO_LED_CTRL_READ = (34, 3, 4)

    SERVO_LED_ERROR_WRITE = (35, 4)

    SERVO_LED_ERROR_READ = (36, 3, 4)

    MODE_POSITION = 0

    MODE_MOTOR = 1

    ERROR_NO_ALARM = 0
    ERROR_OVER_TEMP = 1
    ERROR_OVER_VOLT = 2
    ERROR_OVER_TEMP_AND_VOLT = 3
    ERROR_STALL = 4
    ERROR_OVER_TEMP_AND_STALL = 5
    ERROR_OVER_VOLT_AND_STALL = 6
    ERROR_ALL = 7

    READ_COMMANDS = {
        2,
        8,
        14,
        19,
        21,
        23,
        25,
        26,
        27,
        28,
        30,
        32,
        34,
        36
    }

    def __init__(self, uart: UART) -> None:
        self.uart = uart

    def calculate_checksum(self, data: list[int]) -> int:

        checksum = ~(sum(data) & 0xFF) & 0xFF

        return checksum

    def build_packet(self, servo_id: int, cmd: int, params: list[int]) -> bytearray:

        if servo_id < 0 or servo_id > 254:
            raise ValueError("Servo ID must be in range 0~254.")

        length = 3 + len(params)

        packet = [0x55, 0x55, servo_id, length, cmd] + params

        checksum = self.calculate_checksum(packet[2:])

        packet.append(checksum)

        return bytearray(packet)

    def send_command(self, servo_id: int, cmd: int, params: list[int] = []) -> None:
        packet = self.build_packet(servo_id, cmd, params)
        self.uart.write(packet)

    def receive_command(self, expected_cmd: int, expected_data_len: int) -> list:

        if expected_cmd not in SerialServo.READ_COMMANDS:
            raise ValueError("Expected command is not a read command.")

        data = self.uart.read()

        if data is None:
            return []

        if data[0] != 0x55 or data[1] != 0x55:
            return []

        if data[4] != expected_cmd:
            return []

        length = data[3]
        if length != expected_data_len:

            return []

        checksum_received = data[-1]

        checksum_calculated = self.calculate_checksum(data[2:-1])
        if checksum_received != checksum_calculated:
            return []

        params = data[5:-1]

        return params

    def move_servo_immediate(self, servo_id: int, angle: float, time_ms: int) -> None:

        if angle < 0 or angle > 240:
            raise ValueError("Angle must be in range 0~240.")

        if time_ms < 0 or time_ms > 30000:
            raise ValueError("Time must be in range 0~30000.")

        angle_low = int(angle / 0.24) & 0xFF

        angle_high = (int(angle / 0.24) >> 8) & 0xFF

        time_low = time_ms & 0xFF

        time_high = (time_ms >> 8) & 0xFF

        self.send_command(servo_id, SerialServo.SERVO_MOVE_TIME_WRITE[0], [
                          angle_low, angle_high, time_low, time_high])

    def get_servo_move_immediate(self, servo_id: int) -> tuple:

        self.send_command(servo_id, SerialServo.SERVO_MOVE_TIME_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_MOVE_TIME_READ[0], SerialServo.SERVO_MOVE_TIME_READ[2])

        if len(params) == 0:
            return None

        angle_value = params[0] + (params[1] << 8)

        angle_value = angle_value * 0.24

        if angle_value < 0 or angle_value > 240:
            raise ValueError("Angle value is out of range.")

        time_value = params[2] + (params[3] << 8)

        if time_value < 0 or time_value > 30000:
            raise ValueError("Time value is out of range.")

        return angle_value, time_value

    def move_servo_with_time_delay(self, servo_id: int, angle: float, time_ms: int) -> None:

        if angle < 0 or angle > 240:
            raise ValueError("Angle must be in range 0~240.")

        if time_ms < 0 or time_ms > 30000:
            raise ValueError("Time must be in range 0~30000.")

        angle_low = int(angle / 0.24) & 0xFF

        angle_high = (int(angle / 0.24) >> 8) & 0xFF

        time_low = time_ms & 0xFF

        time_high = (time_ms >> 8) & 0xFF

        self.send_command(servo_id, SerialServo.SERVO_MOVE_TIME_WAIT_WRITE[0], [
                          angle_low, angle_high, time_low, time_high])

    def get_servo_move_with_time_delay(self, servo_id: int) -> tuple:

        raise ValueError(
            "This function is not working properly! You can use get_servo_move_immediate() instead.")

        self.send_command(
            servo_id, SerialServo.SERVO_MOVE_TIME_WAIT_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_MOVE_TIME_WAIT_READ[0], SerialServo.SERVO_MOVE_TIME_WAIT_READ[2])

        if len(params) == 0:
            return None

        angle_value = params[0] + (params[1] << 8)

        angle_value = angle_value * 0.24

        if angle_value < 0 or angle_value > 240:
            raise ValueError("Angle value is out of range.")

        time_value = params[2] + (params[3] << 8)

        if time_value < 0 or time_value > 30000:
            raise ValueError("Time value is out of range.")

        return angle_value, time_value

    def start_servo(self, servo_id: int) -> None:

        self.send_command(servo_id, SerialServo.SERVO_MOVE_START[0], [])

    def stop_servo(self, servo_id: int) -> None:
        self.send_command(servo_id, SerialServo.SERVO_MOVE_STOP[0], [])

    def set_servo_id(self, servo_id: int, new_id: int) -> None:

        if new_id < 0 or new_id > 253:
            raise ValueError("New ID must be in range 0~253.")

        self.send_command(servo_id, SerialServo.SERVO_ID_WRITE[0], [new_id])

    def get_servo_id(self, servo_id: int) -> int:

        self.send_command(servo_id, SerialServo.SERVO_ID_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_ID_READ[0], SerialServo.SERVO_ID_READ[2])

        if len(params) == 0:
            return None

        servo_id_value = params[0]

        if servo_id_value < 0 or servo_id_value > 254:
            raise ValueError("Servo ID must be in range 0~254.")

        return servo_id_value

    def set_servo_angle_offset(self, servo_id: int, angle: float, save_to_memory: bool = False) -> None:

        if angle < -30 or angle > 30:
            raise ValueError("Angle must be in range -30~30.")

        offset = int(angle / 0.24)

        offset = (offset + 256) % 256

        if save_to_memory:

            self.send_command(
                servo_id, SerialServo.SERVO_ANGLE_OFFSET_ADJUST[0], [offset])

            self.send_command(
                servo_id, SerialServo.SERVO_ANGLE_OFFSET_WRITE[0], [])
        else:
            self.send_command(
                servo_id, SerialServo.SERVO_ANGLE_OFFSET_ADJUST[0], [offset])

    def get_servo_angle_offset(self, servo_id: int) -> float:

        self.send_command(servo_id, SerialServo.SERVO_ANGLE_OFFSET_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_ANGLE_OFFSET_READ[0], SerialServo.SERVO_ANGLE_OFFSET_READ[2])

        if len(params) == 0:
            return None

        offset_value = params[0]

        if offset_value > 127:

            offset_value -= 256

        angle_offset = offset_value * (30 / 125.0)

        if angle_offset < -30 or angle_offset > 30:
            raise ValueError("Angle offset must be in range -30~30.")

        return angle_offset

    def set_servo_angle_range(self, servo_id: int, min_angle: float, max_angle: float) -> None:

        if min_angle < 0 or min_angle > 240:
            raise ValueError("Angle must be in range 0~240.")

        if max_angle < 0 or max_angle > 240:
            raise ValueError("Angle must be in range 0~240.")

        if min_angle >= max_angle:
            raise ValueError("Max angle must be greater than min angle.")

        min_value = int(min_angle / 0.24)
        max_value = int(max_angle / 0.24)

        min_value_low = min_value & 0xFF
        min_value_high = (min_value >> 8) & 0xFF

        max_value_low = max_value & 0xFF
        max_value_high = (max_value >> 8) & 0xFF

        self.send_command(servo_id, SerialServo.SERVO_ANGLE_LIMIT_WRITE[0], [
                          min_value_low, min_value_high, max_value_low, max_value_high])

    def get_servo_angle_range(self, servo_id: int) -> tuple:

        self.send_command(servo_id, SerialServo.SERVO_ANGLE_LIMIT_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_ANGLE_LIMIT_READ[0], SerialServo.SERVO_ANGLE_LIMIT_READ[2])

        if len(params) == 0:
            return None

        min_angle = params[0] + (params[1] << 8)

        min_angle = min_angle * 0.24

        if min_angle < 0 or min_angle > 240:
            raise ValueError("Angle must be in range 0~240.")

        max_angle = params[2] + (params[3] << 8)

        max_angle = max_angle * 0.24

        if max_angle < 0 or max_angle > 240:
            raise ValueError("Angle must be in range 0~240.")

        if min_angle >= max_angle:
            raise ValueError("Min angle must be less than max angle.")

        return min_angle, max_angle

    def set_servo_vin_range(self, servo_id: int, min_vin: float, max_vin: float) -> None:

        if min_vin >= max_vin:
            raise ValueError(
                "Minimum voltage must be less than maximum voltage.")

        if min_vin < 4.5 or min_vin > 14.0:
            raise ValueError("Voltage must be in range 4.5V ~ 14.0V.")

        if max_vin < 4.5 or max_vin > 14.0:
            raise ValueError("Voltage must be in range 4.5V ~ 14.0V.")

        min_vin_mV = int(min_vin * 1000)
        max_vin_mV = int(max_vin * 1000)

        min_vin_low = min_vin_mV & 0xFF
        min_vin_high = (min_vin_mV >> 8) & 0xFF

        max_vin_low = max_vin_mV & 0xFF
        max_vin_high = (max_vin_mV >> 8) & 0xFF

        self.send_command(servo_id, SerialServo.SERVO_VIN_LIMIT_WRITE[0], [
                          min_vin_low, min_vin_high,  max_vin_low, max_vin_high])

    def get_servo_vin_range(self, servo_id: int) -> tuple:

        self.send_command(servo_id, SerialServo.SERVO_VIN_LIMIT_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_VIN_LIMIT_READ[0], SerialServo.SERVO_VIN_LIMIT_READ[2])

        if len(params) == 0:
            return None

        min_vin = params[0] + (params[1] << 8)

        min_vin = min_vin / 1000

        if min_vin < 4.5 or min_vin > 12.0:
            raise ValueError("Voltage must be in range 4.5V ~ 14.0V.")

        max_vin = params[2] + (params[3] << 8)

        max_vin = max_vin / 1000

        if max_vin < 4.5 or max_vin > 14.0:
            raise ValueError("Voltage must be in range 4.5V ~ 14.0V.")

        if min_vin >= max_vin:
            raise ValueError("Min voltage must be less than max voltage.")

        return min_vin, max_vin

    def set_servo_temp_range(self, servo_id: int, max_temp: int) -> None:

        if max_temp < 50 or max_temp > 100:
            raise ValueError(
                "Temperature must be between 50 and 100 degrees Celsius.")

        self.send_command(servo_id, SerialServo.SERVO_TEMP_MAX_LIMIT_WRITE[0], [
                          int(max_temp) & 0xFF])

    def get_servo_temp_range(self, servo_id: int) -> int:

        self.send_command(
            servo_id, SerialServo.SERVO_TEMP_MAX_LIMIT_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_TEMP_MAX_LIMIT_READ[0], SerialServo.SERVO_TEMP_MAX_LIMIT_READ[2])

        if len(params) == 0:
            return None

        max_temp_limit = params[0]

        if not (50 <= max_temp_limit <= 100):
            raise ValueError("Temperature limit is out of range.")

        return max_temp_limit

    def read_servo_temp(self, servo_id: int) -> int:

        self.send_command(servo_id, SerialServo.SERVO_TEMP_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_TEMP_READ[0], SerialServo.SERVO_TEMP_READ[2])

        if len(params) == 0:
            return None

        temperature = params[0]

        if not (0 <= temperature <= 100):
            raise ValueError("Temperature is out of range.")

        return temperature

    def read_servo_voltage(self, servo_id: int) -> float:

        self.send_command(servo_id, SerialServo.SERVO_VIN_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_VIN_READ[0], SerialServo.SERVO_VIN_READ[2])

        if len(params) == 0:
            return None

        voltage_value = params[0] + (params[1] << 8)

        voltage = voltage_value / 1000.0

        if not (4.5 <= voltage <= 12.0):
            raise ValueError("Voltage is out of range.")

        return voltage

    def read_servo_position(self, servo_id: int) -> float:

        self.send_command(servo_id, SerialServo.SERVO_POS_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_POS_READ[0], SerialServo.SERVO_POS_READ[2])

        if len(params) == 0:
            return None

        position_value = params[0] + (params[1] << 8)

        if position_value >= 0x8000:

            position_value -= 0x10000

        position_angle = (position_value / 1000) * 240

        if not (0 <= position_angle <= 240):
            raise ValueError("Position is out of range.")

        return position_angle

    def set_servo_mode_and_speed(self, servo_id: int, mode: int, speed: int) -> None:

        if mode not in [SerialServo.MODE_POSITION, SerialServo.MODE_MOTOR]:
            raise ValueError(
                "Invalid mode, must be SerialServo.MODE_POSITION or SerialServo.MODE_MOTOR.")

        if mode == SerialServo.MODE_MOTOR:
            if speed < -1000 or speed > 1000:
                raise ValueError(
                    "Speed must be between -1000 and 1000 in motor control mode.")

            if speed < 0:
                speed = (speed + 65536) % 65536

            low_byte = (speed & 0xFF)
            high_byte = ((speed >> 8) & 0xFF)
        else:

            low_byte = 0
            high_byte = 0

        self.send_command(servo_id, SerialServo.SERVO_OR_MOTOR_MODE_WRITE[0], [
                          mode, 0, low_byte, high_byte])

    def get_servo_mode_and_speed(self, servo_id: int) -> tuple:

        self.send_command(
            servo_id, SerialServo.SERVO_OR_MOTOR_MODE_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_OR_MOTOR_MODE_READ[0], SerialServo.SERVO_OR_MOTOR_MODE_READ[2])

        if len(params) == 0:
            return None

        mode = params[0]
        if mode not in [SerialServo.MODE_POSITION, SerialServo.MODE_MOTOR]:
            raise ValueError("Invalid servo mode.")

        if mode == SerialServo.MODE_MOTOR:

            speed_value = params[2] + (params[3] << 8)

            return mode, speed_value
        else:
            return mode, 0

    def set_servo_motor_load(self, servo_id: int, unload: bool) -> None:

        unload_value = 1 if unload else 0

        self.send_command(
            servo_id, SerialServo.SERVO_LOAD_OR_UNLOAD_WRITE[0], [unload_value])

    def get_servo_motor_load_status(self, servo_id: int) -> bool:

        self.send_command(
            servo_id, SerialServo.SERVO_LOAD_OR_UNLOAD_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_LOAD_OR_UNLOAD_READ[0], SerialServo.SERVO_LOAD_OR_UNLOAD_READ[2])

        if len(params) == 0:
            return None

        motor_status = params[0]
        if motor_status not in [0, 1]:
            raise ValueError("Invalid motor status value.")

        return motor_status == 1

    def set_servo_led(self, servo_id: int, led_on: bool) -> None:

        led_value = 1 if led_on else 0

        self.send_command(
            servo_id, SerialServo.SERVO_LED_CTRL_WRITE[0], [led_value])

    def get_servo_led(self, servo_id: int) -> bool:

        self.send_command(servo_id, SerialServo.SERVO_LED_CTRL_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_LED_CTRL_READ[0], SerialServo.SERVO_LED_CTRL_READ[2])

        if len(params) == 0:
            return None

        led_status = params[0]
        if led_status not in [0, 1]:
            raise ValueError("Invalid LED status value.")

        return led_status == 1

    def set_servo_led_alarm(self, servo_id: int, alarm_code: int) -> None:

        if alarm_code not in [SerialServo.ERROR_NO_ALARM,
                              SerialServo.ERROR_OVER_TEMP,
                              SerialServo.ERROR_OVER_VOLT,
                              SerialServo.ERROR_OVER_TEMP_AND_VOLT,
                              SerialServo.ERROR_STALL,
                              SerialServo.ERROR_OVER_TEMP_AND_STALL,
                              SerialServo.ERROR_OVER_VOLT_AND_STALL,
                              SerialServo.ERROR_ALL]:

            raise ValueError("Invalid alarm code. Must be between 0 and 7.")

        self.send_command(servo_id, 35, [alarm_code])

    def get_servo_led_alarm(self, servo_id: int) -> int:

        self.send_command(servo_id, SerialServo.SERVO_LED_ERROR_READ[0], [])

        time.sleep_ms(5)

        params = self.receive_command(
            SerialServo.SERVO_LED_ERROR_READ[0], SerialServo.SERVO_LED_ERROR_READ[2])

        if len(params) == 0:
            return None

        error_alarm_value = params[0]

        if error_alarm_value not in [SerialServo.ERROR_NO_ALARM,
                                     SerialServo.ERROR_OVER_TEMP,
                                     SerialServo.ERROR_OVER_VOLT,
                                     SerialServo.ERROR_OVER_TEMP_AND_VOLT,
                                     SerialServo.ERROR_STALL,
                                     SerialServo.ERROR_OVER_TEMP_AND_STALL,
                                     SerialServo.ERROR_OVER_VOLT_AND_STALL,
                                     SerialServo.ERROR_ALL]:

            raise ValueError("Error alarm value is out of range.")

        return error_alarm_value
