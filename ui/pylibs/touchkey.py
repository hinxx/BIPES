

from machine import Pin, Timer


class TouchKey:
    high, low = (1, 0)

    def __init__(self, pin_num: int, idle_state: int, debounce_time: int = 50, press_callback: callable = None, release_callback: callable = None):

        if not isinstance(pin_num, int):
            print("The pin_num must be int ")
            return
        if idle_state not in (TouchKey.low, TouchKey.high):
            print("The idle_state must be low or high")
            return
        if not isinstance(debounce_time, int) or debounce_time <= 0 or debounce_time > 100:
            print("The debounce_time must be between 0 and 100")
            return

        self.idle_state = idle_state

        self.debounce_time = debounce_time

        self.press_callback = press_callback

        self.release_callback = release_callback

        pull = Pin.PULL_UP if idle_state == 1 else Pin.PULL_DOWN
        self.pin = Pin(pin_num, Pin.IN, pull)

        self.last_stable_state = self.pin.value()

        self.pin.irq(

            trigger=Pin.IRQ_RISING | Pin.IRQ_FALLING,

            handler=self._irq_handler
        )

        self.debounce_timer = None

    def _irq_handler(self, pin):

        if self.debounce_timer:
            self.debounce_timer.deinit()

        self.debounce_timer = Timer(-1)
        self.debounce_timer.init(

            period=self.debounce_time,

            mode=Timer.ONE_SHOT,

            callback=lambda t: self._debounce_handler()
        )

    def _debounce_handler(self):
        current_value = self.pin.value()
        if current_value != self.last_stable_state:

            if current_value == self.idle_state:
                if self.release_callback:

                    self.release_callback()
            else:
                if self.press_callback:

                    self.press_callback()

            self.last_stable_state = current_value
        self.debounce_timer = None

    def get_state(self):
        return self.last_stable_state != self.idle_state
