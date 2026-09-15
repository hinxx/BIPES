

from micropython import schedule
from time import sleep_ms
from machine import Pin


class MGX:

    _builtin_polys = {
        "MG811": [0.0, 100.0, -20.0],
        "MG812": [0.0, 200.0, -40.0],
    }

    def __init__(self, adc, comp_pin, user_cb, rl_ohm=10000, vref=3.3, irq_trigger=None):
        self.adc = adc
        self.comp_pin = comp_pin
        self.user_cb = user_cb
        self.rl = float(rl_ohm)
        self.vref = float(vref)
        self._custom_poly = None
        self._selected_builtin = None
        self.last_raw = None
        self.last_voltage = None

        if irq_trigger is None and Pin is not None:
            try:
                irq_trigger = Pin.IRQ_RISING | Pin.IRQ_FALLING
            except Exception:
                irq_trigger = None

        if self.comp_pin is not None and irq_trigger is not None:
            self.comp_pin.irq(handler=self._irq, trigger=irq_trigger)

    def _read_raw(self):
        if self.adc is None:
            raise RuntimeError("ADC object is None")
        if hasattr(self.adc, "read_u16"):
            raw = self.adc.read_u16()
        elif hasattr(self.adc, "read"):
            raw = self.adc.read()
        else:
            raise RuntimeError("ADC object has no read_u16() or read()")
        self.last_raw = int(raw)
        return int(raw)

    def adc_raw_to_voltage(self, raw):
        maxv = 65535.0
        v = (raw / maxv) * self.vref
        return float(v)

    def read_voltage(self):
        raw = self._read_raw()
        v = self.adc_raw_to_voltage(raw)
        self.last_voltage = v
        return v

    def _irq(self, pin):
        try:
            raw = self._read_raw()
        except Exception:
            return
        try:
            schedule(self._scheduled_handler, raw)
        except Exception:
            try:
                v = self.adc_raw_to_voltage(raw)
                self.last_voltage = v
                self.user_cb(v)
            except Exception:
                pass

    def _scheduled_handler(self, raw):
        try:
            v = self.adc_raw_to_voltage(int(raw))
            self.last_voltage = v
            try:
                self.user_cb(v)
            except Exception:
                pass
        except Exception:
            pass

    def select_builtin(self, name):
        key = str(name).upper()
        if key not in self._builtin_polys:
            raise ValueError("unknown builtin key: " + str(name))
        self._selected_builtin = key
        self._custom_poly = None

    def set_custom_polynomial(self, coeffs):
        self._custom_poly = list(coeffs)
        self._selected_builtin = None

    def _get_active_poly(self):
        if self._custom_poly is not None:
            return self._custom_poly
        if self._selected_builtin is not None:
            return list(self._builtin_polys[self._selected_builtin])
        return None

    @staticmethod
    def _eval_poly(coeffs, x):
        res = 0.0
        p = 1.0
        for a in coeffs:
            res += a * p
            p *= x
        return res

    def read_ppm(self, samples=1, delay_ms=0, sensor=None):
        old_sel = self._selected_builtin
        old_custom = self._custom_poly

        if sensor is not None:
            self.select_builtin(sensor)

        coeffs = self._get_active_poly()
        if coeffs is None:
            self._selected_builtin = old_sel
            self._custom_poly = old_custom
            raise RuntimeError("unknown sensor or no polynomial coefficients")

        vals = []
        for _ in range(max(1, int(samples))):
            v = self.read_voltage()
            if v is None:
                continue
            try:
                ppm = float(self._eval_poly(coeffs, v))
            except Exception:
                ppm = float("nan")
            vals.append(ppm)
            if delay_ms:
                sleep_ms(int(delay_ms))

        self._selected_builtin = old_sel
        self._custom_poly = old_custom

        if not vals:
            return float("nan")
        return sum(vals) / len(vals)

    def deinit(self):
        try:
            if self.comp_pin is not None:
                self.comp_pin.irq(handler=None)
        except Exception:
            pass
