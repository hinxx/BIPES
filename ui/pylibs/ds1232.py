
from machine import Pin, Timer


class DS1232:

    def __init__(self, wdi_pin: int, feed_interval: int = 1000) -> None:

        if not isinstance(wdi_pin, int):
            raise ValueError("wdi pin must be an integer")
        if feed_interval > 1000:
            raise ValueError("feed_interval must be less than 1000ms")

        self.wdi = Pin(wdi_pin, Pin.OUT)

        self.state = 0
        self.timer = Timer(-1)

        self.timer.init(period=feed_interval,
                        mode=Timer.PERIODIC, callback=self._feed)

    def _feed(self, t: Timer) -> None:

        self.state ^= 1
        self.wdi.value(self.state)

    def stop(self) -> None:
        self.timer.deinit()
        self.wdi.value(0)

    def kick(self) -> None:
        self.state ^= 1
        self.wdi.value(self.state)
