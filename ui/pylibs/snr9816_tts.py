

import struct
import time


class SNR9816_TTS:

    ACK = 0x41

    BUSY, IDLE, UNKNOWN = 0, 1, 2

    FRAME_HEADER = 0xFD
    CMD_SYNTHESIS = 0x01
    CMD_STATUS = 0x21
    CMD_PAUSE = 0x03
    CMD_RESUME = 0x04
    CMD_STOP = 0x02

    query_status_cmd = bytes([0xFD, 0x00, 0x01, 0x21])
    pause_synthesis_cmd = bytes([0XFD, 0X00, 0X01, 0X03])
    resume_synthesis_cmd = bytes([0XFD, 0X00, 0X01, 0X04])
    stop_synthesis_cmd = bytes([0XFD, 0X00, 0X01, 0X02])

    def __init__(self, uart):
        self._uart = uart

        self.encoding_gb2312 = 0x01
        self.encoding_utf8 = 0x04

    def _send_frame(self, cmd, encoding, data_bytes) -> bool:
        if encoding is not 0x04:
            raise ValueError("encoding must be 0x04 (UTF-8)")
        try:

            length = len(data_bytes) + 2
            length_bytes = struct.pack('>H', length)
            frame = struct.pack('B', SNR9816_TTS.FRAME_HEADER) + length_bytes
            frame += struct.pack('B', cmd) + \
                struct.pack('B', encoding) + data_bytes
            self._uart.write(frame)
            return True
        except:
            return False

    def _check_response(self, expected_response=None, timeout_ms=100) -> int | bool | None:
        start = time.ticks_ms()
        while time.ticks_diff(time.ticks_ms(), start) < timeout_ms:
            if self._uart.any():
                response = self._uart.read(1)
                if response:
                    received_byte = response[0]
                    if expected_response is None:
                        return received_byte
                    elif received_byte == expected_response:
                        return True
                    else:
                        return False

        if expected_response is None:
            return None
        else:
            return False

    def synthesize_text(self, text: str):
        status = self.query_status()
        if status != SNR9816_TTS.IDLE:
            print(f"Chip is busy (status: {status}), cannot synthesize now.")
            return False

        data_bytes = text.encode('utf-8')
        return self._send_frame(SNR9816_TTS.CMD_SYNTHESIS, self.encoding_utf8, data_bytes)

    def query_status(self) -> str:

        self._uart.write(SNR9816_TTS.query_status_cmd)
        self.response = self._check_response(
            expected_response=None, timeout_ms=100)
        if self.response is 0x4E:
            return SNR9816_TTS.BUSY
        if self.response is 0x4F:
            return SNR9816_TTS.IDLE
        return SNR9816_TTS.UNKNOWN

    def pause_synthesis(self) -> bool:
        self.response = self._check_response(
            expected_response=None, timeout_ms=100)
        if self._uart.write(SNR9816_TTS.pause_synthesis_cmd):
            if self.response is 0x41:
                return True
        return False

    def resume_synthesis(self) -> bool:
        self.response = self._check_response(
            expected_response=None, timeout_ms=100)
        if self._uart.write(SNR9816_TTS.resume_synthesis_cmd):
            if self.response is 0x41:
                return True
        return False

    def stop_synthesis(self) -> bool:
        self.response = self._check_response(
            expected_response=None, timeout_ms=100)
        if self._uart.write(SNR9816_TTS.stop_synthesis_cmd):
            if self.response is 0x41:
                return True
        return False

    def set_voice(self, voice_type: int) -> bool:
        if voice_type not in (0, 1):
            raise ValueError("voice_type must be 0 (female) or 1 (male)")
        text = f"[m{voice_type}]"
        return self.synthesize_text(text)

    def set_volume(self, level: int) -> bool:
        if level < 0 or level > 9:
            raise ValueError("level must be between 0 and 9")
        text = f"[v{level}]"
        return self.synthesize_text(text)

    def set_speed(self, level: int) -> bool:
        if level < 0 or level > 9:
            raise ValueError("level must be between 0 and 9")
        text = f"[s{level}]"
        return self.synthesize_text(text)

    def set_tone(self, level: int) -> bool:
        if level < 0 or level > 9:
            raise ValueError("level must be between 0 and 9")
        text = f"[t{level}]"
        return self.synthesize_text(text)

    def play_ringtone(self, num: int) -> bool:
        if num < 1 or num > 5:
            return False
        text = f"ring_{num}"
        return self.synthesize_text(text)

    def play_message_tone(self, num: int) -> bool:
        if num < 1 or num > 5:
            raise ValueError("num must be between 1 and 5")
        text = f"message_{num}"
        return self.synthesize_text(text)

    def play_alert_tone(self, num: int) -> bool:
        if num < 1 or num > 5:
            raise ValueError("num must be between 1 and 5")
        text = f"alert_{num}"
        return self.synthesize_text(text)
