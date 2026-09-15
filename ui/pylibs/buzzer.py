

import time

from machine import Pin, PWM


NOTE_FREQS = {
    'C4': 261, 'D4': 293, 'E4': 329, 'F4': 349, 'G4': 392, 'A4': 440, 'B4': 493,
    'C5': 523, 'D5': 587, 'E5': 659, 'F5': 698, 'G5': 784, 'A5': 880, 'B5': 987,
    'C3': 130, 'D3': 146, 'E3': 164, 'F3': 174, 'G3': 196, 'A3': 220, 'B3': 246
}


class Buzzer:

    def __init__(self, pin: int):

        self.buzzer = PWM(Pin(pin))

        self.buzzer.freq(2000)

        self.buzzer.duty_u16(0)

    def play_tone(self, frequency: int, duration: int) -> None:

        self.buzzer.freq(frequency)

        self.buzzer.duty_u16(32768)

        time.sleep_ms(duration)

        self.buzzer.duty_u16(0)

    def play_melody(self, melody: list) -> None:
        for note, duration in melody:

            frequency = NOTE_FREQS.get(note, 0)
            if frequency:

                self.play_tone(frequency, duration)

            time.sleep_ms(10)

    def stop_tone(self) -> None:
        self.buzzer.duty_u16(0)
