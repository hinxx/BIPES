

from machine import UART, Pin
import time


class CH9328:

    MODIFIER_NONE = 0x00

    MODIFIER_LEFT_CTRL = 0x01

    MODIFIER_LEFT_SHIFT = 0x02

    MODIFIER_LEFT_ALT = 0x04

    MODIFIER_LEFT_GUI = 0x08

    MODIFIER_RIGHT_CTRL = 0x10

    MODIFIER_RIGHT_SHIFT = 0x20

    MODIFIER_RIGHT_ALT = 0x40

    MODIFIER_RIGHT_GUI = 0x80

    KEY_NONE = 0x00
    KEY_A = 0x04
    KEY_B = 0x05
    KEY_C = 0x06
    KEY_D = 0x07
    KEY_E = 0x08
    KEY_F = 0x09
    KEY_G = 0x0A
    KEY_H = 0x0B
    KEY_I = 0x0C
    KEY_J = 0x0D
    KEY_K = 0x0E
    KEY_L = 0x0F
    KEY_M = 0x10
    KEY_N = 0x11
    KEY_O = 0x12
    KEY_P = 0x13
    KEY_Q = 0x14
    KEY_R = 0x15
    KEY_S = 0x16
    KEY_T = 0x17
    KEY_U = 0x18
    KEY_V = 0x19
    KEY_W = 0x1A
    KEY_X = 0x1B
    KEY_Y = 0x1C
    KEY_Z = 0x1D
    KEY_1 = 0x1E
    KEY_2 = 0x1F
    KEY_3 = 0x20
    KEY_4 = 0x21
    KEY_5 = 0x22
    KEY_6 = 0x23
    KEY_7 = 0x24
    KEY_8 = 0x25
    KEY_9 = 0x26
    KEY_0 = 0x27
    KEY_ENTER = 0x28
    KEY_ESCAPE = 0x29
    KEY_BACKSPACE = 0x2A
    KEY_TAB = 0x2B
    KEY_SPACE = 0x2C

    KEY_MINUS = 0x2D

    KEY_EQUAL = 0x2E

    KEY_LEFT_BRACKET = 0x2F

    KEY_RIGHT_BRACKET = 0x30

    KEY_BACKSLASH = 0x31

    KEY_SEMICOLON = 0x33

    KEY_APOSTROPHE = 0x34

    KEY_GRAVE = 0x35

    KEY_COMMA = 0x36

    KEY_PERIOD = 0x37

    KEY_SLASH = 0x38

    KEY_CAPS_LOCK = 0x39

    KEY_F1 = 0x3A
    KEY_F2 = 0x3B
    KEY_F3 = 0x3C
    KEY_F4 = 0x3D
    KEY_F5 = 0x3E
    KEY_F6 = 0x3F
    KEY_F7 = 0x40
    KEY_F8 = 0x41
    KEY_F9 = 0x42
    KEY_F10 = 0x43
    KEY_F11 = 0x44
    KEY_F12 = 0x45

    KEY_PRINT_SCREEN = 0x46
    KEY_SCROLL_LOCK = 0x47
    KEY_PAUSE = 0x48
    KEY_INSERT = 0x49
    KEY_HOME = 0x4A
    KEY_PAGE_UP = 0x4B
    KEY_DELETE = 0x4C
    KEY_END = 0x4D
    KEY_PAGE_DOWN = 0x4E
    KEY_RIGHT_ARROW = 0x4F
    KEY_LEFT_ARROW = 0x50
    KEY_DOWN_ARROW = 0x51
    KEY_UP_ARROW = 0x52
    KEY_NUM_LOCK = 0x53
    KEY_KP_SLASH = 0x54
    KEY_KP_ASTERISK = 0x55
    KEY_KP_MINUS = 0x56
    KEY_KP_PLUS = 0x57
    KEY_KP_ENTER = 0x58
    KEY_KP_1 = 0x59
    KEY_KP_2 = 0x5A
    KEY_KP_3 = 0x5B
    KEY_KP_4 = 0x5C
    KEY_KP_5 = 0x5D
    KEY_KP_6 = 0x5E
    KEY_KP_7 = 0x5F
    KEY_KP_8 = 0x60
    KEY_KP_9 = 0x61
    KEY_KP_0 = 0x62
    KEY_KP_DOT = 0x63
    KEY_MENU = 0x65

    KEYBOARD_MODE = [0, 1, 2, 3]

    CHAR_TO_HID = {

        'a': KEY_A, 'b': KEY_B, 'c': KEY_C, 'd': KEY_D, 'e': KEY_E,
        'f': KEY_F, 'g': KEY_G, 'h': KEY_H, 'i': KEY_I, 'j': KEY_J,
        'k': KEY_K, 'l': KEY_L, 'm': KEY_M, 'n': KEY_N, 'o': KEY_O,
        'p': KEY_P, 'q': KEY_Q, 'r': KEY_R, 's': KEY_S, 't': KEY_T,
        'u': KEY_U, 'v': KEY_V, 'w': KEY_W, 'x': KEY_X, 'y': KEY_Y, 'z': KEY_Z,


        '1': KEY_1, '2': KEY_2, '3': KEY_3, '4': KEY_4, '5': KEY_5,
        '6': KEY_6, '7': KEY_7, '8': KEY_8, '9': KEY_9, '0': KEY_0,


        ' ': KEY_SPACE, '-': KEY_MINUS, '=': KEY_EQUAL,
        '[': KEY_LEFT_BRACKET, ']': KEY_RIGHT_BRACKET,
        '\\': KEY_BACKSLASH, ';': KEY_SEMICOLON, "'": KEY_APOSTROPHE,
        '`': KEY_GRAVE, ',': KEY_COMMA, '.': KEY_PERIOD, '/': KEY_SLASH,


        'A': KEY_A, 'B': KEY_B, 'C': KEY_C, 'D': KEY_D, 'E': KEY_E,
        'F': KEY_F, 'G': KEY_G, 'H': KEY_H, 'I': KEY_I, 'J': KEY_J,
        'K': KEY_K, 'L': KEY_L, 'M': KEY_M, 'N': KEY_N, 'O': KEY_O,
        'P': KEY_P, 'Q': KEY_Q, 'R': KEY_R, 'S': KEY_S, 'T': KEY_T,
        'U': KEY_U, 'V': KEY_V, 'W': KEY_W, 'X': KEY_X, 'Y': KEY_Y, 'Z': KEY_Z,
        '!': KEY_1, '@': KEY_2, '#': KEY_3, '$': KEY_4, '%': KEY_5,
        '^': KEY_6, '&': KEY_7, '*': KEY_8, '(': KEY_9, ')': KEY_0,
        '_': KEY_MINUS, '+': KEY_EQUAL,
        '{': KEY_LEFT_BRACKET, '}': KEY_RIGHT_BRACKET,
        '|': KEY_BACKSLASH, ':': KEY_SEMICOLON, '"': KEY_APOSTROPHE,
        '~': KEY_GRAVE, '<': KEY_COMMA, '>': KEY_PERIOD, '?': KEY_SLASH,


        '\n': KEY_ENTER, '\t': KEY_TAB, '\b': KEY_BACKSPACE,
    }

    SHIFT_CHARS = {
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
        'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
        '!', '@', '#', '$', '%', '^', '&', '*', '(', ')',
        '_', '+', '{', '}', '|', ':', '"', '~', '<', '>', '?'
    }

    def __init__(self, uart=UART):
        self.uart = uart
        self.current_mode = 0

    def set_keyboard_mode(self, mode: tuple) -> None:

        if mode not in CH9328.KEYBOARD_MODE:
            raise ValueError(f"Invalid keyboard mode; supported: {CH9328.KEYBOARD_MODE}")
        self.current_mode = mode

    def crlf(self):

        if self.current_mode not in (0, 2):

            print(f"Error: mode {self.current_mode} does not support this; only mode 0 or 2 does")
            return False

        if self.current_mode == 0:
            send_byte = b'\x1b'
            self.uart.write(send_byte)
        elif self.current_mode == 2:
            send_byte = b'\x28'
            self.uart.write(send_byte)
        time.sleep_ms(50)

        return True

    def send_ascii(self, char: str) -> None:

        if self.current_mode == 3:
            print("Warning: pass-through mode (Mode 3) has no send_ascii; use send_hid_packet")
            return

        if len(char) != 1:
            raise ValueError("send_ascii takes a single character")

        if ord(char) not in range(0x20, 0x7F):
            raise ValueError("only printable ASCII is supported (space to tilde)")

        self.uart.write(char.encode('ascii'))

        time.sleep_ms(1)

    def send_string(self, text: str) -> None:

        if self.current_mode == 3:
            print("Warning: pass-through mode (Mode 3) has no send_ascii; use send_hid_packet")
            return
        for char in text:
            self.send_ascii(char)
            time.sleep_ms(5)

    def send_hid_packet(self, packet: bytes) -> bool:

        if self.current_mode != 3:
            print("Error: send_hid_packet needs pass-through mode (Mode 3)")
            return False
        if len(packet) != 8:
            print("Error: a HID packet must be 8 bytes")
            return False

        try:
            self.uart.write(packet)
            time.sleep_ms(1)
            return True
        except Exception as e:
            print(f"Send failed: {e}")
            return False

    def press_key(self, key_code: int, modifier: int = MODIFIER_NONE) -> None:

        packet = bytes([

            modifier,

            0x00,

            key_code,

            0x00, 0x00, 0x00,

            0x00, 0x00
        ])
        self.send_hid_packet(packet)

    def release_key(self, key_code: int = None, modifier: int = MODIFIER_NONE) -> None:

        release_packet = b'\x00\x00\x00\x00\x00\x00\x00\x00'
        self.send_hid_packet(release_packet)

    def tap_key(self, key_code: int, modifier: int = MODIFIER_NONE, delay: int = 50) -> None:
        self.press_key(key_code, modifier)
        time.sleep_ms(delay)
        self.release_key()

    def hotkey(self, modifier: int, key_code: int, delay: int = 50) -> None:
        self.press_key(key_code, modifier)
        time.sleep_ms(delay)
        self.release_key()

    def type_text(self, text: str, delay: int = 10) -> None:
        for char in text:
            if char not in CH9328.CHAR_TO_HID:
                print(f"Warning: character {char} is not supported, skipped")
                continue

            modifier = CH9328.MODIFIER_LEFT_SHIFT if char.isupper() else CH9328.MODIFIER_NONE
            key_code = CH9328.CHAR_TO_HID[char]

            self.tap_key(key_code, modifier, delay=delay)
            time.sleep_ms(delay)
