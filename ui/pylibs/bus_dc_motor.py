

from pca9685 import PCA9685


class BusDCMotor:

    def __init__(self, pca9685: PCA9685, motor_count: int = 4):

        if motor_count > 4 or motor_count < 1:
            raise ValueError(
                f"Invalid motor_count: {motor_count}. Motor count must be between 1 and 4.")

        if not isinstance(pca9685, PCA9685):
            raise ValueError(
                "Invalid pca9685. pca9685 must be an instance of PCA9685.")

        self.pca9685 = pca9685
        self.motor_count = motor_count

        self.pca9685.freq(1000)

        for i in range(8):
            self.pca9685.duty(i, 4095)

    def set_motor_speed(self, motor_id: int, speed: int, direction: int = 0) -> None:
        if motor_id < 1 or motor_id > self.motor_count:
            raise ValueError(
                f"Invalid motor_id: {motor_id}. Motor ID must be between 1 and {self.motor_count}.")

        if not 1900 <= speed <= 4095:
            raise ValueError(
                f"Invalid speed: {speed}. Speed must be between 1900 and 4095.")

        pwm_index = (motor_id - 1) * 2

        if direction == 0:

            self.pca9685.duty(pwm_index, speed)
            print(pwm_index, speed)

            self.pca9685.duty(pwm_index + 1, 0)
            print(pwm_index + 1, 0)
        elif direction == 1:

            self.pca9685.duty(pwm_index + 1, speed)
            print(pwm_index + 1, speed)

            self.pca9685.duty(pwm_index, 0)
            print(pwm_index, 0)
        else:
            raise ValueError(
                "Invalid direction. Use 0 for forward or 1 for backward.")

    def stop_motor(self, motor_id: int) -> None:
        if motor_id < 1 or motor_id > self.motor_count:
            raise ValueError(
                f"Invalid motor_id: {motor_id}. Motor ID must be between 1 and {self.motor_count}.")

        pwm_index = (motor_id - 1) * 2

        self.pca9685.duty(pwm_index, 0)
        self.pca9685.duty(pwm_index + 1, 0)

    def break_motor(self, motor_id: int) -> None:
        if motor_id < 1 or motor_id > self.motor_count:
            raise ValueError(
                f"Invalid motor_id: {motor_id}. Motor ID must be between 1 and {self.motor_count}.")

        pwm_index = (motor_id - 1) * 2

        self.pca9685.duty(pwm_index, 4095)
        self.pca9685.duty(pwm_index + 1, 4095)
