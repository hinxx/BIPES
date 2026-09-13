import bluetooth
import random
import struct
import time

from micropython import const

_IRQ_CENTRAL_CONNECT = const(1)
_IRQ_CENTRAL_DISCONNECT = const(2)
_IRQ_GATTS_WRITE = const(3)

_FLAG_READ = const (2)
_FLAG_WRITE_NO_RESPONSE = const(4)
_FLAG_WRITE = const(8)
_FLAG_NOTIFY = const(16)

_UART_UUID = bluetooth.UUID('6E400001-B5A3-F393-E0A9-E50E24DCCA9E')
_UART_TX = (
    bluetooth.UUID('6E400003-B5A3-F393-E0A9-E50E24DCCA9E'),
    _FLAG_READ | _FLAG_NOTIFY,
)
_UART_RX = (
    bluetooth.UUID('6E400002-B5A3-F393-E0A9-E50E24DCCA9E'),
    _FLAG_WRITE | _FLAG_WRITE_NO_RESPONSE,
)
_UART_SERVICE = (
    _UART_UUID,
    (_UART_TX, _UART_RX),
)

# Advertising payloads are repeated packets of the following form:
# 1 byte data length (N + 1)
# 1 byte type (see constants below)
# N bytes type-specific data

_ADV_TYPE_FLAGS = const(1)
_ADV_TYPE_NAME = const(9)
_ADV_TYPE_UUID16_COMPLETE = const(3)
_ADV_TYPE_UUID32_COMPLETE = const(5)
_ADV_TYPE_UUID128_COMPLETE = const(7)
_ADV_TYPE_UUID16_MORE = const(2)
_ADV_TYPE_UUID32_MORE = const(4)
_ADV_TYPE_UUID128_MORE = const(6)
_ADV_TYPE_APPEARANCE = const(25)


# Generate a payload to be passed to gap_advertise(adv_data=...).
def advertising_payload(limited_disc=False, br_edr=False, name=None, services=None, appearance=0):
    payload = bytearray()

    def _append(adv_type, value):
        nonlocal payload
        payload += struct.pack('BB', len(value) + 1, adv_type) + value

    _append(_ADV_TYPE_FLAGS, struct.pack('B', (1 if limited_disc else 2) + (24 if br_edr else 4)),)
        
    if name:
        _append(_ADV_TYPE_NAME, name)
    if services:
        for uuid in services:
            b = bytes(uuid)
        if len(b) == 2:
            _append(_ADV_TYPE_UUID16_COMPLETE, b)
        elif len(b) == 4:
            _append(_ADV_TYPE_UUID32_COMPLETE, b)
        elif len(b) == 16:
            _append(_ADV_TYPE_UUID128_COMPLETE, b)

    # See org.bluetooth.characteristic.gap.appearance.xml
    if appearance:
        _append(_ADV_TYPE_APPEARANCE, struct.pack('<h', appearance))

    return payload


class BLESimplePeripheral:
    def __init__(self, ble, name='BIPES-BLE'):
        self._ble = ble
        self._ble.active(True)
        self._ble.irq(self._irq)
        ((self._handle_tx, self._handle_rx),) = self._ble.gatts_register_services((_UART_SERVICE,))
        self._connections = set()
        self._write_callback = None
        self._payload = advertising_payload(name=name, services=[_UART_UUID])
        self._advertise()

    def _irq(self, event, data):
        # Track connections so we can send notifications.
        if event == _IRQ_CENTRAL_CONNECT:
            conn_handle, _, _ = data
            print('New connection', conn_handle)
            self._connections.add(conn_handle)
        elif event == _IRQ_CENTRAL_DISCONNECT:
            conn_handle, _, _ = data
            print('Disconnected', conn_handle)
            self._connections.remove(conn_handle)
            # Start advertising again to allow a new connection.
            self._advertise()
        elif event == _IRQ_GATTS_WRITE:
            conn_handle, value_handle = data
            value = self._ble.gatts_read(value_handle)
            if value_handle == self._handle_rx and self._write_callback:
                self._write_callback(value)

    def send(self, data):
        for conn_handle in self._connections:
            self._ble.gatts_notify(conn_handle, self._handle_tx, data)

    def is_connected(self):
        return len(self._connections) > 0

    def _advertise(self, interval_us=500000):
        print('Starting advertising')
        self._ble.gap_advertise(interval_us, adv_data=self._payload)

    def on_write(self, callback):
        self._write_callback = callback
