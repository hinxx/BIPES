var ble_simple_peripheralBlob = new Blob([
"import bluetooth\n" +
"import random\n" +
"import struct\n" +
"import time\n" +
"\n" +
"from micropython import const\n" +
"\n" +
"_IRQ_CENTRAL_CONNECT = const(1)\n" +
"_IRQ_CENTRAL_DISCONNECT = const(2)\n" +
"_IRQ_GATTS_WRITE = const(3)\n" +
"\n" +
"_FLAG_READ = const (2)\n" +
"_FLAG_WRITE_NO_RESPONSE = const(4)\n" +
"_FLAG_WRITE = const(8)\n" +
"_FLAG_NOTIFY = const(16)\n" +
"\n" +
"_UART_UUID = bluetooth.UUID('6E400001-B5A3-F393-E0A9-E50E24DCCA9E')\n" +
"_UART_TX = (\n" +
"    bluetooth.UUID('6E400003-B5A3-F393-E0A9-E50E24DCCA9E'),\n" +
"    _FLAG_READ | _FLAG_NOTIFY,\n" +
")\n" +
"_UART_RX = (\n" +
"    bluetooth.UUID('6E400002-B5A3-F393-E0A9-E50E24DCCA9E'),\n" +
"    _FLAG_WRITE | _FLAG_WRITE_NO_RESPONSE,\n" +
")\n" +
"_UART_SERVICE = (\n" +
"    _UART_UUID,\n" +
"    (_UART_TX, _UART_RX),\n" +
")\n" +
"\n" +
"# Advertising payloads are repeated packets of the following form:\n" +
"# 1 byte data length (N + 1)\n" +
"# 1 byte type (see constants below)\n" +
"# N bytes type-specific data\n" +
"\n" +
"_ADV_TYPE_FLAGS = const(1)\n" +
"_ADV_TYPE_NAME = const(9)\n" +
"_ADV_TYPE_UUID16_COMPLETE = const(3)\n" +
"_ADV_TYPE_UUID32_COMPLETE = const(5)\n" +
"_ADV_TYPE_UUID128_COMPLETE = const(7)\n" +
"_ADV_TYPE_UUID16_MORE = const(2)\n" +
"_ADV_TYPE_UUID32_MORE = const(4)\n" +
"_ADV_TYPE_UUID128_MORE = const(6)\n" +
"_ADV_TYPE_APPEARANCE = const(25)\n" +
"\n" +
"\n" +
"# Generate a payload to be passed to gap_advertise(adv_data=...).\n" +
"def advertising_payload(limited_disc=False, br_edr=False, name=None, services=None, appearance=0):\n" +
"    payload = bytearray()\n" +
"\n" +
"    def _append(adv_type, value):\n" +
"        nonlocal payload\n" +
"        payload += struct.pack('BB', len(value) + 1, adv_type) + value\n" +
"\n" +
"    _append(_ADV_TYPE_FLAGS, struct.pack('B', (1 if limited_disc else 2) + (24 if br_edr else 4)),)\n" +
"        \n" +
"    if name:\n" +
"        _append(_ADV_TYPE_NAME, name)\n" +
"    if services:\n" +
"        for uuid in services:\n" +
"            b = bytes(uuid)\n" +
"        if len(b) == 2:\n" +
"            _append(_ADV_TYPE_UUID16_COMPLETE, b)\n" +
"        elif len(b) == 4:\n" +
"            _append(_ADV_TYPE_UUID32_COMPLETE, b)\n" +
"        elif len(b) == 16:\n" +
"            _append(_ADV_TYPE_UUID128_COMPLETE, b)\n" +
"\n" +
"    # See org.bluetooth.characteristic.gap.appearance.xml\n" +
"    if appearance:\n" +
"        _append(_ADV_TYPE_APPEARANCE, struct.pack('<h', appearance))\n" +
"\n" +
"    return payload\n" +
"\n" +
"\n" +
"class BLESimplePeripheral:\n" +
"    def __init__(self, ble, name='BIPES-BLE'):\n" +
"        self._ble = ble\n" +
"        self._ble.active(True)\n" +
"        self._ble.irq(self._irq)\n" +
"        ((self._handle_tx, self._handle_rx),) = self._ble.gatts_register_services((_UART_SERVICE,))\n" +
"        self._connections = set()\n" +
"        self._write_callback = None\n" +
"        self._payload = advertising_payload(name=name, services=[_UART_UUID])\n" +
"        self._advertise()\n" +
"\n" +
"    def _irq(self, event, data):\n" +
"        # Track connections so we can send notifications.\n" +
"        if event == _IRQ_CENTRAL_CONNECT:\n" +
"            conn_handle, _, _ = data\n" +
"            print('New connection', conn_handle)\n" +
"            self._connections.add(conn_handle)\n" +
"        elif event == _IRQ_CENTRAL_DISCONNECT:\n" +
"            conn_handle, _, _ = data\n" +
"            print('Disconnected', conn_handle)\n" +
"            self._connections.remove(conn_handle)\n" +
"            # Start advertising again to allow a new connection.\n" +
"            self._advertise()\n" +
"        elif event == _IRQ_GATTS_WRITE:\n" +
"            conn_handle, value_handle = data\n" +
"            value = self._ble.gatts_read(value_handle)\n" +
"            if value_handle == self._handle_rx and self._write_callback:\n" +
"                self._write_callback(value)\n" +
"\n" +
"    def send(self, data):\n" +
"        for conn_handle in self._connections:\n" +
"            self._ble.gatts_notify(conn_handle, self._handle_tx, data)\n" +
"\n" +
"    def is_connected(self):\n" +
"        return len(self._connections) > 0\n" +
"\n" +
"    def _advertise(self, interval_us=500000):\n" +
"        print('Starting advertising')\n" +
"        self._ble.gap_advertise(interval_us, adv_data=self._payload)\n" +
"\n" +
"    def on_write(self, callback):\n" +
"        self._write_callback = callback\n"
], {type: 'text'});