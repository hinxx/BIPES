

class DataFlowProcessor:
    def __init__(self, uart):
        self.uart = uart
        self.buffer = bytearray()
        self.stats = {
            'total_bytes_received': 0,
            'total_frames_parsed': 0,
            'crc_errors': 0,
            'frame_errors': 0,
            'invalid_frames': 0
        }

        self.max_buffer_size = 128

        self.HEADER = bytes([0x53, 0x59])
        self.TRAILER = bytes([0x54, 0x43])
        self.HEADER_LEN = 2
        self.CONTROL_LEN = 1
        self.COMMAND_LEN = 1
        self.LENGTH_LEN = 2
        self.CRC_LEN = 1
        self.TRAILER_LEN = 2
        self.MIN_FRAME_LEN = self.HEADER_LEN + self.CONTROL_LEN + \
            self.COMMAND_LEN + self.LENGTH_LEN + self.CRC_LEN + self.TRAILER_LEN

    def read_and_parse(self) -> list:

        data = self.uart.read(32)
        if not data:
            return []

        self.stats['total_bytes_received'] += len(data)

        if len(self.buffer) > self.max_buffer_size:
            self.clear_buffer()

        self.buffer.extend(data)

        frames = []
        processed_bytes = 0

        while len(self.buffer) - processed_bytes >= self.MIN_FRAME_LEN:

            header_pos = self._find_header(processed_bytes)
            if header_pos == -1:

                break

            current_pos = header_pos

            if current_pos + self.HEADER_LEN + self.CONTROL_LEN + self.COMMAND_LEN + self.LENGTH_LEN > len(self.buffer):
                break

            length_pos = current_pos + self.HEADER_LEN + self.CONTROL_LEN + self.COMMAND_LEN
            data_len = self._parse_data_length(length_pos)

            total_frame_len = self.HEADER_LEN + self.CONTROL_LEN + self.COMMAND_LEN + \
                self.LENGTH_LEN + data_len + self.CRC_LEN + self.TRAILER_LEN

            if current_pos + total_frame_len > len(self.buffer):
                break

            frame_end = current_pos + total_frame_len
            frame_data = self.buffer[current_pos:frame_end]

            if not self._validate_trailer(frame_data):
                self.stats['frame_errors'] += 1

                processed_bytes = current_pos + 1
                continue

            if not self._validate_crc(frame_data):
                self.stats['crc_errors'] += 1

                processed_bytes = current_pos + total_frame_len
                continue

            parsed_frame = self._parse_single_frame(frame_data)
            if parsed_frame:
                frames.append(parsed_frame)
                self.stats['total_frames_parsed'] += 1
            else:
                self.stats['invalid_frames'] += 1

            processed_bytes = current_pos + total_frame_len

        if processed_bytes > 0:
            self.buffer = self.buffer[processed_bytes:]

        return frames

    def _find_header(self, start_pos: int = 0) -> int:
        for i in range(start_pos, len(self.buffer) - 1):
            if self.buffer[i] == self.HEADER[0] and self.buffer[i + 1] == self.HEADER[1]:
                return i
        return -1

    def _parse_data_length(self, length_pos: int) -> int:
        if length_pos + 1 >= len(self.buffer):
            return 0

        return (self.buffer[length_pos] << 8) | self.buffer[length_pos + 1]

    def _validate_trailer(self, frame_data: bytes) -> bool:
        if len(frame_data) < 2:
            return False
        return (frame_data[-2] == self.TRAILER[0] and
                frame_data[-1] == self.TRAILER[1])

    def _validate_crc(self, frame_data: bytes) -> bool:
        if len(frame_data) < 3:
            return False

        data_to_check = frame_data[:-3]
        calculated_crc = sum(data_to_check) & 0xFF
        received_crc = frame_data[-3]

        return calculated_crc == received_crc

    def _parse_single_frame(self, frame_data: bytes) -> dict:
        try:
            pos = 0

            header = bytes(frame_data[pos:pos + 2])
            pos += 2

            control_byte = frame_data[pos]
            pos += 1

            command_byte = frame_data[pos]
            pos += 1

            data_length = (frame_data[pos] << 8) | frame_data[pos + 1]
            pos += 2

            data_end = pos + data_length
            if data_end > len(frame_data) - 3:
                return None
            data = bytes(frame_data[pos:data_end])
            pos = data_end

            crc = frame_data[pos]
            pos += 1

            trailer = bytes(frame_data[pos:pos + 2])

            parsed_frame = {
                'header': header,
                'control_byte': control_byte,
                'command_byte': command_byte,
                'data_length': data_length,
                'data': data,
                'crc': crc,
                'trailer': trailer,
                'raw_data': bytes(frame_data)
            }

            return parsed_frame

        except Exception as e:
            print(f"Frame parsing error: {e}")
            return None

    def get_stats(self):
        return self.stats.copy()

    def clear_buffer(self):
        self.buffer = bytearray()

    def build_and_send_frame(self, control_byte: int, command_byte: int, data: bytes = b'') -> bytes:
        try:

            header = self.HEADER

            control = bytes([control_byte])
            command = bytes([command_byte])

            data_length = len(data)
            length_bytes = bytes(
                [(data_length >> 8) & 0xFF, data_length & 0xFF])

            frame_without_crc = header + control + command + length_bytes + data

            crc = self._calculate_crc(frame_without_crc)

            trailer = self.TRAILER

            complete_frame = frame_without_crc + bytes([crc]) + trailer

            self.uart.write(complete_frame)

            return complete_frame

        except Exception as e:
            print(f"Frame building and sending error: {e}")
            return None

    def _calculate_crc(self, data_bytes: bytes) -> int:
        return sum(data_bytes) & 0xFF
