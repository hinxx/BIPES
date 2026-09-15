

from pca9685 import PCA9685

from machine import Timer

import micropython


class BusStepMotor:

    DRIVER_MODE_SINGLE, DRIVER_MODE_DOUBLE, DRIVER_MODE_HALF_STEP = (0, 1, 2)

    FORWARD, BACKWARD = (0, 1)

    PHASES = {
        DRIVER_MODE_SINGLE: [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ],
        DRIVER_MODE_DOUBLE: [
            [1, 1, 0, 0],
            [0, 1, 1, 0],
            [0, 0, 1, 1],
            [1, 0, 0, 1],
        ],
        DRIVER_MODE_HALF_STEP: [
            [1, 0, 0, 0],
            [1, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 1, 0],
            [0, 0, 1, 0],
            [0, 0, 1, 1],
            [0, 0, 0, 1],
            [1, 0, 0, 1],
        ]
    }

    CONTINUOUS_MOTION, STEP_MOTION = (0, 1)

    def __init__(self, pca9685: PCA9685, motor_count: int = 2):

        if motor_count < 1 or motor_count > 4:
            raise ValueError(
                f"Invalid motor_count: {motor_count}. Motor count must be between 1 and 4.")

        if not isinstance(pca9685, PCA9685):
            raise ValueError(
                "Invalid pca9685. pca9685 must be an instance of PCA9685.")

        self.pca9685 = pca9685
        self.motor_count = motor_count

        self.timers = [Timer(-1) for _ in range(motor_count)]

        self.steps = [0 for _ in range(motor_count)]

        self.step_counters = [0 for _ in range(motor_count)]

        self.directions = [0 for _ in range(motor_count)]

        self.driver_modes = [0 for _ in range(motor_count)]

        self.speeds = [0 for _ in range(motor_count)]

        self.motor_modes = [
            BusStepMotor.CONTINUOUS_MOTION for _ in range(motor_count)]

        self.pca9685.reset()

        self.pca9685.freq(5000)

        for i in range(motor_count*4):
            self.pca9685.duty(i, 0)

    @micropython.native
    def _next_step(self, motor_id: int) -> None:

        current_step = self.step_counters[motor_id]
        driver_mode = self.driver_modes[motor_id]
        direction = self.directions[motor_id]

        phase_sequence = BusStepMotor.PHASES[driver_mode]

        current_phase = phase_sequence[current_step % len(phase_sequence)]

        base_channel = motor_id * 4

        for i in range(4):
            self.pca9685.duty(base_channel + i, 4095)

        for i in range(4):
            self.pca9685.duty(base_channel + i, current_phase[i] * 4095)

        if direction == BusStepMotor.FORWARD:
            self.step_counters[motor_id] += 1
        else:
            self.step_counters[motor_id] -= 1

        if abs(self.step_counters[motor_id]) >= self.steps[motor_id]:

            if self.motor_modes[motor_id] == BusStepMotor.STEP_MOTION:
                self.stop_step_motion(motor_id + 1)

            else:
                return

    def _start_timer(self, motor_id: int, speed: int) -> None:

        interval = max(1, int(1000 / speed))

        self.timers[motor_id].init(
            period=interval, mode=Timer.PERIODIC, callback=lambda t: self._next_step(motor_id))

    def _stop_timer(self, motor_id: int) -> None:
        self.timers[motor_id].deinit()

    @micropython.native
    def start_continuous_motion(self, motor_id: int, direction: int, driver_mode: int, speed: int) -> None:

        if not isinstance(speed, int) or speed < 0 or speed > 1000:
            raise ValueError(
                "Invalid speed: %d. Speed must be an integer between 0 and 1000." % speed)

        if motor_id < 1 or motor_id > self.motor_count:
            raise ValueError("Invalid motor_id: %d. Motor ID must be between 1 and %d." % (
                motor_id, self.motor_count))

        if direction != BusStepMotor.FORWARD and direction != BusStepMotor.BACKWARD:
            raise ValueError(
                "Invalid direction: %d. Direction must be FORWARD or BACKWARD." % direction)

        if driver_mode != BusStepMotor.DRIVER_MODE_SINGLE and driver_mode != BusStepMotor.DRIVER_MODE_DOUBLE and driver_mode != BusStepMotor.DRIVER_MODE_HALF_STEP:
            raise ValueError(
                "Invalid driver_mode: %d. Driver mode must be DRIVER_MODE_SINGLE, DRIVER_MODE_DOUBLE or DRIVER_MODE_HALF_STEP." % driver_mode)

        motor_id -= 1

        self.directions[motor_id] = direction
        self.driver_modes[motor_id] = driver_mode
        self.speeds[motor_id] = speed
        self.motor_modes[motor_id] = BusStepMotor.CONTINUOUS_MOTION

        self._start_timer(motor_id, speed)

    @micropython.native
    def stop_continuous_motion(self, motor_id: int) -> None:

        if motor_id < 1 or motor_id > self.motor_count:
            raise ValueError("Invalid motor_id: %d. Motor ID must be between 1 and %d." % (
                motor_id, self.motor_count))

        motor_id -= 1

        self._stop_timer(motor_id)

        self.step_counters[motor_id] = 0

        self.steps[motor_id] = 0

        pwm_start_index = (motor_id) * 4
        pwm_end_index = pwm_start_index + 3

        for pwm_index in range(pwm_start_index, pwm_end_index + 1):
            self.pca9685.duty(pwm_index, 0)

        print("stop_continuous_motion")

    @micropython.native
    def start_step_motion(self, motor_id: int, direction: int, driver_mode: int, speed: int, steps: int) -> None:

        if not isinstance(steps, int) or steps <= 0:
            raise ValueError(
                "Invalid steps: %d. Steps must be a positive integer." % steps)

        if not isinstance(speed, int) or speed < 0 or speed > 1000:
            raise ValueError(
                "Invalid speed: %d. Speed must be an integer between 0 and 1000." % speed)

        if motor_id < 1 or motor_id > self.motor_count:
            raise ValueError("Invalid motor_id: %d. Motor ID must be between 1 and %d." % (
                motor_id, self.motor_count))

        if direction != BusStepMotor.FORWARD and direction != BusStepMotor.BACKWARD:
            raise ValueError(
                "Invalid direction: %d. Direction must be FORWARD or BACKWARD." % direction)

        if driver_mode != BusStepMotor.DRIVER_MODE_SINGLE and driver_mode != BusStepMotor.DRIVER_MODE_DOUBLE and driver_mode != BusStepMotor.DRIVER_MODE_HALF_STEP:
            raise ValueError(
                "Invalid driver_mode: %d. Driver mode must be DRIVER_MODE_SINGLE, DRIVER_MODE_DOUBLE or DRIVER_MODE_HALF_STEP." % driver_mode)

        motor_id -= 1

        self.steps[motor_id] = steps
        self.directions[motor_id] = direction
        self.driver_modes[motor_id] = driver_mode
        self.speeds[motor_id] = speed
        self.motor_modes[motor_id] = BusStepMotor.STEP_MOTION

        self._start_timer(motor_id, speed)

    @micropython.native
    def stop_step_motion(self, motor_id: int) -> None:

        if motor_id < 1 or motor_id > self.motor_count:
            raise ValueError("Invalid motor_id: %d. Motor ID must be between 1 and %d." % (
                motor_id, self.motor_count))

        motor_id -= 1

        self._stop_timer(motor_id)

        self.step_counters[motor_id] = 0

        self.steps[motor_id] = 0

        pwm_start_index = (motor_id) * 4
        pwm_end_index = pwm_start_index + 3

        for pwm_index in range(pwm_start_index, pwm_end_index + 1):
            self.pca9685.duty(pwm_index, 0)

        self.motor_modes[motor_id] = BusStepMotor.CONTINUOUS_MOTION

        print("stop_step_motion")
