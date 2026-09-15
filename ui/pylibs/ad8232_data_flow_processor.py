

class DataFlowProcessor:

    def __init__(self, uart):
        self.uart = uart
        self.buffer = bytearray()
        self.stats = {
            'total_bytes_received': 0,
            'total_frames_parsed': 0,
            'crc_errors': 0,
            'frame_errors': 0,
            'invalid_frames': 0,
            'command_frames': 0,
            'data_frames': 0,
            'timeout_frames': 0
        }

        self.max_buffer_size = 256

        self.HEADER = bytes([0xAA, 0x55])
        self.TRAILER = bytes([0x0D, 0x0A])
        self.HEADER_LEN = 2
        self.TYPE_LEN = 1
        self.LENGTH_LEN = 1
        self.CRC_LEN = 1
        self.TRAILER_LEN = 2
        self.MIN_FRAME_LEN = self.HEADER_LEN + self.TYPE_LEN + \
            self.LENGTH_LEN + self.CRC_LEN + self.TRAILER_LEN

        self.FRAME_TYPE_COMMAND = 0x01
        self.FRAME_TYPE_DATA = 0x02

    def read_and_parse(self):

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

            if current_pos + self.HEADER_LEN + self.TYPE_LEN + self.LENGTH_LEN > len(self.buffer):
                break

            length_pos = current_pos + self.HEADER_LEN + self.TYPE_LEN
            data_len = self.buffer[length_pos]

            total_frame_len = (self.HEADER_LEN + self.TYPE_LEN + self.LENGTH_LEN +
                               data_len + self.CRC_LEN + self.TRAILER_LEN)

            if current_pos + total_frame_len > len(self.buffer):
                break

            frame_end = current_pos + total_frame_len
            frame_data = self.buffer[current_pos:frame_end]

            if not self._validate_trailer(frame_data):
                self.stats['frame_errors'] += 1

                processed_bytes = current_pos + 1
                continue

            if frame_data[-3] != self._calculate_crc(frame_data[0:-3]):
                self.stats['crc_errors'] += 1

                processed_bytes = current_pos + total_frame_len
                continue

            parsed_frame = self._parse_single_frame(frame_data)
            if parsed_frame:
                frames.append(parsed_frame)
                self.stats['total_frames_parsed'] += 1

                frame_type = parsed_frame.get('frame_type')
                if frame_type == self.FRAME_TYPE_COMMAND:
                    self.stats['command_frames'] += 1
                elif frame_type == self.FRAME_TYPE_DATA:
                    self.stats['data_frames'] += 1
            else:
                self.stats['invalid_frames'] += 1

            processed_bytes = current_pos + total_frame_len

        if processed_bytes > 0:
            self.buffer = self.buffer[processed_bytes:]

        return frames

    def _find_header(self, start_pos=0):
        for i in range(start_pos, len(self.buffer) - 1):
            if self.buffer[i] == self.HEADER[0] and self.buffer[i + 1] == self.HEADER[1]:
                return i
        return -1

    def _validate_trailer(self, frame_data):
        if len(frame_data) < 2:
            return False
        return (frame_data[-2] == self.TRAILER[0] and
                frame_data[-1] == self.TRAILER[1])

    def _calculate_crc(self, data_bytes):
        return sum(data_bytes) & 0xFF

    def _parse_single_frame(self, frame_data):
        try:
            pos = 0

            header = bytes(frame_data[pos:pos + 2])
            pos += 2

            frame_type = frame_data[pos]
            pos += 1

            data_length = frame_data[pos]
            pos += 1

            data_end = pos + data_length
            if data_end > len(frame_data) - 3:
                return None
            data = bytes(frame_data[pos:data_end])
            pos = data_end

            crc_check = frame_data[pos]
            pos += 1

            trailer = bytes(frame_data[pos:pos + 2])

            parsed_frame = {
                'header': header,
                'frame_type': frame_type,
                'data_length': data_length,
                'data': data,
                'crc_check': crc_check,
                'trailer': trailer,
                'raw_data': bytes(frame_data),
                'frame_type_str': self._get_frame_type_string(frame_type)
            }

            return parsed_frame

        except Exception as e:
            print(f"Frame parsing error: {e}")
            return None

    def _get_frame_type_string(self, frame_type):
        if frame_type == self.FRAME_TYPE_COMMAND:
            return "指令帧"
        elif frame_type == self.FRAME_TYPE_DATA:
            return "数据帧"
        else:
            return f"未知帧类型(0x{frame_type:02X})"

    def get_stats(self):
        return self.stats.copy()

    def clear_buffer(self):
        self.buffer = bytearray()

    def build_and_send_frame(self, frame_type, data=b''):
        try:

            data_length = len(data)
            if data_length > 255:
                print(f"Data length {data_length} exceeds maximum 255 bytes")
                return None

            header = self.HEADER

            type_byte = bytes([frame_type])
            length_byte = bytes([data_length])

            data_for_crc = header + type_byte + length_byte + data

            crc_value = self._calculate_crc(data_for_crc)

            trailer = self.TRAILER

            complete_frame = data_for_crc + bytes([crc_value]) + trailer

            self.uart.write(complete_frame)

            return complete_frame

        except Exception as e:
            print(f"Frame building and sending error: {e}")
            return None

    def build_and_send_command(self, command_data):
        return self.build_and_send_frame(self.FRAME_TYPE_COMMAND, command_data)

    def build_and_send_data(self, sensor_data):
        return self.build_and_send_frame(self.FRAME_TYPE_DATA, sensor_data)

    def reset_stats(self):
        for key in self.stats:
            self.stats[key] = 0
