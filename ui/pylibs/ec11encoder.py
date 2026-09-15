

from machine import Pin, Timer


class EC11Encoder:

    def __init__(self, pin_a: int, pin_b: int, pin_btn: int = None) -> None:

        self.pin_a = Pin(pin_a, Pin.IN)
        self.pin_b = Pin(pin_b, Pin.IN)

        if pin_btn is not None:

            self.pin_btn = Pin(pin_btn, Pin.IN, Pin.PULL_UP)

        self.rotation_count = 0

        self.button_pressed = False

        self.debounce_timer_a = Timer(-1)

        self.debounce_timer_btn = Timer(-1)

        self.debouncing_a = False

        self.debouncing_btn = False

        self.pin_a.irq(trigger=Pin.IRQ_RISING, handler=self._handle_rotation)

        if pin_btn is not None:

            self.pin_btn.irq(trigger=Pin.IRQ_FALLING |
                             Pin.IRQ_RISING, handler=self._handle_button)

    def _handle_rotation(self, pin: Pin) -> None:

        if self.debouncing_a:
            return

        self.debouncing_a = True
        self.debounce_timer_a.init(
            mode=Timer.ONE_SHOT, period=1, callback=self._check_debounce_a)

    def _check_debounce_a(self, t: Timer) -> None:

        if self.pin_a.value() == 1:

            current_state_b = self.pin_b.value()

            if current_state_b == 0:

                self.rotation_count += 1
            else:

                self.rotation_count -= 1

        self.debouncing_a = False

    def _handle_button(self, pin: Pin) -> None:

        if self.debouncing_btn:
            return

        self.debouncing_btn = True
        self.debounce_timer_btn.init(
            mode=Timer.ONE_SHOT, period=5, callback=self._check_debounce_btn)

    def _check_debounce_btn(self, t: Timer) -> None:
        if self.pin_btn.value() == 0:

            self.button_pressed = True
        else:

            self.button_pressed = False

        self.reset_rotation_count()

        self.debouncing_btn = False

    def get_rotation_count(self) -> int:
        return self.rotation_count

    def reset_rotation_count(self) -> None:
        self.rotation_count = 0

    def is_button_pressed(self) -> bool:
        return self.button_pressed
