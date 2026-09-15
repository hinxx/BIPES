

from machine import Timer
import time
import micropython


def format_time():
    t = time.localtime()
    ms = time.ticks_ms() % 1000
    return f"[{t[0]}-{t[1]:02d}-{t[2]:02d} {t[3]:02d}:{t[4]:02d}:{t[5]:02d}.{ms:03d}]"


def timed_function(f: callable, *args: tuple, **kwargs: dict) -> callable:
    myname = str(f).split(' ')[1]

    def new_func(*args: tuple, **kwargs: dict) -> any:
        t: int = time.ticks_us()
        result = f(*args, **kwargs)
        delta: int = time.ticks_diff(time.ticks_us(), t)
        print('Function {} Time = {:6.3f}ms'.format(myname, delta / 1000))
        return result

    return new_func


class DeviceInitializationError(Exception):
    pass


class R60ABD1:

    DEBUG_ENABLED = False

    MOTION_NONE, MOTION_STATIC, MOTION_ACTIVE = (0x00, 0x01, 0x02)

    BREATH_NORMAL, BREATH_HIGH, BREATH_LOW, BREATH_NONE = (
        0x01, 0x02, 0x03, 0x04)

    BED_LEAVE, BED_ENTER, BED_NONE = (0x00, 0x01, 0x02)

    SLEEP_DEEP, SLEEP_LIGHT, SLEEP_AWAKE, SLEEP_NONE = (0x00, 0x01, 0x02, 0x03)

    SLEEP_ANOMALY_NONE, SLEEP_ANOMALY_SHORT, SLEEP_ANOMALY_LONG, SLEEP_ANOMALY_NO_PERSON = (
        0x03, 0x00, 0x01, 0x02)

    SLEEP_QUALITY_NONE, SLEEP_QUALITY_GOOD, SLEEP_QUALITY_NORMAL, SLEEP_QUALITY_POOR = (
        0x00, 0x01, 0x02, 0x03)

    STRUGGLE_NONE, STRUGGLE_NORMAL, STRUGGLE_ABNORMAL = (0x00, 0x01, 0x02)

    NO_PERSON_TIMING_NONE, NO_PERSON_TIMING_NORMAL, NO_PERSON_TIMING_ABNORMAL = (
        0x00, 0x01, 0x02)

    SENSITIVITY_LOW, SENSITIVITY_MEDIUM, SENSITIVITY_HIGH = (0x00, 0x01, 0x02)

    TYPE_QUERY_HEARTBEAT = 0

    TYPE_MODULE_RESET = 1

    TYPE_QUERY_PRODUCT_MODEL = 2

    TYPE_QUERY_PRODUCT_ID = 3

    TYPE_QUERY_HARDWARE_MODEL = 4

    TYPE_QUERY_FIRMWARE_VERSION = 5

    TYPE_QUERY_INIT_COMPLETE = 6

    TYPE_QUERY_RADAR_RANGE_BOUNDARY = 7

    TYPE_CONTROL_HUMAN_PRESENCE_ON = 8

    TYPE_CONTROL_HUMAN_PRESENCE_OFF = 9

    TYPE_QUERY_HUMAN_PRESENCE_SWITCH = 10

    TYPE_QUERY_HUMAN_EXISTENCE_INFO = 11

    TYPE_QUERY_HUMAN_MOTION_INFO = 12

    TYPE_QUERY_HUMAN_BODY_MOTION_PARAM = 13

    TYPE_QUERY_HUMAN_DISTANCE = 14

    TYPE_QUERY_HUMAN_DIRECTION = 15

    TYPE_CONTROL_HEART_RATE_MONITOR_ON = 16

    TYPE_CONTROL_HEART_RATE_MONITOR_OFF = 17

    TYPE_QUERY_HEART_RATE_MONITOR_SWITCH = 18

    TYPE_CONTROL_HEART_RATE_WAVEFORM_REPORT_ON = 19

    TYPE_CONTROL_HEART_RATE_WAVEFORM_REPORT_OFF = 20

    TYPE_QUERY_HEART_RATE_WAVEFORM_REPORT_SWITCH = 21

    TYPE_QUERY_HEART_RATE_VALUE = 22

    TYPE_QUERY_HEART_RATE_WAVEFORM = 23

    TYPE_CONTROL_BREATH_MONITOR_ON = 24

    TYPE_CONTROL_BREATH_MONITOR_OFF = 25

    TYPE_QUERY_BREATH_MONITOR_SWITCH = 26

    TYPE_SET_LOW_BREATH_THRESHOLD = 27

    TYPE_QUERY_LOW_BREATH_THRESHOLD = 28

    TYPE_QUERY_BREATH_INFO = 29

    TYPE_QUERY_BREATH_VALUE = 30

    TYPE_CONTROL_BREATH_WAVEFORM_REPORT_ON = 31

    TYPE_CONTROL_BREATH_WAVEFORM_REPORT_OFF = 32

    TYPE_QUERY_BREATH_WAVEFORM_REPORT_SWITCH = 33

    TYPE_QUERY_BREATH_WAVEFORM = 34

    TYPE_CONTROL_SLEEP_MONITOR_ON = 35

    TYPE_CONTROL_SLEEP_MONITOR_OFF = 36

    TYPE_QUERY_SLEEP_MONITOR_SWITCH = 37

    TYPE_CONTROL_ABNORMAL_STRUGGLE_ON = 38

    TYPE_CONTROL_ABNORMAL_STRUGGLE_OFF = 39

    TYPE_QUERY_ABNORMAL_STRUGGLE_SWITCH = 40

    TYPE_QUERY_ABNORMAL_STRUGGLE_STATUS = 41

    TYPE_SET_STRUGGLE_SENSITIVITY = 42

    TYPE_QUERY_STRUGGLE_SENSITIVITY = 43

    TYPE_CONTROL_NO_PERSON_TIMING_ON = 44

    TYPE_CONTROL_NO_PERSON_TIMING_OFF = 45

    TYPE_QUERY_NO_PERSON_TIMING_SWITCH = 46

    TYPE_SET_NO_PERSON_TIMING_DURATION = 47

    TYPE_QUERY_NO_PERSON_TIMING_DURATION = 48

    TYPE_QUERY_NO_PERSON_TIMING_STATUS = 61

    TYPE_SET_SLEEP_END_DURATION = 49

    TYPE_QUERY_SLEEP_END_DURATION = 50

    TYPE_QUERY_BED_STATUS = 51

    TYPE_QUERY_SLEEP_STATUS = 52

    TYPE_QUERY_AWAKE_DURATION = 53

    TYPE_QUERY_LIGHT_SLEEP_DURATION = 54

    TYPE_QUERY_DEEP_SLEEP_DURATION = 55

    TYPE_QUERY_SLEEP_QUALITY_SCORE = 56

    TYPE_QUERY_SLEEP_COMPREHENSIVE_STATUS = 57

    TYPE_QUERY_SLEEP_ANOMALY = 58

    TYPE_QUERY_SLEEP_STATISTICS = 59

    TYPE_QUERY_SLEEP_QUALITY_LEVEL = 60

    COMMAND_MAP = {

        TYPE_QUERY_HEARTBEAT: {
            'control_byte': 0x01,
            'command_byte': 0x80,
            'data': bytes([0x0F])
        },
        TYPE_MODULE_RESET: {
            'control_byte': 0x01,
            'command_byte': 0x02,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_PRODUCT_MODEL: {
            'control_byte': 0x02,
            'command_byte': 0xA1,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_PRODUCT_ID: {
            'control_byte': 0x02,
            'command_byte': 0xA2,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_HARDWARE_MODEL: {
            'control_byte': 0x02,
            'command_byte': 0xA3,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_FIRMWARE_VERSION: {
            'control_byte': 0x02,
            'command_byte': 0xA4,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_INIT_COMPLETE: {
            'control_byte': 0x05,
            'command_byte': 0x81,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_RADAR_RANGE_BOUNDARY: {
            'control_byte': 0x07,
            'command_byte': 0x87,
            'data': bytes([0x0F])
        },


        TYPE_CONTROL_HUMAN_PRESENCE_ON: {
            'control_byte': 0x80,
            'command_byte': 0x00,
            'data': bytes([0x01])
        },
        TYPE_CONTROL_HUMAN_PRESENCE_OFF: {
            'control_byte': 0x80,
            'command_byte': 0x00,
            'data': bytes([0x00])
        },
        TYPE_QUERY_HUMAN_PRESENCE_SWITCH: {
            'control_byte': 0x80,
            'command_byte': 0x80,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_HUMAN_EXISTENCE_INFO: {
            'control_byte': 0x80,
            'command_byte': 0x81,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_HUMAN_MOTION_INFO: {
            'control_byte': 0x80,
            'command_byte': 0x82,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_HUMAN_BODY_MOTION_PARAM: {
            'control_byte': 0x80,
            'command_byte': 0x83,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_HUMAN_DISTANCE: {
            'control_byte': 0x80,
            'command_byte': 0x84,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_HUMAN_DIRECTION: {
            'control_byte': 0x80,
            'command_byte': 0x85,
            'data': bytes([0x0F])
        },


        TYPE_CONTROL_HEART_RATE_MONITOR_ON: {
            'control_byte': 0x85,
            'command_byte': 0x00,
            'data': bytes([0x01])
        },
        TYPE_CONTROL_HEART_RATE_MONITOR_OFF: {
            'control_byte': 0x85,
            'command_byte': 0x00,
            'data': bytes([0x00])
        },
        TYPE_QUERY_HEART_RATE_MONITOR_SWITCH: {
            'control_byte': 0x85,
            'command_byte': 0x80,
            'data': bytes([0x0F])
        },
        TYPE_CONTROL_HEART_RATE_WAVEFORM_REPORT_ON: {
            'control_byte': 0x85,
            'command_byte': 0x0A,
            'data': bytes([0x01])
        },
        TYPE_CONTROL_HEART_RATE_WAVEFORM_REPORT_OFF: {
            'control_byte': 0x85,
            'command_byte': 0x0A,
            'data': bytes([0x00])
        },
        TYPE_QUERY_HEART_RATE_WAVEFORM_REPORT_SWITCH: {
            'control_byte': 0x85,
            'command_byte': 0x8A,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_HEART_RATE_VALUE: {
            'control_byte': 0x85,
            'command_byte': 0x82,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_HEART_RATE_WAVEFORM: {
            'control_byte': 0x85,
            'command_byte': 0x85,
            'data': bytes([0x0F])
        },


        TYPE_CONTROL_BREATH_MONITOR_ON: {
            'control_byte': 0x81,
            'command_byte': 0x00,
            'data': bytes([0x01])
        },
        TYPE_CONTROL_BREATH_MONITOR_OFF: {
            'control_byte': 0x81,
            'command_byte': 0x00,
            'data': bytes([0x00])
        },
        TYPE_QUERY_BREATH_MONITOR_SWITCH: {
            'control_byte': 0x81,
            'command_byte': 0x80,
            'data': bytes([0x0F])
        },
        TYPE_SET_LOW_BREATH_THRESHOLD: {
            'control_byte': 0x81,
            'command_byte': 0x0B,
            'data': None
        },
        TYPE_QUERY_LOW_BREATH_THRESHOLD: {
            'control_byte': 0x81,
            'command_byte': 0x8B,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_BREATH_INFO: {
            'control_byte': 0x81,
            'command_byte': 0x81,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_BREATH_VALUE: {
            'control_byte': 0x81,
            'command_byte': 0x82,
            'data': bytes([0x0F])
        },
        TYPE_CONTROL_BREATH_WAVEFORM_REPORT_ON: {
            'control_byte': 0x81,
            'command_byte': 0x0C,
            'data': bytes([0x01])
        },
        TYPE_CONTROL_BREATH_WAVEFORM_REPORT_OFF: {
            'control_byte': 0x81,
            'command_byte': 0x0C,
            'data': bytes([0x00])
        },
        TYPE_QUERY_BREATH_WAVEFORM_REPORT_SWITCH: {
            'control_byte': 0x81,
            'command_byte': 0x8C,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_BREATH_WAVEFORM: {
            'control_byte': 0x81,
            'command_byte': 0x85,
            'data': bytes([0x0F])
        },


        TYPE_CONTROL_SLEEP_MONITOR_ON: {
            'control_byte': 0x84,
            'command_byte': 0x00,
            'data': bytes([0x01])
        },
        TYPE_CONTROL_SLEEP_MONITOR_OFF: {
            'control_byte': 0x84,
            'command_byte': 0x00,
            'data': bytes([0x00])
        },
        TYPE_QUERY_SLEEP_MONITOR_SWITCH: {
            'control_byte': 0x84,
            'command_byte': 0x80,
            'data': bytes([0x0F])
        },
        TYPE_CONTROL_ABNORMAL_STRUGGLE_ON: {
            'control_byte': 0x84,
            'command_byte': 0x13,
            'data': bytes([0x01])
        },
        TYPE_CONTROL_ABNORMAL_STRUGGLE_OFF: {
            'control_byte': 0x84,
            'command_byte': 0x13,
            'data': bytes([0x00])
        },
        TYPE_QUERY_ABNORMAL_STRUGGLE_SWITCH: {
            'control_byte': 0x84,
            'command_byte': 0x93,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_ABNORMAL_STRUGGLE_STATUS: {
            'control_byte': 0x84,
            'command_byte': 0x91,
            'data': bytes([0x0F])
        },
        TYPE_SET_STRUGGLE_SENSITIVITY: {
            'control_byte': 0x84,
            'command_byte': 0x1A,
            'data': None
        },
        TYPE_QUERY_STRUGGLE_SENSITIVITY: {
            'control_byte': 0x84,
            'command_byte': 0x9A,
            'data': bytes([0x0F])
        },
        TYPE_CONTROL_NO_PERSON_TIMING_ON: {
            'control_byte': 0x84,
            'command_byte': 0x14,
            'data': bytes([0x01])
        },
        TYPE_CONTROL_NO_PERSON_TIMING_OFF: {
            'control_byte': 0x84,
            'command_byte': 0x14,
            'data': bytes([0x00])
        },
        TYPE_QUERY_NO_PERSON_TIMING_SWITCH: {
            'control_byte': 0x84,
            'command_byte': 0x94,
            'data': bytes([0x0F])
        },
        TYPE_SET_NO_PERSON_TIMING_DURATION: {
            'control_byte': 0x84,
            'command_byte': 0x15,
            'data': None
        },
        TYPE_QUERY_NO_PERSON_TIMING_DURATION: {
            'control_byte': 0x84,
            'command_byte': 0x95,
            'data': bytes([0x0F])
        },

        TYPE_QUERY_NO_PERSON_TIMING_STATUS: {
            'control_byte': 0x84,
            'command_byte': 0x92,
            'data': bytes([0x0F])
        },
        TYPE_SET_SLEEP_END_DURATION: {
            'control_byte': 0x84,
            'command_byte': 0x16,
            'data': None
        },
        TYPE_QUERY_SLEEP_END_DURATION: {
            'control_byte': 0x84,
            'command_byte': 0x96,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_BED_STATUS: {
            'control_byte': 0x84,
            'command_byte': 0x81,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_SLEEP_STATUS: {
            'control_byte': 0x84,
            'command_byte': 0x82,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_AWAKE_DURATION: {
            'control_byte': 0x84,
            'command_byte': 0x83,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_LIGHT_SLEEP_DURATION: {
            'control_byte': 0x84,
            'command_byte': 0x84,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_DEEP_SLEEP_DURATION: {
            'control_byte': 0x84,
            'command_byte': 0x85,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_SLEEP_QUALITY_SCORE: {
            'control_byte': 0x84,
            'command_byte': 0x86,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_SLEEP_COMPREHENSIVE_STATUS: {
            'control_byte': 0x84,
            'command_byte': 0x8D,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_SLEEP_ANOMALY: {
            'control_byte': 0x84,
            'command_byte': 0x8E,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_SLEEP_STATISTICS: {
            'control_byte': 0x84,
            'command_byte': 0x8F,
            'data': bytes([0x0F])
        },
        TYPE_QUERY_SLEEP_QUALITY_LEVEL: {
            'control_byte': 0x84,
            'command_byte': 0x90,
            'data': bytes([0x0F])
        }
    }

    QUERY_NAME_MAP = {

        TYPE_QUERY_HEARTBEAT: "Heartbeat",
        TYPE_MODULE_RESET: "Module Reset",
        TYPE_QUERY_PRODUCT_MODEL: "Product Model",
        TYPE_QUERY_PRODUCT_ID: "Product ID",
        TYPE_QUERY_HARDWARE_MODEL: "Hardware Model",
        TYPE_QUERY_FIRMWARE_VERSION: "Firmware Version",
        TYPE_QUERY_INIT_COMPLETE: "Init Complete",
        TYPE_QUERY_RADAR_RANGE_BOUNDARY: "Radar Range Boundary",


        TYPE_CONTROL_HUMAN_PRESENCE_ON: "Human Presence ON",
        TYPE_CONTROL_HUMAN_PRESENCE_OFF: "Human Presence OFF",
        TYPE_QUERY_HUMAN_PRESENCE_SWITCH: "Human Presence Switch",
        TYPE_QUERY_HUMAN_EXISTENCE_INFO: "Presence Status",
        TYPE_QUERY_HUMAN_MOTION_INFO: "Human Motion Info",
        TYPE_QUERY_HUMAN_BODY_MOTION_PARAM: "Body Motion Parameter",
        TYPE_QUERY_HUMAN_DISTANCE: "Human Distance",
        TYPE_QUERY_HUMAN_DIRECTION: "Human Direction",


        TYPE_CONTROL_HEART_RATE_MONITOR_ON: "Heart Rate Monitor ON",
        TYPE_CONTROL_HEART_RATE_MONITOR_OFF: "Heart Rate Monitor OFF",
        TYPE_QUERY_HEART_RATE_MONITOR_SWITCH: "Heart Rate Monitor Switch",
        TYPE_CONTROL_HEART_RATE_WAVEFORM_REPORT_ON: "Heart Rate Waveform Report ON",
        TYPE_CONTROL_HEART_RATE_WAVEFORM_REPORT_OFF: "Heart Rate Waveform Report OFF",
        TYPE_QUERY_HEART_RATE_WAVEFORM_REPORT_SWITCH: "Heart Rate Waveform Report Switch",
        TYPE_QUERY_HEART_RATE_VALUE: "Heart Rate Value",
        TYPE_QUERY_HEART_RATE_WAVEFORM: "Heart Rate Waveform",


        TYPE_CONTROL_BREATH_MONITOR_ON: "Breath Monitor ON",
        TYPE_CONTROL_BREATH_MONITOR_OFF: "Breath Monitor OFF",
        TYPE_QUERY_BREATH_MONITOR_SWITCH: "Breath Monitor Switch",
        TYPE_SET_LOW_BREATH_THRESHOLD: "Set Low Breath Threshold",
        TYPE_QUERY_LOW_BREATH_THRESHOLD: "Query Low Breath Threshold",
        TYPE_QUERY_BREATH_INFO: "Breath Info",
        TYPE_QUERY_BREATH_VALUE: "Breath Value",
        TYPE_CONTROL_BREATH_WAVEFORM_REPORT_ON: "Breath Waveform Report ON",
        TYPE_CONTROL_BREATH_WAVEFORM_REPORT_OFF: "Breath Waveform Report OFF",
        TYPE_QUERY_BREATH_WAVEFORM_REPORT_SWITCH: "Breath Waveform Report Switch",
        TYPE_QUERY_BREATH_WAVEFORM: "Breath Waveform",


        TYPE_CONTROL_SLEEP_MONITOR_ON: "Sleep Monitor ON",
        TYPE_CONTROL_SLEEP_MONITOR_OFF: "Sleep Monitor OFF",
        TYPE_QUERY_SLEEP_MONITOR_SWITCH: "Sleep Monitor Switch",
        TYPE_CONTROL_ABNORMAL_STRUGGLE_ON: "Abnormal Struggle Monitor ON",
        TYPE_CONTROL_ABNORMAL_STRUGGLE_OFF: "Abnormal Struggle Monitor OFF",
        TYPE_QUERY_ABNORMAL_STRUGGLE_SWITCH: "Abnormal Struggle Monitor Switch",
        TYPE_QUERY_ABNORMAL_STRUGGLE_STATUS: "Abnormal Struggle Status",
        TYPE_SET_STRUGGLE_SENSITIVITY: "Set Struggle Sensitivity",
        TYPE_QUERY_STRUGGLE_SENSITIVITY: "Query Struggle Sensitivity",
        TYPE_CONTROL_NO_PERSON_TIMING_ON: "No Person Timing ON",
        TYPE_CONTROL_NO_PERSON_TIMING_OFF: "No Person Timing OFF",
        TYPE_QUERY_NO_PERSON_TIMING_SWITCH: "No Person Timing Switch",
        TYPE_SET_NO_PERSON_TIMING_DURATION: "Set No Person Timing Duration",
        TYPE_QUERY_NO_PERSON_TIMING_DURATION: "Query No Person Timing Duration",

        TYPE_QUERY_NO_PERSON_TIMING_STATUS: "No Person Timing Status",
        TYPE_SET_SLEEP_END_DURATION: "Set Sleep End Duration",
        TYPE_QUERY_SLEEP_END_DURATION: "Query Sleep End Duration",
        TYPE_QUERY_BED_STATUS: "Bed Status",
        TYPE_QUERY_SLEEP_STATUS: "Sleep Status",
        TYPE_QUERY_AWAKE_DURATION: "Awake Duration",
        TYPE_QUERY_LIGHT_SLEEP_DURATION: "Light Sleep Duration",
        TYPE_QUERY_DEEP_SLEEP_DURATION: "Deep Sleep Duration",
        TYPE_QUERY_SLEEP_QUALITY_SCORE: "Sleep Quality Score",
        TYPE_QUERY_SLEEP_COMPREHENSIVE_STATUS: "Sleep Comprehensive Status",
        TYPE_QUERY_SLEEP_ANOMALY: "Sleep Anomaly",
        TYPE_QUERY_SLEEP_STATISTICS: "Sleep Statistics",
        TYPE_QUERY_SLEEP_QUALITY_LEVEL: "Sleep Quality Level"
    }

    def __init__(self, data_processor, parse_interval=200,
                 presence_enabled=True,
                 heart_rate_enabled=True, heart_rate_waveform_enabled=False,
                 breath_monitoring_enabled=True, breath_waveform_enabled=False,
                 sleep_monitoring_enabled=True,
                 abnormal_struggle_enabled=False, struggle_sensitivity=1,
                 no_person_timing_enabled=False, no_person_timing_duration=30,
                 sleep_cutoff_duration=120,
                 max_retries=3, retry_delay=100, init_timeout=5000):

        self._validate_init_parameters(
            parse_interval, struggle_sensitivity, no_person_timing_duration,
            sleep_cutoff_duration, max_retries, retry_delay, init_timeout
        )

        if parse_interval > 500:
            raise ValueError("parse_interval must be less than 500ms")

        self.data_processor = data_processor
        self.parse_interval = parse_interval
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.init_timeout = init_timeout

        self._is_running = False
        self._initialization_complete = False
        self._configuration_errors = []

        self.heartbeat_last_received = 0

        self.heartbeat_timeout_count = 0

        self.heartbeat_interval = 0

        self.system_initialized = False

        self.system_initialized_timestamp = 0

        self.module_reset_flag = False

        self.module_reset_timestamp = 0

        self.product_model = ""

        self.product_id = ""

        self.hardware_model = ""

        self.firmware_version = ""

        self.radar_in_range = False

        self.presence_enabled = presence_enabled

        self.presence_status = 0

        self.motion_status = 0

        self.movement_parameter = 0

        self.human_distance = 0

        self.human_position_x = 0

        self.human_position_y = 0

        self.human_position_z = 0

        self.breath_monitoring_enabled = breath_monitoring_enabled

        self.breath_waveform_enabled = False

        self.low_breath_threshold = 10

        self.breath_status = 0

        self.breath_value = 0

        self.breath_waveform = [0, 0, 0, 0, 0]

        self.heart_rate_enabled = heart_rate_enabled

        self.heart_rate_waveform_enabled = False

        self.heart_rate_value = 0

        self.heart_rate_waveform = [0, 0, 0, 0, 0]

        self.sleep_monitoring_enabled = sleep_monitoring_enabled

        self.bed_status = 0

        self.sleep_status = 0

        self.awake_duration = 0

        self.light_sleep_duration = 0

        self.deep_sleep_duration = 0

        self.sleep_quality_score = 0

        self.sleep_quality_rating = 0

        self.sleep_comprehensive_status = {}

        self.sleep_anomaly = 0

        self.abnormal_struggle_status = 0

        self.no_person_timing_status = 0

        self.abnormal_struggle_enabled = abnormal_struggle_enabled

        self.no_person_timing_enabled = no_person_timing_enabled

        self.no_person_timing_duration = no_person_timing_duration

        self.sleep_cutoff_duration = sleep_cutoff_duration

        self.struggle_sensitivity = struggle_sensitivity

        self._query_in_progress = False

        self._query_response_received = False

        self._query_result = None

        self._current_query_type = None

        self._query_timeout = 200

        self._timer = Timer(-1)

        try:

            self._start_timer()

            self._complete_initialization()

            self._initialization_complete = True

            if R60ABD1.DEBUG_ENABLED:
                print(f"[Init] R60ABD1 initialized successfully")
                status = self.get_configuration_status()
                print(
                    f"[Init] Configuration errors: {len(status['configuration_errors'])}")
                print(
                    f"[Init] Product: {self.product_model} v{self.firmware_version}")

        except Exception as e:

            self._is_running = False
            if hasattr(self, '_timer'):
                self._timer.deinit()
            raise DeviceInitializationError(
                f"Device initialization failed: {str(e)}")

    def _validate_init_parameters(self, parse_interval, struggle_sensitivity,
                                  no_person_timing_duration, sleep_cutoff_duration,
                                  max_retries, retry_delay, init_timeout) -> None:
        if parse_interval > 500 or parse_interval < 10:
            raise ValueError("parse_interval must be between 10ms and 500ms")

        if struggle_sensitivity not in [self.SENSITIVITY_LOW, self.SENSITIVITY_MEDIUM, self.SENSITIVITY_HIGH]:
            raise ValueError(
                "struggle_sensitivity must be 0 (low), 1 (medium), or 2 (high)")

        if no_person_timing_duration < 30 or no_person_timing_duration > 180 or no_person_timing_duration % 10 != 0:
            raise ValueError(
                "no_person_timing_duration must be between 30-180 minutes in steps of 10")

        if sleep_cutoff_duration < 5 or sleep_cutoff_duration > 120:
            raise ValueError(
                "sleep_cutoff_duration must be between 5-120 minutes")

        if max_retries < 0 or max_retries > 10:
            raise ValueError("max_retries must be between 0 and 10")

        if retry_delay < 0 or retry_delay > 1000:
            raise ValueError("retry_delay must be between 0ms and 1000ms")

        if init_timeout < 1000 or init_timeout > 30000:
            raise ValueError("init_timeout must be between 1000ms and 30000ms")

    def _complete_initialization(self) -> None:
        start_time = time.ticks_ms()

        device_info_loaded = self._load_device_information()
        if not device_info_loaded:
            raise DeviceInitializationError(
                "Failed to load device information")

        init_success = self._wait_for_device_initialization()
        if not init_success:

            if R60ABD1.DEBUG_ENABLED:
                print("[Init] Device not initialized, attempting reset...")
            reset_success = self._reset_and_wait_for_initialization()
            if not reset_success:
                raise DeviceInitializationError(
                    "Device initialization failed even after reset")

        self._auto_configure_device()

        self._verify_critical_configuration()

        elapsed_time = time.ticks_diff(time.ticks_ms(), start_time)
        if R60ABD1.DEBUG_ENABLED:
            print(f"[Init] Initialization completed in {elapsed_time}ms")

    def _load_device_information(self) -> bool:
        info_queries = [
            ("Product Model", self.query_product_model),
            ("Product ID", self.query_product_id),
            ("Hardware Model", self.query_hardware_model),
            ("Firmware Version", self.query_firmware_version)
        ]

        all_success = True
        for info_name, query_func in info_queries:
            success = self._execute_with_retry(query_func, f"Load {info_name}")
            if not success:
                all_success = False
                self._configuration_errors.append(
                    f"Failed to load {info_name}")
                if R60ABD1.DEBUG_ENABLED:
                    print(f"[Init] Warning: Failed to load {info_name}")

        return all_success

    def _wait_for_device_initialization(self, timeout=None) -> bool:
        if timeout is None:
            timeout = self.init_timeout

        start_time = time.ticks_ms()

        while time.ticks_diff(time.ticks_ms(), start_time) < timeout:
            success, init_status = self.query_init_complete(timeout=500)
            if success and init_status:
                if R60ABD1.DEBUG_ENABLED:
                    print("[Init] Device initialization confirmed")
                return True

            time.sleep_ms(200)

        if R60ABD1.DEBUG_ENABLED:
            print("[Init] Device initialization timeout")
        return False

    def _reset_and_wait_for_initialization(self) -> bool:

        reset_success = self._execute_with_retry(
            self.reset_module,
            "Reset Device",
            timeout=1000
        )

        if not reset_success:
            return False

        if R60ABD1.DEBUG_ENABLED:
            print("[Init] Waiting 3 seconds for device reset...")
        time.sleep(3)

        return self._wait_for_device_initialization(timeout=10000)

    def _auto_configure_device(self) -> None:
        configuration_steps = []

        if self.presence_enabled:
            configuration_steps.append(
                ("Enable Human Presence", self.enable_human_presence))
        else:
            configuration_steps.append(
                ("Disable Human Presence", self.disable_human_presence))

        if self.heart_rate_enabled:
            configuration_steps.append(
                ("Enable Heart Rate Monitor", self.enable_heart_rate_monitor))
            if self.heart_rate_waveform_enabled:
                configuration_steps.append(
                    ("Enable Heart Rate Waveform Report", self.enable_heart_rate_waveform_report))
            else:
                configuration_steps.append(
                    ("Disable Heart Rate Waveform Report", self.disable_heart_rate_waveform_report))
        else:
            configuration_steps.append(
                ("Disable Heart Rate Monitor", self.disable_heart_rate_monitor))

        if self.breath_monitoring_enabled:
            configuration_steps.append(
                ("Enable Breath Monitor", self.enable_breath_monitor))
            if self.breath_waveform_enabled:
                configuration_steps.append(
                    ("Enable Breath Waveform Report", self.enable_breath_waveform_report))
            else:
                configuration_steps.append(
                    ("Disable Breath Waveform Report", self.disable_breath_waveform_report))
        else:
            configuration_steps.append(
                ("Disable Breath Monitor", self.disable_breath_monitor))

        if self.sleep_monitoring_enabled:
            configuration_steps.append(
                ("Enable Sleep Monitor", self.enable_sleep_monitor))

            if self.abnormal_struggle_enabled:
                configuration_steps.append(
                    ("Enable Abnormal Struggle Monitor", self.enable_abnormal_struggle_monitor))

                configuration_steps.append(("Set Struggle Sensitivity",
                                            lambda: self.set_struggle_sensitivity(self.struggle_sensitivity)))
            else:
                configuration_steps.append(
                    ("Disable Abnormal Struggle Monitor", self.disable_abnormal_struggle_monitor))

            if self.no_person_timing_enabled:
                configuration_steps.append(
                    ("Enable No Person Timing", self.enable_no_person_timing))

                configuration_steps.append(("Set No Person Timing Duration",
                                            lambda: self.set_no_person_timing_duration(self.no_person_timing_duration)))
            else:
                configuration_steps.append(
                    ("Disable No Person Timing", self.disable_no_person_timing))

            configuration_steps.append(("Set Sleep End Duration",
                                        lambda: self.set_sleep_end_duration(self.sleep_cutoff_duration)))
        else:
            configuration_steps.append(
                ("Disable Sleep Monitor", self.disable_sleep_monitor))

        for step_name, step_function in configuration_steps:
            success = self._execute_with_retry(step_function, step_name)
            if not success:
                self._configuration_errors.append(f"Failed to {step_name}")
                if R60ABD1.DEBUG_ENABLED:
                    print(f"[Init] Warning: {step_name} failed")

    def _verify_critical_configuration(self) -> None:
        critical_verifications = []

        critical_verifications.append(
            ("Device Initialization", self.query_init_complete))

        critical_verifications.append(
            ("Radar Range", self.query_radar_range_boundary))

        if self.presence_enabled:
            critical_verifications.append(
                ("Presence Detection", self.query_human_presence_switch))

        if self.heart_rate_enabled:
            critical_verifications.append(
                ("Heart Rate Monitor", self.query_heart_rate_monitor_switch))

        if self.breath_monitoring_enabled:
            critical_verifications.append(
                ("Breath Monitor", self.query_breath_monitor_switch))

        if self.sleep_monitoring_enabled:
            critical_verifications.append(
                ("Sleep Monitor", self.query_sleep_monitor_switch))

        for verify_name, verify_func in critical_verifications:
            success, result = verify_func(timeout=500)
            if not success:
                self._configuration_errors.append(
                    f"Verification failed: {verify_name}")
                if R60ABD1.DEBUG_ENABLED:
                    print(f"[Init] Warning: {verify_name} verification failed")

    def _execute_with_retry(self, operation, operation_name, timeout=200) -> bool:
        for attempt in range(self.max_retries + 1):
            try:
                success, result = operation(timeout=timeout)
                if success:
                    return True

                if attempt < self.max_retries:
                    time.sleep_ms(self.retry_delay)

            except Exception as e:
                if attempt < self.max_retries:
                    time.sleep_ms(self.retry_delay)
                else:
                    if R60ABD1.DEBUG_ENABLED:
                        print(
                            f"[Init] {operation_name} failed after {self.max_retries + 1} attempts: {e}")

        return False

    def get_configuration_status(self) -> dict:
        return {
            'initialization_complete': self._initialization_complete,
            'configuration_errors': self._configuration_errors.copy(),
            'device_info': {
                'product_model': self.product_model,
                'product_id': self.product_id,
                'hardware_model': self.hardware_model,
                'firmware_version': self.firmware_version
            },
            'current_settings': {
                'presence_enabled': self.presence_enabled,
                'heart_rate_enabled': self.heart_rate_enabled,
                'heart_rate_waveform_enabled': self.heart_rate_waveform_enabled,
                'breath_monitoring_enabled': self.breath_monitoring_enabled,
                'breath_waveform_enabled': self.breath_waveform_enabled,
                'sleep_monitoring_enabled': self.sleep_monitoring_enabled,
                'abnormal_struggle_enabled': self.abnormal_struggle_enabled,
                'struggle_sensitivity': self.struggle_sensitivity,
                'no_person_timing_enabled': self.no_person_timing_enabled,
                'no_person_timing_duration': self.no_person_timing_duration,
                'sleep_cutoff_duration': self.sleep_cutoff_duration
            }
        }

    def _start_timer(self) -> None:
        self._is_running = True
        self._timer.init(period=self.parse_interval,
                         mode=Timer.PERIODIC, callback=self._timer_callback)

    def _timer_callback(self, timer) -> None:
        if not self._is_running:
            return

        frames = self.data_processor.read_and_parse()

        for frame in frames:

            micropython.schedule(self.update_properties_from_frame, frame)

    def _parse_human_position_data(self, data_bytes) -> tuple:
        if len(data_bytes) != 6:
            return (0, 0, 0)

        x = self._parse_signed_16bit_special(data_bytes[0:2])
        y = self._parse_signed_16bit_special(data_bytes[2:4])
        z = self._parse_signed_16bit_special(data_bytes[4:6])

        return (x, y, z)

    def _parse_signed_16bit_special(self, two_bytes) -> int:
        if len(two_bytes) != 2:
            return 0

        unsigned_value = (two_bytes[0] << 8) | two_bytes[1]

        sign_bit = (unsigned_value >> 15) & 0x1
        magnitude = unsigned_value & 0x7FFF

        if sign_bit == 1:
            return -magnitude
        else:
            return magnitude

    def _parse_heart_rate_waveform_data(self, data_bytes) -> tuple:
        if len(data_bytes) != 5:
            return (128, 128, 128, 128, 128)

        return (
            data_bytes[0],
            data_bytes[1],
            data_bytes[2],
            data_bytes[3],
            data_bytes[4]
        )

    def _parse_sleep_comprehensive_data(self, data_bytes) -> tuple:
        if len(data_bytes) != 8:
            return (0, 0, 0, 0, 0, 0, 0, 0)

        return (
            data_bytes[0],
            data_bytes[1],
            data_bytes[2],
            data_bytes[3],
            data_bytes[4],
            data_bytes[5],
            data_bytes[6],
            data_bytes[7]
        )

    def _parse_sleep_statistics_data(self, data_bytes) -> tuple:
        if len(data_bytes) != 12:
            return (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)

        total_sleep_duration = (data_bytes[1] << 8) | data_bytes[2]

        return (
            data_bytes[0],
            total_sleep_duration,
            data_bytes[3],
            data_bytes[4],
            data_bytes[5],
            data_bytes[6],
            data_bytes[7],
            data_bytes[8],
            data_bytes[9],
            data_bytes[10],
            data_bytes[11]
        )

    def _parse_breath_waveform_data(self, data_bytes) -> tuple:
        if len(data_bytes) != 5:
            return (128, 128, 128, 128, 128)

        return (
            data_bytes[0],
            data_bytes[1],
            data_bytes[2],
            data_bytes[3],
            data_bytes[4]
        )

    def _parse_product_info_data(self, data_bytes) -> tuple:
        try:
            if R60ABD1.DEBUG_ENABLED:
                print(
                    f"[Parse] Raw product data: {data_bytes}, hex: {data_bytes.hex()}")

            if b'\x00' in data_bytes:

                null_index = data_bytes.index(b'\x00')
                valid_data = data_bytes[:null_index]
                if R60ABD1.DEBUG_ENABLED:
                    print(
                        f"[Parse] After null removal: {valid_data}, hex: {valid_data.hex()}")
            else:
                valid_data = data_bytes

            product_info = valid_data.decode('utf-8').strip()
            if R60ABD1.DEBUG_ENABLED:
                print(f"[Parse] Decoded product info: '{product_info}'")

            return (product_info,)
        except Exception as e:

            if R60ABD1.DEBUG_ENABLED:
                print(
                    f"[Parse] Product info parse error: {e}, data: {data_bytes}")

            try:
                product_info = valid_data.decode('ascii').strip()
                if R60ABD1.DEBUG_ENABLED:
                    print(
                        f"[Parse] ASCII decoded product info: '{product_info}'")
                return (product_info,)
            except:
                return ("",)

    def _parse_firmware_version_data(self, data_bytes) -> tuple:
        try:
            if R60ABD1.DEBUG_ENABLED:
                print(
                    f"[Parse] Raw firmware data: {data_bytes}, hex: {data_bytes.hex()}")

            if b'\x00' in data_bytes:

                null_index = data_bytes.index(b'\x00')
                valid_data = data_bytes[:null_index]
                if R60ABD1.DEBUG_ENABLED:
                    print(
                        f"[Parse] After null removal: {valid_data}, hex: {valid_data.hex()}")
            else:
                valid_data = data_bytes

            version = valid_data.decode('utf-8').strip()
            if R60ABD1.DEBUG_ENABLED:
                print(f"[Parse] Decoded firmware version: '{version}'")

            return (version,)
        except Exception as e:

            if R60ABD1.DEBUG_ENABLED:
                print(
                    f"[Parse] Firmware version parse error: {e}, data: {data_bytes}")

            try:
                version = valid_data.decode('ascii').strip()
                if R60ABD1.DEBUG_ENABLED:
                    print(
                        f"[Parse] ASCII decoded firmware version: '{version}'")
                return (version,)
            except:
                return ("",)

    def _execute_operation(self, operation_type, data=None, timeout=200) -> tuple:

        if self._query_in_progress:
            if R60ABD1.DEBUG_ENABLED:
                print("[Operation] Another operation in progress, aborting")
            return False, None

        try:

            original_running = self._is_running
            self._is_running = False

            self._query_in_progress = True
            self._query_response_received = False
            self._query_result = None
            self._current_query_type = operation_type

            if operation_type not in self.COMMAND_MAP:
                if R60ABD1.DEBUG_ENABLED:
                    print(
                        f"[Operation] Unknown operation type: {operation_type}")
                return False, None

            cmd_params = self.COMMAND_MAP[operation_type]

            data_to_send = data if data is not None else cmd_params['data']

            operation_frame = self.data_processor.build_and_send_frame(
                control_byte=cmd_params['control_byte'],
                command_byte=cmd_params['command_byte'],
                data=data_to_send
            )

            if not operation_frame:
                return False, None

            if R60ABD1.DEBUG_ENABLED:
                operation_name = self.QUERY_NAME_MAP.get(
                    operation_type, f"Unknown({operation_type})")
                print(f"[Operation] {operation_name} operation sent")
                frame_hex = ' '.join(['{:02X}'.format(b)
                                     for b in operation_frame])
                print(f"[Operation] Sent frame: {frame_hex}")

            start_time = time.ticks_ms()
            while not self._query_response_received:

                if time.ticks_diff(time.ticks_ms(), start_time) >= timeout:
                    if R60ABD1.DEBUG_ENABLED:
                        print(
                            f"[Operation] {operation_name} operation timeout")
                    return False, None

                time.sleep_us(100)

                frames = self.data_processor.read_and_parse()
                for frame in frames:
                    self.update_properties_from_frame(frame)

            return True, self._query_result

        except Exception as e:
            if R60ABD1.DEBUG_ENABLED:
                operation_name = self.QUERY_NAME_MAP.get(
                    operation_type, f"Unknown({operation_type})")
                print(f"[Operation] {operation_name} operation error: {e}")
            return False, None
        finally:

            self._query_in_progress = False
            self._query_response_received = False
            self._query_result = None
            self._current_query_type = None

            try:
                self._is_running = original_running
            except NameError:
                pass

            if R60ABD1.DEBUG_ENABLED:
                print("[Operation] Operation state reset")

    def query_heartbeat(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_HEARTBEAT, timeout=timeout)

    def reset_module(self, timeout=500) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_MODULE_RESET, timeout=timeout)

    def query_product_model(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_PRODUCT_MODEL, timeout=timeout)

    def query_product_id(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_PRODUCT_ID, timeout=timeout)

    def query_hardware_model(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_HARDWARE_MODEL, timeout=timeout)

    def query_firmware_version(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_FIRMWARE_VERSION, timeout=timeout)

    def query_init_complete(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_INIT_COMPLETE, timeout=timeout)

    def query_radar_range_boundary(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_RADAR_RANGE_BOUNDARY, timeout=timeout)

    def enable_human_presence(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_HUMAN_PRESENCE_ON, timeout=timeout)

    def disable_human_presence(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_HUMAN_PRESENCE_OFF, timeout=timeout)

    def query_human_presence_switch(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_HUMAN_PRESENCE_SWITCH, timeout=timeout)

    def query_presence_status(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_HUMAN_EXISTENCE_INFO, timeout=timeout)

    def query_human_motion_info(self, timeout=200) -> tuple:
        success, motion_status = self._execute_operation(
            R60ABD1.TYPE_QUERY_HUMAN_MOTION_INFO,
            timeout=timeout
        )

        if success and motion_status not in (R60ABD1.MOTION_NONE, R60ABD1.MOTION_STATIC, R60ABD1.MOTION_ACTIVE):
            raise ValueError(f"Invalid motion status: {motion_status}")

        return success, motion_status

    def query_human_body_motion_param(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_HUMAN_BODY_MOTION_PARAM, timeout=timeout)

    def query_human_distance(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_HUMAN_DISTANCE, timeout=timeout)

    def query_human_direction(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_HUMAN_DIRECTION, timeout=timeout)

    def enable_heart_rate_monitor(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_HEART_RATE_MONITOR_ON, timeout=timeout)

    def disable_heart_rate_monitor(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_HEART_RATE_MONITOR_OFF, timeout=timeout)

    def query_heart_rate_monitor_switch(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_HEART_RATE_MONITOR_SWITCH, timeout=timeout)

    def enable_heart_rate_waveform_report(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_HEART_RATE_WAVEFORM_REPORT_ON, timeout=timeout)

    def disable_heart_rate_waveform_report(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_HEART_RATE_WAVEFORM_REPORT_OFF, timeout=timeout)

    def query_heart_rate_waveform_report_switch(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_HEART_RATE_WAVEFORM_REPORT_SWITCH, timeout=timeout)

    def query_heart_rate_value(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_HEART_RATE_VALUE, timeout=timeout)

    def query_heart_rate_waveform(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_HEART_RATE_WAVEFORM, timeout=timeout)

    def enable_breath_monitor(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_BREATH_MONITOR_ON, timeout=timeout)

    def disable_breath_monitor(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_BREATH_MONITOR_OFF, timeout=timeout)

    def query_breath_monitor_switch(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_BREATH_MONITOR_SWITCH, timeout=timeout)

    def set_low_breath_threshold(self, threshold, timeout=200) -> tuple:
        if threshold < 10 or threshold > 20:
            raise ValueError("Low breath threshold must be between 10 and 20")

        data = bytes([threshold])
        return self._execute_operation(R60ABD1.TYPE_SET_LOW_BREATH_THRESHOLD, data=data, timeout=timeout)

    def query_low_breath_threshold(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_LOW_BREATH_THRESHOLD, timeout=timeout)

    def query_breath_info(self, timeout=200) -> tuple:
        success, breath_status = self._execute_operation(
            R60ABD1.TYPE_QUERY_BREATH_INFO,
            timeout=timeout
        )

        if success and breath_status not in (R60ABD1.BREATH_NORMAL, R60ABD1.BREATH_HIGH,
                                             R60ABD1.BREATH_LOW, R60ABD1.BREATH_NONE):
            raise ValueError(f"Invalid breath status: {breath_status}")

        return success, breath_status

    def query_breath_value(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_BREATH_VALUE, timeout=timeout)

    def enable_breath_waveform_report(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_BREATH_WAVEFORM_REPORT_ON, timeout=timeout)

    def disable_breath_waveform_report(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_BREATH_WAVEFORM_REPORT_OFF, timeout=timeout)

    def query_breath_waveform_report_switch(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_BREATH_WAVEFORM_REPORT_SWITCH, timeout=timeout)

    def query_breath_waveform(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_BREATH_WAVEFORM, timeout=timeout)

    def enable_sleep_monitor(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_SLEEP_MONITOR_ON, timeout=timeout)

    def disable_sleep_monitor(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_SLEEP_MONITOR_OFF, timeout=timeout)

    def query_sleep_monitor_switch(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_SLEEP_MONITOR_SWITCH, timeout=timeout)

    def enable_abnormal_struggle_monitor(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_ABNORMAL_STRUGGLE_ON, timeout=timeout)

    def disable_abnormal_struggle_monitor(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_ABNORMAL_STRUGGLE_OFF, timeout=timeout)

    def query_abnormal_struggle_switch(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_ABNORMAL_STRUGGLE_SWITCH, timeout=timeout)

    def query_abnormal_struggle_status(self, timeout=200) -> tuple:
        success, struggle_status = self._execute_operation(
            R60ABD1.TYPE_QUERY_ABNORMAL_STRUGGLE_STATUS,
            timeout=timeout
        )

        if success and struggle_status not in (R60ABD1.STRUGGLE_NONE, R60ABD1.STRUGGLE_NORMAL,
                                               R60ABD1.STRUGGLE_ABNORMAL):
            raise ValueError(f"Invalid struggle status: {struggle_status}")

        return success, struggle_status

    def set_struggle_sensitivity(self, sensitivity, timeout=200) -> tuple:
        if sensitivity not in [R60ABD1.SENSITIVITY_LOW, R60ABD1.SENSITIVITY_MEDIUM, R60ABD1.SENSITIVITY_HIGH]:
            raise ValueError(
                "Sensitivity must be 0 (low), 1 (medium), or 2 (high)")

        data = bytes([sensitivity])
        return self._execute_operation(R60ABD1.TYPE_SET_STRUGGLE_SENSITIVITY, data=data, timeout=timeout)

    def query_struggle_sensitivity(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_STRUGGLE_SENSITIVITY, timeout=timeout)

    def enable_no_person_timing(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_NO_PERSON_TIMING_ON, timeout=timeout)

    def disable_no_person_timing(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_CONTROL_NO_PERSON_TIMING_OFF, timeout=timeout)

    def query_no_person_timing_switch(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_NO_PERSON_TIMING_SWITCH, timeout=timeout)

    def set_no_person_timing_duration(self, duration, timeout=200) -> tuple:
        if duration < 30 or duration > 180 or duration % 10 != 0:
            raise ValueError(
                "No person timing duration must be between 30-180 minutes in steps of 10")

        data = bytes([duration])
        return self._execute_operation(R60ABD1.TYPE_SET_NO_PERSON_TIMING_DURATION, data=data, timeout=timeout)

    def query_no_person_timing_duration(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_NO_PERSON_TIMING_DURATION, timeout=timeout)

    def set_sleep_end_duration(self, duration, timeout=200) -> tuple:
        if duration < 5 or duration > 120:
            raise ValueError(
                "Sleep end duration must be between 5-120 minutes")

        data = bytes([duration])
        return self._execute_operation(R60ABD1.TYPE_SET_SLEEP_END_DURATION, data=data, timeout=timeout)

    def query_sleep_end_duration(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_SLEEP_END_DURATION, timeout=timeout)

    def query_no_person_timing_status(self, timeout=200) -> tuple:
        success, timing_status = self._execute_operation(
            R60ABD1.TYPE_QUERY_NO_PERSON_TIMING_STATUS,
            timeout=timeout
        )

        if success and timing_status not in (R60ABD1.NO_PERSON_TIMING_NONE, R60ABD1.NO_PERSON_TIMING_NORMAL,
                                             R60ABD1.NO_PERSON_TIMING_ABNORMAL):
            raise ValueError(
                f"Invalid no person timing status: {timing_status}")

        return success, timing_status

    def query_bed_status(self, timeout=200) -> tuple:
        success, bed_status = self._execute_operation(
            R60ABD1.TYPE_QUERY_BED_STATUS,
            timeout=timeout
        )

        if success and bed_status not in (R60ABD1.BED_LEAVE, R60ABD1.BED_ENTER, R60ABD1.BED_NONE):
            raise ValueError(f"Invalid bed status: {bed_status}")

        return success, bed_status

    def query_sleep_status(self, timeout=200) -> tuple:
        success, sleep_status = self._execute_operation(
            R60ABD1.TYPE_QUERY_SLEEP_STATUS,
            timeout=timeout
        )

        if success and sleep_status not in (R60ABD1.SLEEP_DEEP, R60ABD1.SLEEP_LIGHT,
                                            R60ABD1.SLEEP_AWAKE, R60ABD1.SLEEP_NONE):
            raise ValueError(f"Invalid sleep status: {sleep_status}")

        return success, sleep_status

    def query_awake_duration(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_AWAKE_DURATION, timeout=timeout)

    def query_light_sleep_duration(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_LIGHT_SLEEP_DURATION, timeout=timeout)

    def query_deep_sleep_duration(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_DEEP_SLEEP_DURATION, timeout=timeout)

    def query_sleep_quality_score(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_SLEEP_QUALITY_SCORE, timeout=timeout)

    def query_sleep_comprehensive_status(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_SLEEP_COMPREHENSIVE_STATUS, timeout=timeout)

    def query_sleep_anomaly(self, timeout=200) -> tuple:
        success, anomaly_status = self._execute_operation(
            R60ABD1.TYPE_QUERY_SLEEP_ANOMALY,
            timeout=timeout
        )

        if success and anomaly_status not in (R60ABD1.SLEEP_ANOMALY_SHORT, R60ABD1.SLEEP_ANOMALY_LONG,
                                              R60ABD1.SLEEP_ANOMALY_NO_PERSON, R60ABD1.SLEEP_ANOMALY_NONE):
            raise ValueError(f"Invalid sleep anomaly status: {anomaly_status}")

        return success, anomaly_status

    def query_sleep_statistics(self, timeout=200) -> tuple:
        return self._execute_operation(R60ABD1.TYPE_QUERY_SLEEP_STATISTICS, timeout=timeout)

    def query_sleep_quality_level(self, timeout=200) -> tuple:
        success, quality_level = self._execute_operation(
            R60ABD1.TYPE_QUERY_SLEEP_QUALITY_LEVEL,
            timeout=timeout
        )

        if success and quality_level not in (R60ABD1.SLEEP_QUALITY_NONE, R60ABD1.SLEEP_QUALITY_GOOD,
                                             R60ABD1.SLEEP_QUALITY_NORMAL, R60ABD1.SLEEP_QUALITY_POOR):
            raise ValueError(f"Invalid sleep quality level: {quality_level}")

        return success, quality_level

    def _handle_query_response(self, expected_type, response_data, response_name="") -> None:

        if (self._query_in_progress and
                self._current_query_type == expected_type and
                not self._query_response_received):

            self._query_result = response_data
            self._query_response_received = True

            if R60ABD1.DEBUG_ENABLED:
                query_name = self.QUERY_NAME_MAP.get(
                    expected_type, f"Unknown({expected_type})")
                print(
                    f"[Query] {query_name} response received: {response_data}")

        elif self._query_in_progress and self._current_query_type != expected_type:
            if R60ABD1.DEBUG_ENABLED:
                current_query = self.QUERY_NAME_MAP.get(self._current_query_type,
                                                        f"Unknown({self._current_query_type})")
                print(
                    f"[Query] Unexpected {response_name} response during {current_query} query: {response_data}")

        elif not self._query_in_progress:
            if R60ABD1.DEBUG_ENABLED:
                print(
                    f"[Query] Unsolicited {response_name} response: {response_data}")

    def _update_property_with_debug(self, property_name, new_value, debug_message) -> None:
        setattr(self, property_name, new_value)
        if R60ABD1.DEBUG_ENABLED:
            print(debug_message)

    def update_properties_from_frame(self, frame) -> None:
        control = frame['control_byte']
        command = frame['command_byte']
        data = frame['data']

        if control == 0x01:

            if command == 0x01:
                self.heartbeat_last_received = time.ticks_ms()
                if R60ABD1.DEBUG_ENABLED:
                    print("[Heartbeat] Received")

            elif command == 0x80:
                self.heartbeat_last_received = time.ticks_ms()
                self._handle_query_response(
                    R60ABD1.TYPE_QUERY_HEARTBEAT,
                    True,
                    "Heartbeat"
                )

            elif command == 0x02:
                self.module_reset_flag = True
                self.module_reset_timestamp = time.ticks_ms()
                self._handle_query_response(
                    R60ABD1.TYPE_MODULE_RESET,
                    True,
                    "Module Reset"
                )

        elif control == 0x02:

            if command == 0xA1:
                if data:
                    product_info = self._parse_product_info_data(data)[0]
                    self.product_model = product_info
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_PRODUCT_MODEL,
                        product_info,
                        "Product Model"
                    )

            elif command == 0xA2:
                if data:

                    product_id = self._parse_product_info_data(data)[0]

                    self.product_id = product_id
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_PRODUCT_ID,
                        product_id,
                        "Product ID"
                    )

            elif command == 0xA3:
                if data:

                    hardware_model = self._parse_product_info_data(data)[0]

                    self.hardware_model = hardware_model
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_HARDWARE_MODEL,
                        hardware_model,
                        "Hardware Model"
                    )

            elif command == 0xA4:
                if data:

                    firmware_version = self._parse_firmware_version_data(data)[
                        0]

                    self.firmware_version = firmware_version
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_FIRMWARE_VERSION,
                        firmware_version,
                        "Firmware Version"
                    )

        elif control == 0x05:

            if command == 0x01:
                if data and len(data) > 0:
                    self.system_initialized = (data[0] == 0x01)
                    self.system_initialized_timestamp = time.ticks_ms()
                    if R60ABD1.DEBUG_ENABLED:
                        status = "completed" if self.system_initialized else "not completed"
                        print(f"[System] Initialization {status}")

            elif command == 0x81:
                if data and len(data) > 0:
                    init_status = (data[0] == 0x01)
                    self.system_initialized = init_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_INIT_COMPLETE,
                        init_status,
                        "Init Complete"
                    )

        elif control == 0x07:

            if command == 0x07:
                if data and len(data) > 0:
                    self.radar_in_range = (data[0] == 0x01)
                    if R60ABD1.DEBUG_ENABLED:
                        status = "in range" if self.radar_in_range else "out of range"
                        print(f"[Radar] {status}")

            elif command == 0x87:
                if data and len(data) > 0:
                    boundary_status = (data[0] == 0x01)
                    self.radar_in_range = not boundary_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_RADAR_RANGE_BOUNDARY,
                        boundary_status,
                        "Radar Range Boundary"
                    )

        elif control == 0x80:

            if command == 0x00:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.presence_enabled = switch_status

                    if data[0] == 0x01:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_HUMAN_PRESENCE_ON,
                            True,
                            "Human Presence ON"
                        )
                    else:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_HUMAN_PRESENCE_OFF,
                            True,
                            "Human Presence OFF"
                        )

            if command == 0x01:
                if data and len(data) > 0:
                    self.presence_status = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        status_text = "No one" if self.presence_status == 0 else "Someone"
                        print(f"[Presence] {status_text}")

            elif command == 0x80:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.presence_enabled = switch_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_HUMAN_PRESENCE_SWITCH,
                        switch_status,
                        "Human Presence Switch"
                    )

            elif command == 0x81:
                if data and len(data) > 0:
                    presence_value = data[0]
                    self.presence_status = presence_value
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_HUMAN_EXISTENCE_INFO,
                        presence_value,
                        "Presence Status"
                    )

            elif command == 0x82:
                if data and len(data) > 0:
                    motion_value = data[0]
                    self.motion_status = motion_value
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_HUMAN_MOTION_INFO,
                        motion_value,
                        "Human Motion Info"
                    )

            elif command == 0x83:
                if data and len(data) > 0:
                    motion_param = data[0]
                    self.movement_parameter = motion_param
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_HUMAN_BODY_MOTION_PARAM,
                        motion_param,
                        "Body Motion Parameter"
                    )

            elif command == 0x84:
                if data and len(data) >= 2:
                    distance = (data[0] << 8) | data[1]
                    self.human_distance = distance
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_HUMAN_DISTANCE,
                        distance,
                        "Human Distance"
                    )

            elif command == 0x85:
                if data and len(data) == 6:
                    x, y, z = self._parse_human_position_data(data)
                    self.human_position_x = x
                    self.human_position_y = y
                    self.human_position_z = z
                    position_data = (x, y, z)
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_HUMAN_DIRECTION,
                        position_data,
                        "Human Direction"
                    )

            elif command == 0x02:
                if data and len(data) > 0:
                    self.motion_status = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        status_text = ["No motion", "Static", "Active"][
                            self.motion_status] if self.motion_status < 3 else "Unknown"
                        print(f"[Motion] {status_text}")

            elif command == 0x03:
                if data and len(data) > 0:
                    self.movement_parameter = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        print(
                            f"[Movement] Parameter: {self.movement_parameter}")

            elif command == 0x04:
                if data and len(data) >= 2:
                    self.human_distance = (data[0] << 8) | data[1]
                    if R60ABD1.DEBUG_ENABLED:
                        print(f"[Distance] {self.human_distance} cm")

            elif command == 0x05:
                if data and len(data) == 6:
                    x, y, z = self._parse_human_position_data(data)
                    self.human_position_x = x
                    self.human_position_y = y
                    self.human_position_z = z
                    if R60ABD1.DEBUG_ENABLED:
                        print(f"[Position] X={x}, Y={y}, Z={z}")

        elif control == 0x81:

            if command == 0x01:
                if data and len(data) > 0:
                    self.breath_status = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        status_text = ["Normal", "High", "Low", "None"][
                            self.breath_status - 1] if 1 <= self.breath_status <= 4 else "Unknown"
                        print(f"[Breath] Status: {status_text}")

            elif command == 0x02:
                if data and len(data) > 0:
                    self.breath_value = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        print(f"[Breath] Value: {self.breath_value}")

            elif command == 0x05:
                if data and len(data) == 5:
                    waveform = self._parse_breath_waveform_data(data)
                    self.breath_waveform = list(waveform)
                    if R60ABD1.DEBUG_ENABLED:
                        print(f"[Breath] Waveform updated: {waveform}")

            elif command == 0x00:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.breath_monitoring_enabled = switch_status

                    if data[0] == 0x01:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_BREATH_MONITOR_ON,
                            True,
                            "Breath Monitor ON"
                        )
                    else:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_BREATH_MONITOR_OFF,
                            True,
                            "Breath Monitor OFF"
                        )

            elif command == 0x0C:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.breath_waveform_enabled = switch_status

                    if data[0] == 0x01:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_BREATH_WAVEFORM_REPORT_ON,
                            True,
                            "Breath Waveform Report ON"
                        )
                    else:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_BREATH_WAVEFORM_REPORT_OFF,
                            True,
                            "Breath Waveform Report OFF"
                        )

            elif command == 0x0B:
                if data and len(data) > 0:
                    threshold = data[0]
                    self.low_breath_threshold = threshold
                    self._handle_query_response(
                        R60ABD1.TYPE_SET_LOW_BREATH_THRESHOLD,
                        threshold,
                        "Set Low Breath Threshold"
                    )

            elif command == 0x80:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.breath_monitoring_enabled = switch_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_BREATH_MONITOR_SWITCH,
                        switch_status,
                        "Breath Monitor Switch"
                    )

            elif command == 0x8B:
                if data and len(data) > 0:
                    threshold = data[0]
                    self.low_breath_threshold = threshold
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_LOW_BREATH_THRESHOLD,
                        threshold,
                        "Query Low Breath Threshold"
                    )

            elif command == 0x81:
                if data and len(data) > 0:
                    breath_status = data[0]
                    self.breath_status = breath_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_BREATH_INFO,
                        breath_status,
                        "Breath Info"
                    )

            elif command == 0x82:
                if data and len(data) > 0:
                    breath_value = data[0]
                    self.breath_value = breath_value
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_BREATH_VALUE,
                        breath_value,
                        "Breath Value"
                    )

            elif command == 0x8C:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.breath_waveform_enabled = switch_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_BREATH_WAVEFORM_REPORT_SWITCH,
                        switch_status,
                        "Breath Waveform Report Switch"
                    )

            elif command == 0x85:
                if data and len(data) == 5:
                    waveform = self._parse_breath_waveform_data(data)
                    self.breath_waveform = list(waveform)
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_BREATH_WAVEFORM,
                        list(waveform),
                        "Breath Waveform"
                    )

        elif control == 0x85:

            if command == 0x02:
                if data and len(data) > 0:
                    self.heart_rate_value = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        print(f"[Heart Rate] Value: {self.heart_rate_value}")

            elif command == 0x05:
                if data and len(data) == 5:
                    waveform = self._parse_heart_rate_waveform_data(data)
                    self.heart_rate_waveform = list(waveform)
                    if R60ABD1.DEBUG_ENABLED:
                        print(f"[Heart Rate] Waveform updated: {waveform}")

            elif command == 0x00:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.heart_rate_enabled = switch_status

                    if data[0] == 0x01:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_HEART_RATE_MONITOR_ON,
                            True,
                            "Heart Rate Monitor ON"
                        )
                    else:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_HEART_RATE_MONITOR_OFF,
                            True,
                            "Heart Rate Monitor OFF"
                        )

            elif command == 0x0A:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.heart_rate_waveform_enabled = switch_status

                    if data[0] == 0x01:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_HEART_RATE_WAVEFORM_REPORT_ON,
                            True,
                            "Heart Rate Waveform Report ON"
                        )
                    else:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_HEART_RATE_WAVEFORM_REPORT_OFF,
                            True,
                            "Heart Rate Waveform Report OFF"
                        )

            elif command == 0x80:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.heart_rate_enabled = switch_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_HEART_RATE_MONITOR_SWITCH,
                        switch_status,
                        "Heart Rate Monitor Switch"
                    )

            elif command == 0x8A:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.heart_rate_waveform_enabled = switch_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_HEART_RATE_WAVEFORM_REPORT_SWITCH,
                        switch_status,
                        "Heart Rate Waveform Report Switch"
                    )

            elif command == 0x82:
                if data and len(data) > 0:
                    heart_rate = data[0]
                    self.heart_rate_value = heart_rate
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_HEART_RATE_VALUE,
                        heart_rate,
                        "Heart Rate Value"
                    )

            elif command == 0x85:
                if data and len(data) == 5:
                    waveform = self._parse_heart_rate_waveform_data(data)
                    self.heart_rate_waveform = list(waveform)
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_HEART_RATE_WAVEFORM,
                        list(waveform),
                        "Heart Rate Waveform"
                    )

        elif control == 0x84:
            if command == 0x01:
                if data and len(data) > 0:
                    self.bed_status = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        status_text = ["Leave bed", "Enter bed", "None"][
                            self.bed_status] if self.bed_status < 3 else "Unknown"
                        print(f"[Bed] Status: {status_text}")

            elif command == 0x02:
                if data and len(data) > 0:
                    self.sleep_status = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        status_text = ["Deep sleep", "Light sleep", "Awake", "None"][
                            self.sleep_status] if self.sleep_status < 4 else "Unknown"
                        print(f"[Sleep] Status: {status_text}")

            elif command == 0x03:
                if data and len(data) >= 2:
                    self.awake_duration = (data[0] << 8) | data[1]
                    if R60ABD1.DEBUG_ENABLED:
                        print(
                            f"[Sleep] Awake duration: {self.awake_duration} min")

            elif command == 0x04:
                if data and len(data) >= 2:
                    self.light_sleep_duration = (data[0] << 8) | data[1]
                    if R60ABD1.DEBUG_ENABLED:
                        print(
                            f"[Sleep] Light sleep duration: {self.light_sleep_duration} min")

            elif command == 0x05:
                if data and len(data) >= 2:
                    self.deep_sleep_duration = (data[0] << 8) | data[1]
                    if R60ABD1.DEBUG_ENABLED:
                        print(
                            f"[Sleep] Deep sleep duration: {self.deep_sleep_duration} min")

            elif command == 0x06:
                if data and len(data) > 0:
                    self.sleep_quality_score = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        print(
                            f"[Sleep] Quality score: {self.sleep_quality_score}")

            elif command == 0x0C:
                if data and len(data) == 8:
                    comprehensive_data = self._parse_sleep_comprehensive_data(
                        data)

                    self.sleep_comprehensive_status = {
                        'presence': comprehensive_data[0],
                        'sleep_status': comprehensive_data[1],
                        'avg_breath': comprehensive_data[2],
                        'avg_heart_rate': comprehensive_data[3],
                        'turnover_count': comprehensive_data[4],
                        'large_movement_ratio': comprehensive_data[5],
                        'small_movement_ratio': comprehensive_data[6],
                        'apnea_count': comprehensive_data[7]
                    }
                    if R60ABD1.DEBUG_ENABLED:
                        print(f"[Sleep] Comprehensive status updated")

            elif command == 0x0D:
                if data and len(data) == 12:
                    stats_data = self._parse_sleep_statistics_data(data)

                    self.sleep_quality_score = stats_data[0]
                    if R60ABD1.DEBUG_ENABLED:

                        print(f"[Sleep] Statistics updated")

            elif command == 0x0E:
                if data and len(data) > 0:
                    self.sleep_anomaly = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        status_text = ["Short sleep (<4h)", "Long sleep (>12h)", "No person anomaly", "Normal"][
                            self.sleep_anomaly] if self.sleep_anomaly < 4 else "Unknown"
                        print(f"[Sleep] Anomaly: {status_text}")

            elif command == 0x10:
                if data and len(data) > 0:
                    self.sleep_quality_rating = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        status_text = ["None", "Good", "Normal", "Poor"][
                            self.sleep_quality_rating] if self.sleep_quality_rating < 4 else "Unknown"
                        print(f"[Sleep] Quality rating: {status_text}")

            elif command == 0x11:
                if data and len(data) > 0:
                    self.abnormal_struggle_status = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        status_text = ["None", "Normal", "Abnormal"][
                            self.abnormal_struggle_status] if self.abnormal_struggle_status < 3 else "Unknown"
                        print(f"[Sleep] Struggle status: {status_text}")

            elif command == 0x12:
                if data and len(data) > 0:
                    self.no_person_timing_status = data[0]
                    if R60ABD1.DEBUG_ENABLED:
                        status_text = ["None", "Normal", "Abnormal"][
                            self.no_person_timing_status] if self.no_person_timing_status < 3 else "Unknown"
                        print(f"[Sleep] No person timing: {status_text}")

            elif command == 0x00:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.sleep_monitoring_enabled = switch_status

                    if data[0] == 0x01:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_SLEEP_MONITOR_ON,
                            True,
                            "Sleep Monitor ON"
                        )
                    else:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_SLEEP_MONITOR_OFF,
                            True,
                            "Sleep Monitor OFF"
                        )

            elif command == 0x13:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.abnormal_struggle_enabled = switch_status

                    if data[0] == 0x01:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_ABNORMAL_STRUGGLE_ON,
                            True,
                            "Abnormal Struggle Monitor ON"
                        )
                    else:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_ABNORMAL_STRUGGLE_OFF,
                            True,
                            "Abnormal Struggle Monitor OFF"
                        )

            elif command == 0x1A:
                if data and len(data) > 0:
                    sensitivity = data[0]
                    self.struggle_sensitivity = sensitivity
                    self._handle_query_response(
                        R60ABD1.TYPE_SET_STRUGGLE_SENSITIVITY,
                        sensitivity,
                        "Set Struggle Sensitivity"
                    )

            elif command == 0x14:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.no_person_timing_enabled = switch_status

                    if data[0] == 0x01:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_NO_PERSON_TIMING_ON,
                            True,
                            "No Person Timing ON"
                        )
                    else:
                        self._handle_query_response(
                            R60ABD1.TYPE_CONTROL_NO_PERSON_TIMING_OFF,
                            True,
                            "No Person Timing OFF"
                        )

            elif command == 0x15:
                if data and len(data) > 0:
                    duration = data[0]
                    self.no_person_timing_duration = duration
                    self._handle_query_response(
                        R60ABD1.TYPE_SET_NO_PERSON_TIMING_DURATION,
                        duration,
                        "Set No Person Timing Duration"
                    )

            elif command == 0x16:
                if data and len(data) > 0:
                    duration = data[0]
                    self.sleep_cutoff_duration = duration
                    self._handle_query_response(
                        R60ABD1.TYPE_SET_SLEEP_END_DURATION,
                        duration,
                        "Set Sleep End Duration"
                    )

            elif command == 0x80:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.sleep_monitoring_enabled = switch_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_SLEEP_MONITOR_SWITCH,
                        switch_status,
                        "Sleep Monitor Switch"
                    )

            elif command == 0x93:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.abnormal_struggle_enabled = switch_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_ABNORMAL_STRUGGLE_SWITCH,
                        switch_status,
                        "Abnormal Struggle Monitor Switch"
                    )

            elif command == 0x91:
                if data and len(data) > 0:
                    struggle_status = data[0]
                    self.abnormal_struggle_status = struggle_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_ABNORMAL_STRUGGLE_STATUS,
                        struggle_status,
                        "Abnormal Struggle Status"
                    )

            elif command == 0x9A:
                if data and len(data) > 0:
                    sensitivity = data[0]
                    self.struggle_sensitivity = sensitivity
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_STRUGGLE_SENSITIVITY,
                        sensitivity,
                        "Query Struggle Sensitivity"
                    )

            elif command == 0x94:
                if data and len(data) > 0:
                    switch_status = (data[0] == 0x01)
                    self.no_person_timing_enabled = switch_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_NO_PERSON_TIMING_SWITCH,
                        switch_status,
                        "No Person Timing Switch"
                    )

            elif command == 0x95:
                if data and len(data) > 0:
                    duration = data[0]
                    self.no_person_timing_duration = duration
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_NO_PERSON_TIMING_DURATION,
                        duration,
                        "Query No Person Timing Duration"
                    )

            elif command == 0x92:
                if data and len(data) > 0:
                    timing_status = data[0]
                    self.no_person_timing_status = timing_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_NO_PERSON_TIMING_STATUS,
                        timing_status,
                        "No Person Timing Status"
                    )

            elif command == 0x96:
                if data and len(data) > 0:
                    duration = data[0]
                    self.sleep_cutoff_duration = duration
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_SLEEP_END_DURATION,
                        duration,
                        "Query Sleep End Duration"
                    )

            elif command == 0x81:
                if data and len(data) > 0:
                    bed_status = data[0]
                    self.bed_status = bed_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_BED_STATUS,
                        bed_status,
                        "Bed Status"
                    )

            elif command == 0x82:
                if data and len(data) > 0:
                    sleep_status = data[0]
                    self.sleep_status = sleep_status
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_SLEEP_STATUS,
                        sleep_status,
                        "Sleep Status"
                    )

            elif command == 0x83:
                if data and len(data) >= 2:
                    awake_duration = (data[0] << 8) | data[1]
                    self.awake_duration = awake_duration
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_AWAKE_DURATION,
                        awake_duration,
                        "Awake Duration"
                    )

            elif command == 0x84:
                if data and len(data) >= 2:
                    light_sleep_duration = (data[0] << 8) | data[1]
                    self.light_sleep_duration = light_sleep_duration
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_LIGHT_SLEEP_DURATION,
                        light_sleep_duration,
                        "Light Sleep Duration"
                    )

            elif command == 0x85:
                if data and len(data) >= 2:
                    deep_sleep_duration = (data[0] << 8) | data[1]
                    self.deep_sleep_duration = deep_sleep_duration
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_DEEP_SLEEP_DURATION,
                        deep_sleep_duration,
                        "Deep Sleep Duration"
                    )

            elif command == 0x86:
                if data and len(data) > 0:
                    quality_score = data[0]
                    self.sleep_quality_score = quality_score
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_SLEEP_QUALITY_SCORE,
                        quality_score,
                        "Sleep Quality Score"
                    )

            elif command == 0x8D:
                if data and len(data) == 8:
                    comprehensive_data = self._parse_sleep_comprehensive_data(
                        data)
                    self.sleep_comprehensive_status = {
                        'presence': comprehensive_data[0],
                        'sleep_status': comprehensive_data[1],
                        'avg_breath': comprehensive_data[2],
                        'avg_heart_rate': comprehensive_data[3],
                        'turnover_count': comprehensive_data[4],
                        'large_movement_ratio': comprehensive_data[5],
                        'small_movement_ratio': comprehensive_data[6],
                        'apnea_count': comprehensive_data[7]
                    }
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_SLEEP_COMPREHENSIVE_STATUS,
                        comprehensive_data,
                        "Sleep Comprehensive Status"
                    )

            elif command == 0x8E:
                if data and len(data) > 0:
                    sleep_anomaly = data[0]
                    self.sleep_anomaly = sleep_anomaly
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_SLEEP_ANOMALY,
                        sleep_anomaly,
                        "Sleep Anomaly"
                    )

            elif command == 0x8F:
                if data and len(data) == 12:
                    stats_data = self._parse_sleep_statistics_data(data)
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_SLEEP_STATISTICS,
                        stats_data,
                        "Sleep Statistics"
                    )

            elif command == 0x90:
                if data and len(data) > 0:
                    quality_level = data[0]
                    self.sleep_quality_rating = quality_level
                    self._handle_query_response(
                        R60ABD1.TYPE_QUERY_SLEEP_QUALITY_LEVEL,
                        quality_level,
                        "Sleep Quality Level"
                    )

    def close(self) -> None:

        self._is_running = False
        self._timer.deinit()

        self._query_in_progress = False

        self._query_response_received = False

        self._query_result = None

        self._current_query_type = None

        try:
            frames = self.data_processor.read_and_parse()
            for frame in frames:
                self.update_properties_from_frame(frame)
        except Exception as e:
            raise Exception(f"Failed to deinitialize timer: {str(e)}")

        try:
            stats = self.data_processor.get_stats()
            if R60ABD1.DEBUG_ENABLED:
                print("  [R60ABD1] Final statistics: %s" % format_time())
                print("  Total bytes received: %d" %
                      stats['total_bytes_received'])
                print("  Total frames parsed: %d" %
                      stats['total_frames_parsed'])
                print("  CRC errors: %d" % stats['crc_errors'])
                print("  Frame errors: %d" % stats['frame_errors'])
                print("  Invalid frames: %d" % stats['invalid_frames'])
        except Exception as e:
            raise Exception(f"Failed to get statistics: {str(e)}")

        try:
            self.data_processor.clear_buffer()
        except Exception as e:
            raise Exception(f"Failed to clear buffer: {str(e)}")

        if R60ABD1.DEBUG_ENABLED:
            print("%s [R60ABD1] Resources fully released" % format_time())
