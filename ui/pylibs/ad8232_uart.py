

from machine import UART, Pin, Timer
import micropython


class AD8232_DataFlowProcessor:
    DEBUG_ENABLED = False

    def __init__(self, data_flow_processor, parse_interval=5):
        self.DataFlowProcessor = data_flow_processor
        self.parse_interval = parse_interval
        self._timer = Timer()
        self._is_running = False

        self.ecg_value = 0

        self.filtered_ecg_value = 0

        self.heart_rate = 0

        self.active_reporting = False

        self.reporting_frequency = 100

        self.lead_status = 0

        self.operating_status = 0
        self._start_timer()

    def _start_timer(self):
        self._is_running = True
        self._timer.init(period=self.parse_interval,
                         mode=Timer.PERIODIC, callback=self._timer_callback)

    def _timer_callback(self, timer):
        if not self._is_running:
            return

        frames = self.DataFlowProcessor.read_and_parse()

        for frame in frames:
            self.update_properties_from_frame(frame)

    def update_properties_from_frame(self, frame):
        command = frame['frame_type']
        data = frame['data']
        if len(data) == 0:
            return

        if command == 0x01:
            if data:
                self.ecg_value = (data[0] << 8) | data[1]
                if AD8232_DataFlowProcessor.DEBUG_ENABLED:
                    print("ECG Value:", self.ecg_value)

        elif command == 0x02:
            if data:
                self.filtered_ecg_value = (data[0] << 8) | data[1]
                if AD8232_DataFlowProcessor.DEBUG_ENABLED:
                    print("ECG Value:", self.filtered_ecg_value)

        elif command == 0x03:
            if data:
                self.lead_status = data[0]
                if AD8232_DataFlowProcessor.DEBUG_ENABLED:
                    print("Lead Status:", self.lead_status)

        elif command == 0x04:

            if data:
                if data[0] in [100, 125, 50]:
                    self.reporting_frequency = data[0]
                    if AD8232_DataFlowProcessor.DEBUG_ENABLED:
                        print("Reporting Frequency set to:",
                              self.reporting_frequency)

        elif command == 0x05:
            if data:
                self.active_reporting = bool(data[0])
                if AD8232_DataFlowProcessor.DEBUG_ENABLED:
                    print("Active Reporting set to:", self.active_reporting)

        elif command == 0x06:

            if data:
                if data[0] == 0:
                    self.operating_status = data[0]
                elif data[0] == 1:
                    self.operating_status = data[0]
                else:
                    if AD8232_DataFlowProcessor.DEBUG_ENABLED:
                        print("Invalid Operating Status:", data[0])
                if AD8232_DataFlowProcessor.DEBUG_ENABLED:
                    print("Operating Status set to:", self.operating_status)

        elif command == 0x07:
            if data:
                self.operating_status = data[0]
                if AD8232_DataFlowProcessor.DEBUG_ENABLED:
                    print("Operating Status:", self.operating_status)

        elif command == 0x08:
            if data:
                self.heart_rate = data[0]
                if AD8232_DataFlowProcessor.DEBUG_ENABLED:
                    print("Heart Rate:", self.heart_rate)

    def query_raw_ecg_data(self):

        self.DataFlowProcessor.build_and_send_frame(0x01, bytes([0x00]))
        return self.ecg_value

    def query_off_detection_status(self):

        self.DataFlowProcessor.build_and_send_frame(0x03, bytes([0x00]))
        return self.lead_status

    def query_filtered_ecg_data(self):

        self.DataFlowProcessor.build_and_send_frame(0x02, bytes([0x00]))

        return self.filtered_ecg_value

    def set_active_output_mode(self):

        self.DataFlowProcessor.build_and_send_frame(0x04, bytes([0x02]))
        return self.reporting_frequency

    def set_active_output(self, state):

        self.DataFlowProcessor.build_and_send_frame(0x05, bytes([state]))

        return self.active_reporting

    def control_ad8232_start_stop(self, state):

        self.DataFlowProcessor.build_and_send_frame(0x06, bytes([state]))
        return self.operating_status

    def query_module_status(self):

        self.DataFlowProcessor.build_and_send_frame(0x07, bytes([0x00]))
        return self.operating_status

    def query_heart_rate(self):

        self.DataFlowProcessor.build_and_send_frame(0x08, bytes([0x00]))
        return self.heart_rate
