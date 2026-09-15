/*
 * code generation for BIPES
 *
 */

/**
 * Declare a MicroPython I2C bus once and return the variable holding it.
 *
 * Every I2C device block used to construct its own bus object with its own
 * variable name (i2cOLED, i2cMPU6050, lcdi2c, ...), so two peripherals wired to
 * the same pins ended up with two objects fighting over one bus. Registering
 * the bus in definitions_ keyed by its pins means blocks that share pins share
 * the object, while a device on different pins still gets its own.
 *
 * The import is registered per class, because I2C and SoftI2C previously shared
 * the definitions_ key 'import_I2C_Pin' -- mixing the two kinds of block in one
 * program left whichever import lost undefined.
 *
 * @param {Object} opts - {scl, sda, id, freq, soft}; all except scl/sda optional
 * @returns {string} name of the variable holding the bus
 */
Blockly.Python.i2cBus_ = function(opts) {
  let str = (v) => (v === undefined || v === null) ? '' : String(v).trim();
  let scl = str(opts.scl), sda = str(opts.sda);
  let id = str(opts.id), freq = str(opts.freq);
  let cls = opts.soft ? 'SoftI2C' : 'I2C';

  // The pins identify the physical bus; id/freq only decorate it.
  let core = (scl + '_' + sda).replace(/[^A-Za-z0-9_]+/g, '_')
                              .replace(/_+/g, '_').replace(/^_|_$/g, '');
  let name = 'i2c_' + (core || 'bus');

  Blockly.Python.definitions_['import_' + cls + '_Pin'] = 'from machine import ' + cls + ', Pin';

  // First block to claim these pins defines the bus; later ones reuse it.
  let key = 'i2c_bus_' + (core || 'bus');
  if (!(key in Blockly.Python.definitions_)) {
    let args = [];
    if (!opts.soft && id !== '') args.push(id);
    if (scl !== '') args.push('scl=Pin(' + scl + ')');
    if (sda !== '') args.push('sda=Pin(' + sda + ')');
    if (freq !== '') args.push('freq=' + freq);
    Blockly.Python.definitions_[key] = name + ' = ' + cls + '(' + args.join(', ') + ')';
  }
  return name;
};



Blockly.Python['delay_old'] = function(block) {
  var value_time = Blockly.Python.valueToCode(block, 'time', Blockly.Python.ORDER_ATOMIC);
  Blockly.Python.definitions_['import_time'] = 'import time';
  var code = 'time.sleep(' + value_time + ')\n';
  return code;
};




















Blockly.Python['esp32_adc'] = function(block) {
  var value_pin = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  var x = value_pin.replace('(','').replace(')','');

  var dropdown_attenuation = block.getFieldValue('Attenuation');
  var dropdown_width__ = block.getFieldValue('Width: ');

  var atten = 'ADC.ATTN_0DB';
  if (dropdown_attenuation==0)
                  atten = 'ADC.ATTN_0DB';
  if (dropdown_attenuation==1)
                  atten = 'ADC.ATTN_2_5DB';
  if (dropdown_attenuation==2)
                  atten = 'ADC.ATTN_6DB';
  if (dropdown_attenuation==3)
                  atten = 'ADC.ATTN_11DB';

  var w = 'ADC.WIDTH_10BIT';
  if (dropdown_width__==0)
        w = 'ADC.WIDTH_9BIT';
  if (dropdown_width__==1)
        w = 'ADC.WIDTH_10BIT';
  if (dropdown_width__==2)
        w = 'ADC.WIDTH_11BIT';
  if (dropdown_width__==3)
        w = 'ADC.WIDTH_12BIT';

	var x = value_pin.replace('(','').replace(')','');
	//For Circuit Python
	if (UI ['workspace'].selector.value == "ESP32S2") {
		Blockly.Python.definitions_['import_board'] = 'import board';
		Blockly.Python.definitions_['import_analogio'] = 'from analogio import AnalogIn';
		Blockly.Python.definitions_['analogIn' + x] = 'try:\n\tanalogIn' + x + '.deinit()\nexcept:\n\tpass\nanalogIn' + x + '=AnalogIn(board.IO' + x + ')\n';
		var code = 'analogIn' + x + '.value';
	} else {
		Blockly.Python.definitions_['import_adc'] = 'from machine import ADC';
		Blockly.Python.definitions_['import_pin'] = 'from machine import Pin';

		Blockly.Python.definitions_['init_adc' + x] = 'adc' + x + '=ADC(Pin(' + x + '))\nadc' + x + '.atten(' + atten + ')\nadc' + x + '.width(' + w + ')\n';

		var code = 'adc' + x + '.read()';
	}
	return [code, Blockly.Python.ORDER_NONE];
};




Blockly.Python['adc_pico'] = function(block) {
  Blockly.Python.definitions_['import_adc'] = 'from machine import ADC';
  Blockly.Python.definitions_['import_pin'] = 'from machine import Pin';
  var value_pin = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  var x = value_pin.replace('(','').replace(')','');

  Blockly.Python.definitions_['init_adc' + x] = 'adc' + x + '=ADC(' + x + ')';

  var code = 'adc' + x + '.read_u16()';
  return [code, Blockly.Python.ORDER_NONE];
};



Blockly.Python['adc'] = function(block) {
  Blockly.Python.definitions_['import_adc'] = 'from machine import ADC';
  var value_pin = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  Blockly.Python.definitions_[`init_adc_${value_pin}`] = 'adc' + value_pin + '=ADC(' + value_pin + ')';
  var code = 'adc' + value_pin + '.read()';
  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['gpio_interrupt'] = function(block) {
  // Fix for global variables inside callback
  // Piece of code from generators/python/procedures.js
  // Define a procedure with a return value.
  // First, add a 'global' statement for every variable that is not shadowed by
  // a local parameter.
  var globals = [];
  var workspace = block.workspace;
  var variables = Blockly.Variables.allUsedVarModels(workspace) || [];
  for (var i = 0, variable; (variable = variables[i]); i++) {
    var varName = variable.name;
    if (block.getVars().indexOf(varName) == -1) {
      globals.push(Blockly.Python.nameDB_.getName(varName,
          Blockly.VARIABLE_CATEGORY_NAME));
    }
  }
  globals = globals.length ? Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';

  var dropdown_trigger = block.getFieldValue('trigger');
  var value_pin = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  var statements_code = Blockly.Python.statementToCode(block, 'code');
  var value_pin = value_pin.replace('(','').replace(')','');

  Blockly.Python.definitions_['import_pin'] = 'from machine import Pin';

  if (dropdown_trigger == 'BOTH')
	dropdown_trigger = 'IRQ_RISING | Pin.IRQ_FALLING';

  var code='';
  if (value_pin) {
    Blockly.Python.definitions_[`gpio_interrupt${value_pin}`] = `\n#Interrupt handler\ndef callback${value_pin}(pPin):\n${globals}${statements_code}\n\n`;

	  code = `p${value_pin} = Pin(${value_pin}, Pin.IN)\n`;
	  code += `p${value_pin}.irq(trigger=Pin.${dropdown_trigger}, handler=callback${value_pin})\n`;
  }

  return code;
};

Blockly.Python['gpio_interrupt_off'] = function(block) {
  var value_pin = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);

  var value_pin = value_pin.replace('(','').replace(')','');
  var code='';

  if (value_pin)
	  code = 'p' + value_pin + '.irq(trigger=0, handler=callback' + value_pin + ')\n';

  return code;
};


/// Pinout
Blockly.Python['pinout'] = function(block) {
  var pin = block.getFieldValue('PIN');
  
  return [pin, Blockly.Python.ORDER_NONE];
};

/// Convert to Str

/// Decode Bytes to Str

/// Convert to Int
/// Convert to Float

//OneWire

// ds3231
// MPR121
// vl53l0x

  
  
  
  
  
Blockly.Python['net_get_request'] = function(block) {
	var value_url = Blockly.Python.valueToCode(block, 'URL', Blockly.Python.ORDER_ATOMIC);

	if (UI ['workspace'].selector.value == "ESP32S2") {
		Blockly.Python.definitions_['import_ipaddress'] = 'import ipaddress';
		Blockly.Python.definitions_['import_ssl'] = 'import ssl';
		Blockly.Python.definitions_['import_wifi'] = 'import wifi';
		Blockly.Python.definitions_['import_socketpool'] = 'import socketpool';
		Blockly.Python.definitions_['import_http_get'] = 'def http_get(pHOST):\n\ttmp=pHOST.replace("http://", "")\n\tHOST=tmp.split("/", 1)[0]\n\tparams=tmp.split("/",1)[1]\n\tprint("Host: " + HOST)\n\tprint("Params = " + params)\n\tpool = socketpool.SocketPool(wifi.radio)\n\tserver_ipv4 = ipaddress.ip_address(pool.getaddrinfo(HOST, 80)[0][4][0])\n\tprint("Server ping", server_ipv4, wifi.radio.ping(server_ipv4), "ms")\n\tbuf = bytearray(500)\n\ts = pool.socket(pool.AF_INET, pool.SOCK_STREAM)\n\ts.settimeout(50)\n\tprint("Connecting")\n\ts.connect((HOST, 80))\n\tsize = s.send(bytes(\'GET /%s HTTP/1.0\\r\\nHost: %s\\r\\n\\r\\n\' % (params, HOST), \'utf8\'))\n\tprint("Sent", size, "bytes")\n\tsize = s.recv_into(buf)\n\tprint(\'Received\', size, "bytes", buf[:size])\n\ts.close()\n\treturn buf[:size]\n';

		var code = 'http_get(' + value_url + ')\n';
	} else {
		Blockly.Python.definitions_['import_urequests'] = 'import urequests';
		var code = 'urequests.get(' + value_url + ')\n';
	}
	return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['net_post_request'] = function(block) {
  var value_url = Blockly.Python.valueToCode(block, 'URL', Blockly.Python.ORDER_ATOMIC);
  var value_data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_ATOMIC);
  Blockly.Python.definitions_['import_urequests'] = 'import urequests';
  var code = 'urequests.post(' + value_url + ', data = ' + value_data + ')\n';
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['net_post_request_json'] = function(block) {
  var value_url = Blockly.Python.valueToCode(block, 'URL', Blockly.Python.ORDER_ATOMIC);
  var value_data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_ATOMIC);
  Blockly.Python.definitions_['import_urequests'] = 'import urequests';

  var value_data2 = value_data.replace('\'','').replace('\'','');
  var value_data3 = value_data2.replace('(','[').replace(')',']');
	console.log('TESTE = ' + value_data3);
  var code = 'urequests.post(' + value_url + ', json=' + value_data3 + ')\n';
	console.log('Code = ' + code);
//  var code = 'urequests.post(' + value_url + ', json={' + value_data2 + '})\n';
  return [code, Blockly.Python.ORDER_NONE];
};






/// AHT10/20
/// Start AHT Sensor
/// Read AHT10/20 Temperature
  /// Read AHT10/20 Humidity
  /// BH1750
/// Start BH1750 Sensor
/// Read BH1750
  /// TM1637 Display
/// TM1637 Write a character at a position
/// TM1637 Write Text
/// TM1637 Scroll Text
/// TM1637 Clear Display
/// TM1637 Set Brightness
/// TM1637 Set Time
/// TM1637 Set Temperature
/// MAX7219 Display
Blockly.Python['max7219_custom'] = function (block) {
    var checkbox_a0 = block.getFieldValue('A0') == 'TRUE';
    var checkbox_a1 = block.getFieldValue('A1') == 'TRUE';
    var checkbox_a2 = block.getFieldValue('A2') == 'TRUE';
    var checkbox_a3 = block.getFieldValue('A3') == 'TRUE';
    var checkbox_a4 = block.getFieldValue('A4') == 'TRUE';
    var checkbox_a5 = block.getFieldValue('A5') == 'TRUE';
    var checkbox_a6 = block.getFieldValue('A6') == 'TRUE';
    var checkbox_a7 = block.getFieldValue('A7') == 'TRUE';
    var checkbox_b0 = block.getFieldValue('B0') == 'TRUE';
    var checkbox_b1 = block.getFieldValue('B1') == 'TRUE';
    var checkbox_b2 = block.getFieldValue('B2') == 'TRUE';
    var checkbox_b3 = block.getFieldValue('B3') == 'TRUE';
    var checkbox_b4 = block.getFieldValue('B4') == 'TRUE';
    var checkbox_b5 = block.getFieldValue('B5') == 'TRUE';
    var checkbox_b6 = block.getFieldValue('B6') == 'TRUE';
    var checkbox_b7 = block.getFieldValue('B7') == 'TRUE';
    var checkbox_c0 = block.getFieldValue('C0') == 'TRUE';
    var checkbox_c1 = block.getFieldValue('C1') == 'TRUE';
    var checkbox_c2 = block.getFieldValue('C2') == 'TRUE';
    var checkbox_c3 = block.getFieldValue('C3') == 'TRUE';
    var checkbox_c4 = block.getFieldValue('C4') == 'TRUE';
    var checkbox_c5 = block.getFieldValue('C5') == 'TRUE';
    var checkbox_c6 = block.getFieldValue('C6') == 'TRUE';
    var checkbox_c7 = block.getFieldValue('C7') == 'TRUE';
    var checkbox_d0 = block.getFieldValue('D0') == 'TRUE';
    var checkbox_d1 = block.getFieldValue('D1') == 'TRUE';
    var checkbox_d2 = block.getFieldValue('D2') == 'TRUE';
    var checkbox_d3 = block.getFieldValue('D3') == 'TRUE';
    var checkbox_d4 = block.getFieldValue('D4') == 'TRUE';
    var checkbox_d5 = block.getFieldValue('D5') == 'TRUE';
    var checkbox_d6 = block.getFieldValue('D6') == 'TRUE';
    var checkbox_d7 = block.getFieldValue('D7') == 'TRUE';
    var checkbox_e0 = block.getFieldValue('E0') == 'TRUE';
    var checkbox_e1 = block.getFieldValue('E1') == 'TRUE';
    var checkbox_e2 = block.getFieldValue('E2') == 'TRUE';
    var checkbox_e3 = block.getFieldValue('E3') == 'TRUE';
    var checkbox_e4 = block.getFieldValue('E4') == 'TRUE';
    var checkbox_e5 = block.getFieldValue('E5') == 'TRUE';
    var checkbox_e6 = block.getFieldValue('E6') == 'TRUE';
    var checkbox_e7 = block.getFieldValue('E7') == 'TRUE';
    var checkbox_f0 = block.getFieldValue('F0') == 'TRUE';
    var checkbox_f1 = block.getFieldValue('F1') == 'TRUE';
    var checkbox_f2 = block.getFieldValue('F2') == 'TRUE';
    var checkbox_f3 = block.getFieldValue('F3') == 'TRUE';
    var checkbox_f4 = block.getFieldValue('F4') == 'TRUE';
    var checkbox_f5 = block.getFieldValue('F5') == 'TRUE';
    var checkbox_f6 = block.getFieldValue('F6') == 'TRUE';
    var checkbox_f7 = block.getFieldValue('F7') == 'TRUE';
    var checkbox_g0 = block.getFieldValue('G0') == 'TRUE';
    var checkbox_g1 = block.getFieldValue('G1') == 'TRUE';
    var checkbox_g2 = block.getFieldValue('G2') == 'TRUE';
    var checkbox_g3 = block.getFieldValue('G3') == 'TRUE';
    var checkbox_g4 = block.getFieldValue('G4') == 'TRUE';
    var checkbox_g5 = block.getFieldValue('G5') == 'TRUE';
    var checkbox_g6 = block.getFieldValue('G6') == 'TRUE';
    var checkbox_g7 = block.getFieldValue('G7') == 'TRUE';
    var checkbox_h0 = block.getFieldValue('H0') == 'TRUE';
    var checkbox_h1 = block.getFieldValue('H1') == 'TRUE';
    var checkbox_h2 = block.getFieldValue('H2') == 'TRUE';
    var checkbox_h3 = block.getFieldValue('H3') == 'TRUE';
    var checkbox_h4 = block.getFieldValue('H4') == 'TRUE';
    var checkbox_h5 = block.getFieldValue('H5') == 'TRUE';
    var checkbox_h6 = block.getFieldValue('H6') == 'TRUE';
    var checkbox_h7 = block.getFieldValue('H7') == 'TRUE';

	var code = 'matrix.pixel(0, 0, ' + Number(checkbox_a0) + ')\n'
	code += 'matrix.pixel(1, 0, ' + Number(checkbox_a1) + ')\n'
	code += 'matrix.pixel(2, 0, ' + Number(checkbox_a2) + ')\n'
	code += 'matrix.pixel(3, 0, ' + Number(checkbox_a3) + ')\n'
	code += 'matrix.pixel(4, 0, ' + Number(checkbox_a4) + ')\n'
	code += 'matrix.pixel(5, 0, ' + Number(checkbox_a5) + ')\n'
	code += 'matrix.pixel(6, 0, ' + Number(checkbox_a6) + ')\n'
	code += 'matrix.pixel(7, 0, ' + Number(checkbox_a7) + ')\n'
	code += 'matrix.pixel(0, 1, ' + Number(checkbox_b0) + ')\n'
	code += 'matrix.pixel(1, 1, ' + Number(checkbox_b1) + ')\n'
	code += 'matrix.pixel(2, 1, ' + Number(checkbox_b2) + ')\n'
	code += 'matrix.pixel(3, 1, ' + Number(checkbox_b3) + ')\n'
	code += 'matrix.pixel(4, 1, ' + Number(checkbox_b4) + ')\n'
	code += 'matrix.pixel(5, 1, ' + Number(checkbox_b5) + ')\n'
	code += 'matrix.pixel(6, 1, ' + Number(checkbox_b6) + ')\n'
	code += 'matrix.pixel(7, 1, ' + Number(checkbox_b7) + ')\n'
	code += 'matrix.pixel(0, 2, ' + Number(checkbox_c0) + ')\n'
	code += 'matrix.pixel(1, 2, ' + Number(checkbox_c1) + ')\n'
	code += 'matrix.pixel(2, 2, ' + Number(checkbox_c2) + ')\n'
	code += 'matrix.pixel(3, 2, ' + Number(checkbox_c3) + ')\n'
	code += 'matrix.pixel(4, 2, ' + Number(checkbox_c4) + ')\n'
	code += 'matrix.pixel(5, 2, ' + Number(checkbox_c5) + ')\n'
	code += 'matrix.pixel(6, 2, ' + Number(checkbox_c6) + ')\n'
	code += 'matrix.pixel(7, 2, ' + Number(checkbox_c7) + ')\n'
	code += 'matrix.pixel(0, 3, ' + Number(checkbox_d0) + ')\n'
	code += 'matrix.pixel(1, 3, ' + Number(checkbox_d1) + ')\n'
	code += 'matrix.pixel(2, 3, ' + Number(checkbox_d2) + ')\n'
	code += 'matrix.pixel(3, 3, ' + Number(checkbox_d3) + ')\n'
	code += 'matrix.pixel(4, 3, ' + Number(checkbox_d4) + ')\n'
	code += 'matrix.pixel(5, 3, ' + Number(checkbox_d5) + ')\n'
	code += 'matrix.pixel(6, 3, ' + Number(checkbox_d6) + ')\n'
	code += 'matrix.pixel(7, 3, ' + Number(checkbox_d7) + ')\n'
	code += 'matrix.pixel(0, 4, ' + Number(checkbox_e0) + ')\n'
	code += 'matrix.pixel(1, 4, ' + Number(checkbox_e1) + ')\n'
	code += 'matrix.pixel(2, 4, ' + Number(checkbox_e2) + ')\n'
	code += 'matrix.pixel(3, 4, ' + Number(checkbox_e3) + ')\n'
	code += 'matrix.pixel(4, 4, ' + Number(checkbox_e4) + ')\n'
	code += 'matrix.pixel(5, 4, ' + Number(checkbox_e5) + ')\n'
	code += 'matrix.pixel(6, 4, ' + Number(checkbox_e6) + ')\n'
	code += 'matrix.pixel(7, 4, ' + Number(checkbox_e7) + ')\n'
	code += 'matrix.pixel(0, 5, ' + Number(checkbox_f0) + ')\n'
	code += 'matrix.pixel(1, 5, ' + Number(checkbox_f1) + ')\n'
	code += 'matrix.pixel(2, 5, ' + Number(checkbox_f2) + ')\n'
	code += 'matrix.pixel(3, 5, ' + Number(checkbox_f3) + ')\n'
	code += 'matrix.pixel(4, 5, ' + Number(checkbox_f4) + ')\n'
	code += 'matrix.pixel(5, 5, ' + Number(checkbox_f5) + ')\n'
	code += 'matrix.pixel(6, 5, ' + Number(checkbox_f6) + ')\n'
	code += 'matrix.pixel(7, 5, ' + Number(checkbox_f7) + ')\n'
	code += 'matrix.pixel(0, 6, ' + Number(checkbox_g0) + ')\n'
	code += 'matrix.pixel(1, 6, ' + Number(checkbox_g1) + ')\n'
	code += 'matrix.pixel(2, 6, ' + Number(checkbox_g2) + ')\n'
	code += 'matrix.pixel(3, 6, ' + Number(checkbox_g3) + ')\n'
	code += 'matrix.pixel(4, 6, ' + Number(checkbox_g4) + ')\n'
	code += 'matrix.pixel(5, 6, ' + Number(checkbox_g5) + ')\n'
	code += 'matrix.pixel(6, 6, ' + Number(checkbox_g6) + ')\n'
	code += 'matrix.pixel(7, 6, ' + Number(checkbox_g7) + ')\n'
	code += 'matrix.pixel(0, 7, ' + Number(checkbox_h0) + ')\n'
	code += 'matrix.pixel(1, 7, ' + Number(checkbox_h1) + ')\n'
	code += 'matrix.pixel(2, 7, ' + Number(checkbox_h2) + ')\n'
	code += 'matrix.pixel(3, 7, ' + Number(checkbox_h3) + ')\n'
	code += 'matrix.pixel(4, 7, ' + Number(checkbox_h4) + ')\n'
	code += 'matrix.pixel(5, 7, ' + Number(checkbox_h5) + ')\n'
	code += 'matrix.pixel(6, 7, ' + Number(checkbox_h6) + ')\n'
	code += 'matrix.pixel(7, 7, ' + Number(checkbox_h7) + ')\n'
	code += 'matrix.show()\n'
    return code;
};



Blockly.Python['tm1640_custom'] = function (block) {
    var checkbox_a0 = block.getFieldValue('A0') == 'TRUE';
    var checkbox_a1 = block.getFieldValue('A1') == 'TRUE';
    var checkbox_a2 = block.getFieldValue('A2') == 'TRUE';
    var checkbox_a3 = block.getFieldValue('A3') == 'TRUE';
    var checkbox_a4 = block.getFieldValue('A4') == 'TRUE';
    var checkbox_a5 = block.getFieldValue('A5') == 'TRUE';
    var checkbox_a6 = block.getFieldValue('A6') == 'TRUE';
    var checkbox_a7 = block.getFieldValue('A7') == 'TRUE';
    var checkbox_b0 = block.getFieldValue('B0') == 'TRUE';
    var checkbox_b1 = block.getFieldValue('B1') == 'TRUE';
    var checkbox_b2 = block.getFieldValue('B2') == 'TRUE';
    var checkbox_b3 = block.getFieldValue('B3') == 'TRUE';
    var checkbox_b4 = block.getFieldValue('B4') == 'TRUE';
    var checkbox_b5 = block.getFieldValue('B5') == 'TRUE';
    var checkbox_b6 = block.getFieldValue('B6') == 'TRUE';
    var checkbox_b7 = block.getFieldValue('B7') == 'TRUE';
    var checkbox_c0 = block.getFieldValue('C0') == 'TRUE';
    var checkbox_c1 = block.getFieldValue('C1') == 'TRUE';
    var checkbox_c2 = block.getFieldValue('C2') == 'TRUE';
    var checkbox_c3 = block.getFieldValue('C3') == 'TRUE';
    var checkbox_c4 = block.getFieldValue('C4') == 'TRUE';
    var checkbox_c5 = block.getFieldValue('C5') == 'TRUE';
    var checkbox_c6 = block.getFieldValue('C6') == 'TRUE';
    var checkbox_c7 = block.getFieldValue('C7') == 'TRUE';
    var checkbox_d0 = block.getFieldValue('D0') == 'TRUE';
    var checkbox_d1 = block.getFieldValue('D1') == 'TRUE';
    var checkbox_d2 = block.getFieldValue('D2') == 'TRUE';
    var checkbox_d3 = block.getFieldValue('D3') == 'TRUE';
    var checkbox_d4 = block.getFieldValue('D4') == 'TRUE';
    var checkbox_d5 = block.getFieldValue('D5') == 'TRUE';
    var checkbox_d6 = block.getFieldValue('D6') == 'TRUE';
    var checkbox_d7 = block.getFieldValue('D7') == 'TRUE';
    var checkbox_e0 = block.getFieldValue('E0') == 'TRUE';
    var checkbox_e1 = block.getFieldValue('E1') == 'TRUE';
    var checkbox_e2 = block.getFieldValue('E2') == 'TRUE';
    var checkbox_e3 = block.getFieldValue('E3') == 'TRUE';
    var checkbox_e4 = block.getFieldValue('E4') == 'TRUE';
    var checkbox_e5 = block.getFieldValue('E5') == 'TRUE';
    var checkbox_e6 = block.getFieldValue('E6') == 'TRUE';
    var checkbox_e7 = block.getFieldValue('E7') == 'TRUE';
    var checkbox_f0 = block.getFieldValue('F0') == 'TRUE';
    var checkbox_f1 = block.getFieldValue('F1') == 'TRUE';
    var checkbox_f2 = block.getFieldValue('F2') == 'TRUE';
    var checkbox_f3 = block.getFieldValue('F3') == 'TRUE';
    var checkbox_f4 = block.getFieldValue('F4') == 'TRUE';
    var checkbox_f5 = block.getFieldValue('F5') == 'TRUE';
    var checkbox_f6 = block.getFieldValue('F6') == 'TRUE';
    var checkbox_f7 = block.getFieldValue('F7') == 'TRUE';
    var checkbox_g0 = block.getFieldValue('G0') == 'TRUE';
    var checkbox_g1 = block.getFieldValue('G1') == 'TRUE';
    var checkbox_g2 = block.getFieldValue('G2') == 'TRUE';
    var checkbox_g3 = block.getFieldValue('G3') == 'TRUE';
    var checkbox_g4 = block.getFieldValue('G4') == 'TRUE';
    var checkbox_g5 = block.getFieldValue('G5') == 'TRUE';
    var checkbox_g6 = block.getFieldValue('G6') == 'TRUE';
    var checkbox_g7 = block.getFieldValue('G7') == 'TRUE';
    var checkbox_h0 = block.getFieldValue('H0') == 'TRUE';
    var checkbox_h1 = block.getFieldValue('H1') == 'TRUE';
    var checkbox_h2 = block.getFieldValue('H2') == 'TRUE';
    var checkbox_h3 = block.getFieldValue('H3') == 'TRUE';
    var checkbox_h4 = block.getFieldValue('H4') == 'TRUE';
    var checkbox_h5 = block.getFieldValue('H5') == 'TRUE';
    var checkbox_h6 = block.getFieldValue('H6') == 'TRUE';
    var checkbox_h7 = block.getFieldValue('H7') == 'TRUE';

    var line1 = Number(checkbox_a0) * 2**0 + Number(checkbox_a1) * 2**1 + Number(checkbox_a2) * 2**2 + Number(checkbox_a3) * 2**3 + Number(checkbox_a4) * 2**4 + Number(checkbox_a5) * 2**5 + Number(checkbox_a6) * 2**6 + Number(checkbox_a7) * 2**7;
    var line2 = Number(checkbox_b0) * 2**0 + Number(checkbox_b1) * 2**1 + Number(checkbox_b2) * 2**2 + Number(checkbox_b3) * 2**3 + Number(checkbox_b4) * 2**4 + Number(checkbox_b5) * 2**5 + Number(checkbox_b6) * 2**6 + Number(checkbox_b7) * 2**7;
    var line3 = Number(checkbox_c0) * 2**0 + Number(checkbox_c1) * 2**1 + Number(checkbox_c2) * 2**2 + Number(checkbox_c3) * 2**3 + Number(checkbox_c4) * 2**4 + Number(checkbox_c5) * 2**5 + Number(checkbox_c6) * 2**6 + Number(checkbox_c7) * 2**7;
    var line4 = Number(checkbox_d0) * 2**0 + Number(checkbox_d1) * 2**1 + Number(checkbox_d2) * 2**2 + Number(checkbox_d3) * 2**3 + Number(checkbox_d4) * 2**4 + Number(checkbox_d5) * 2**5 + Number(checkbox_d6) * 2**6 + Number(checkbox_d7) * 2**7;
    var line5 = Number(checkbox_e0) * 2**0 + Number(checkbox_e1) * 2**1 + Number(checkbox_e2) * 2**2 + Number(checkbox_e3) * 2**3 + Number(checkbox_e4) * 2**4 + Number(checkbox_e5) * 2**5 + Number(checkbox_e6) * 2**6 + Number(checkbox_e7) * 2**7;
    var line6 = Number(checkbox_f0) * 2**0 + Number(checkbox_f1) * 2**1 + Number(checkbox_f2) * 2**2 + Number(checkbox_f3) * 2**3 + Number(checkbox_f4) * 2**4 + Number(checkbox_f5) * 2**5 + Number(checkbox_f6) * 2**6 + Number(checkbox_f7) * 2**7;
    var line7 = Number(checkbox_g0) * 2**0 + Number(checkbox_g1) * 2**1 + Number(checkbox_g2) * 2**2 + Number(checkbox_g3) * 2**3 + Number(checkbox_g4) * 2**4 + Number(checkbox_g5) * 2**5 + Number(checkbox_g6) * 2**6 + Number(checkbox_g7) * 2**7;
    var line8 = Number(checkbox_h0) * 2**0 + Number(checkbox_h1) * 2**1 + Number(checkbox_h2) * 2**2 + Number(checkbox_h3) * 2**3 + Number(checkbox_h4) * 2**4 + Number(checkbox_h5) * 2**5 + Number(checkbox_h6) * 2**6 + Number(checkbox_h7) * 2**7;


    var code = 'tm.write([' + line8 + ',' + line7 + ',' + line6 + ',' + line5 + ',' + line4 + ',' + line3 + ',' + line2 + ',' + line1 + '])\n';
    return code;
};

/// EasyMQTT
/// EasyMQTT Init
Blockly.Python['easymqtt_init'] = function(block) {
  var server = '"bipes.net.br"';
  var port = '1883';
  var user = '"bipes"';
  var pass = '"m8YLUr5uW3T"';
  var session = block.getFieldValue('EASYMQTT_SESSION_ID');
  window.easyMQTT_session = session;

  Blockly.Python.definitions_['import_robust'] = 'import robust';
  var code = 'easymqtt_session = "' + session + '"; \neasymqtt_client = robust.MQTTClient("umqtt_client", server = ' + server + ', port = ' + port + ', user = ' + user + ', password = ' + pass + '); \neasymqtt_client.connect()\nprint("EasyMQTT connected")\n'
  return code;
};

/// EasyMQTT Publish Data

/// EasyMQTT Disconnect

///EasyMQTT Subscribe
Blockly.Python['easymqtt_subscribe'] = function(block) {
  var var_name = Blockly.Python.nameDB_.getName(
      block.getFieldValue('EASYMQTT_VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  // Fix for global variables inside callback
  // Piece of code from generators/python/procedures.js
  // Define a procedure with a return value.
  // First, add a 'global' statement for every variable that is not shadowed by
  // a local parameter.
  var globals = [];
  var varName;
  var workspace = block.workspace;
  var variables = Blockly.Variables.allUsedVarModels(workspace) || [];
  for (var i = 0, variable; variable = variables[i]; i++) {
    varName = variable.name;
    if (block.getVars().indexOf(varName) == -1 && varName != var_name) {
      globals.push(Blockly.Python.nameDB_.getName(varName,
          Blockly.VARIABLE_CATEGORY_NAME));
    }
  }
  // Add developer variables.
  var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
  for (var i = 0; i < devVarList.length; i++) {
    globals.push(Blockly.Python.nameDB_.getName(devVarList[i],
        Blockly.Names.DEVELOPER_VARIABLE_TYPE));
  }
  globals = globals.length ? Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';

  Blockly.Python.definitions_['import_robust'] = 'import robust';
  var topic = Blockly.Python.valueToCode(block, 'topic', Blockly.Python.ORDER_ATOMIC);
  var funct_code = Blockly.Python.statementToCode(block, 'do');
  var name = topic.replace(/\W/g, '_');

  var function_name = Blockly.Python.provideFunction_(
    'easymqtt'+name,
    ['def ' + Blockly.Python.FUNCTION_NAME_PLACEHOLDER_ + '('+var_name+'):',globals,funct_code]);

  Blockly.Python.definitions_['easymqtt_callback'] = 'easymqtt_callback_list = {}\ndef easymqtt_callback(topic_,msg_):\n  topic_=topic_.decode();msg_=msg_.decode()\n  if topic_ in easymqtt_callback_list: easymqtt_callback_list[topic_](float(msg_))';

  var code = "easymqtt_client.set_callback(easymqtt_callback)\neasymqtt_callback_list['"+window.easyMQTT_session+"/' + "+topic+"]="+function_name+"\neasymqtt_client.subscribe('"+window.easyMQTT_session+"/' + "+topic+")\n"
  return code;
};

/// EasyMQTT Receive Data



Blockly.Python['mqtt_add_to_buffer'] = function(block) {
  var name = Blockly.Python.valueToCode(block, 'fieldname', Blockly.Python.ORDER_ATOMIC);
  var value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC);

  var code = 'mqtt_buffer += (' + name + ' + "=" + str(' + value + ')) if not len(mqtt_buffer) else ("&" + ' + name + ' + "=" + str(' + value + '))\n'
  return code;
};

/// MQTT
/// Start MQTT Client

/// Add Data to MQTT Buffer

/// Publish Buffer to MQTT Topic

/// Publish Payload to MQTT Topic

/// Set Callback to MQTT Messages
Blockly.Python['mqtt_set_callback'] = function(block) {
	var data_var_name = Blockly.Python.nameDB_.getName(block.getFieldValue('MQTT_DATA_VAR'), Blockly.VARIABLE_CATEGORY_NAME);
	var topic_var_name = Blockly.Python.nameDB_.getName(block.getFieldValue('MQTT_TOPIC_VAR'), Blockly.VARIABLE_CATEGORY_NAME);
	// Fix for global variables inside callback
	// Piece of code from generators/python/procedures.js
	// Add a 'global' statement for every variable that is not shadowed by a local parameter.
	var globals = [];
	var varName;
	var workspace = block.workspace;
	var variables = Blockly.Variables.allUsedVarModels(workspace) || [];
	for (var i = 0, variable; variable = variables[i]; i++) {
		varName = variable.name;
		if (block.getVars().indexOf(varName) == -1 && varName != data_var_name && varName != topic_var_name) {
		globals.push(Blockly.Python.nameDB_.getName(varName,
			Blockly.VARIABLE_CATEGORY_NAME));
		}
	}
	// Add developer variables.
	var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
	for (var i = 0; i < devVarList.length; i++) {
		globals.push(Blockly.Python.nameDB_.getName(devVarList[i],
			Blockly.Names.DEVELOPER_VARIABLE_TYPE));
	}
	globals = globals.length ? Blockly.Python.INDENT + 'global ' + globals.join(', ') : '';
	// End of code from generators/python/procedures.js

	Blockly.Python.definitions_['import_robust'] = 'import robust';

	var funct_code = Blockly.Python.statementToCode(block, 'do');


	var function_name = Blockly.Python.provideFunction_(
		'mqtt_callback',
		['def ' + Blockly.Python.FUNCTION_NAME_PLACEHOLDER_ + '('+topic_var_name+','+data_var_name+'):',
		globals,
		Blockly.Python.INDENT + topic_var_name + " = " + topic_var_name + ".decode()",
		Blockly.Python.INDENT + data_var_name + " = " + data_var_name + ".decode()",
		funct_code]);

	var code = 'mqtt_client.set_callback(' + function_name + ')\n';
	return code;
};

/// Subscribe to MQTT Topic

/// Check for MQTT Server messages

/// Wait for MQTT Server messages

/// Disconnect MQTT Client

Blockly.Python["machine.ADCWiPy_ADCWiPy.channel"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "machine.ADCWiPy.ADCWiPy.channel(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["machine.ADCWiPy_ADCWiPy.init"] = function(block) {
		Blockly.Python.definitions_['import_machine.ADCWiPy'] = 'import machine.ADCWiPy';
	var code = "machine.ADCWiPy.ADCWiPy.init()\n"; 
	return code;
};
Blockly.Python["machine.ADCWiPy_ADCWiPy.deinit"] = function(block) {
		Blockly.Python.definitions_['import_machine.ADCWiPy'] = 'import machine.ADCWiPy';
	var code = "machine.ADCWiPy.ADCWiPy.deinit()\n"; 
	return code;
};
Blockly.Python["machine.ADCWiPy_adcchannel"] = function(block) {
		Blockly.Python.definitions_['import_machine.ADCWiPy'] = 'import machine.ADCWiPy';
	var code = "machine.ADCWiPy.adcchannel()\n"; 
	return code;
};
Blockly.Python["machine.ADCWiPy_adcchannel.value"] = function(block) {
		Blockly.Python.definitions_['import_machine.ADCWiPy'] = 'import machine.ADCWiPy';
	var code = "machine.ADCWiPy.adcchannel.value()\n"; 
	return [code, Blockly.JavaScript.ORDER_NONE]; 
};
Blockly.Python["machine.ADCWiPy_adcchannel.init"] = function(block) {
		Blockly.Python.definitions_['import_machine.ADCWiPy'] = 'import machine.ADCWiPy';
	var code = "machine.ADCWiPy.adcchannel.init()\n"; 
	return code;
};
Blockly.Python["machine.ADCWiPy_adcchannel.deinit"] = function(block) {
		Blockly.Python.definitions_['import_machine.ADCWiPy'] = 'import machine.ADCWiPy';
	var code = "machine.ADCWiPy.adcchannel.deinit()\n"; 
	return code;
};
Blockly.Python["machine.TimerWiPy_TimerWiPy.init"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "machine.TimerWiPy.TimerWiPy.init(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["machine.TimerWiPy_TimerWiPy.deinit"] = function(block) {
		Blockly.Python.definitions_['import_machine.TimerWiPy'] = 'import machine.TimerWiPy';
	var code = "machine.TimerWiPy.TimerWiPy.deinit()\n"; 
	return code;
};
Blockly.Python["machine.TimerWiPy_TimerWiPy.channel"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "machine.TimerWiPy.TimerWiPy.channel(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["machine.TimerWiPy_timerchannel.irq"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "machine.TimerWiPy.timerchannel.irq(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["machine.TimerWiPy_timerchannel.freq"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "machine.TimerWiPy.timerchannel.freq(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["machine.TimerWiPy_timerchannel.period"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "machine.TimerWiPy.timerchannel.period(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["machine.TimerWiPy_timerchannel.duty_cycle"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "machine.TimerWiPy.timerchannel.duty_cycle(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_create_task"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.create_task(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_run"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.run(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_sleep"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.sleep(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_sleep_ms"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.sleep_ms(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_wait_for"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.wait_for(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_gather"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.gather(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_Task.cancel"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Task.cancel()\n"; 
	return code;
};
Blockly.Python["uasyncio_Event.is_set"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Event.is_set()\n"; 
	return code;
};
Blockly.Python["uasyncio_Event.set"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Event.set()\n"; 
	return code;
};
Blockly.Python["uasyncio_Event.clear"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Event.clear()\n"; 
	return code;
};
Blockly.Python["uasyncio_Event.wait"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Event.wait()\n"; 
	return code;
};
Blockly.Python["uasyncio_Lock.locked"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Lock.locked()\n"; 
	return code;
};
Blockly.Python["uasyncio_Lock.acquire"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Lock.acquire()\n"; 
	return code;
};
Blockly.Python["uasyncio_Lock.release"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Lock.release()\n"; 
	return code;
};
Blockly.Python["uasyncio_open_connection"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.open_connection(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_start_server"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.start_server(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_Stream.get_extra_info"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.Stream.get_extra_info(" + value_pIn + ")\n"; 
	return [code, Blockly.JavaScript.ORDER_NONE]; 
};
Blockly.Python["uasyncio_Stream.close"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Stream.close()\n"; 
	return code;
};
Blockly.Python["uasyncio_Stream.wait_closed"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Stream.wait_closed()\n"; 
	return code;
};
Blockly.Python["uasyncio_Stream.read"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.Stream.read(" + value_pIn + ")\n"; 
	return [code, Blockly.JavaScript.ORDER_NONE]; 
};
Blockly.Python["uasyncio_Stream.readline"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Stream.readline()\n"; 
	return [code, Blockly.JavaScript.ORDER_NONE]; 
};
Blockly.Python["uasyncio_Stream.write"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.Stream.write(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_Stream.drain"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Stream.drain()\n"; 
	return code;
};
Blockly.Python["uasyncio_Server.close"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Server.close()\n"; 
	return code;
};
Blockly.Python["uasyncio_Server.wait_closed"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Server.wait_closed()\n"; 
	return code;
};
Blockly.Python["uasyncio_get_event_loop"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.get_event_loop()\n"; 
	return [code, Blockly.JavaScript.ORDER_NONE]; 
};
Blockly.Python["uasyncio_new_event_loop"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.new_event_loop()\n"; 
	return code;
};
Blockly.Python["uasyncio_Loop.create_task"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.Loop.create_task(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_Loop.run_forever"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Loop.run_forever()\n"; 
	return code;
};
Blockly.Python["uasyncio_Loop.run_until_complete"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.Loop.run_until_complete(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_Loop.stop"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Loop.stop()\n"; 
	return code;
};
Blockly.Python["uasyncio_Loop.close"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Loop.close()\n"; 
	return code;
};
Blockly.Python["uasyncio_Loop.set_exception_handler"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.Loop.set_exception_handler(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_Loop.get_exception_handler"] = function(block) {
		Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';
	var code = "uasyncio.Loop.get_exception_handler()\n"; 
	return [code, Blockly.JavaScript.ORDER_NONE]; 
};
Blockly.Python["uasyncio_Loop.default_exception_handler"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.Loop.default_exception_handler(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uasyncio_Loop.call_exception_handler"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uasyncio.Loop.call_exception_handler(" + value_pIn + ")\n"; 
	return code;
};


Blockly.Python["uos_readblocks"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uos.readblocks(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uos_writeblocks"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uos.writeblocks(" + value_pIn + ")\n"; 
	return code;
};
Blockly.Python["uos_ioctl"] = function(block) {
		var value_pIn = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_ATOMIC);
	var code = "uos.ioctl(" + value_pIn + ")\n"; 
	return code;
};

//Rafael - From OpenCV
//https://github.com/rafaelaroca/blockly-cv2

Blockly.Blocks['none'] = {
  init: function() {
    this.setColour(65);
    this.appendDummyInput()
        .appendField("None")
    this.setOutput(true);
    this.setTooltip('');
  }
};
Blockly.Python['none'] = function(block) {
  var code = "None";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['tostr'] = {
  init: function() {
    this.setColour(65);
    this.appendValueInput("input")
        .appendField("to String")
    this.setOutput(true, "String");
    this.setTooltip('');
  }
};
Blockly.Python['tostr'] = function(block) {
  var input = Blockly.Python.valueToCode(block, 'input', Blockly.Python.ORDER_ATOMIC);
  var code = "str(" + input + ")";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['copy'] = {
  init: function() {
    this.setColour(45);
    this.appendValueInput("image")
        .setCheck("image")
        .appendField("copy");
    this.setOutput(true, "image")
    this.setInputsInline(true)
    this.setTooltip('')
  }
};
Blockly.Python['copy'] = function(block) {
  var image = Blockly.Python.valueToCode(block, 'image', Blockly.Python.ORDER_ATOMIC);
  var code = image + ".copy()";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['convertTo'] = {
  init: function() {
    this.setColour(45);
    this.appendValueInput("input")
        .setCheck("image")
        .appendField("convertTo")
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["float","np.float32"],
          ["uchar","np.uint8"],
          ["int", "np.int32"],]), "flag")
    this.setOutput(true, "image")
    this.setInputsInline(true)
    this.setTooltip('')
  }
};
Blockly.Python['convertTo'] = function(block) {
  var input = Blockly.Python.valueToCode(block, 'input', Blockly.Python.ORDER_ATOMIC);
  var flag = block.getFieldValue('flag');
  var code = "np.asarray(" + input + ", dtype="+flag+")";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['roi'] = {
  init: function() {
    this.setColour(45);
    this.appendValueInput("input")
        .setCheck("image");
    this.appendDummyInput()
        .appendField("roi")
        .appendField("y")
        .appendField(new Blockly.FieldTextInput(""), "y0")
        .appendField(":")
        .appendField(new Blockly.FieldTextInput(""), "y1")
        .appendField("x")
        .appendField(new Blockly.FieldTextInput(""), "x0")
        .appendField(":")
        .appendField(new Blockly.FieldTextInput(""), "x1");
    this.setInputsInline(true);
    this.setOutput(true);
    this.setTooltip('');
  }
};
Blockly.Python['roi'] = function(block) {
  var input = Blockly.Python.valueToCode(block, 'input', Blockly.Python.ORDER_ATOMIC);
  var y0 = block.getFieldValue('y0');
  var y1 = block.getFieldValue('y1');
  var x0 = block.getFieldValue('x0');
  var x1 = block.getFieldValue('x1');
  var code = input + "[int(" + y0 + "):int(" + y1 + "),int(" + x0 + "):int(" + x1 + ")]";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['indexed'] = {
  init: function() {
    this.setColour(45);
    this.appendDummyInput()
        .appendField("indexed")
    this.appendValueInput("input")
        .setCheck("image");
    this.appendValueInput("index")
        .appendField("index");
    this.setInputsInline(true);
    this.setOutput(true);
    this.setTooltip('');
  }
};
Blockly.Python['indexed'] = function(block) {
  var index = Blockly.Python.valueToCode(block, 'index', Blockly.Python.ORDER_ATOMIC);
  var input = Blockly.Python.valueToCode(block, 'input', Blockly.Python.ORDER_ATOMIC);
  var code = input + "[" + index + "]";
  return [code, Blockly.Python.ORDER_NONE];
};
Blockly.Blocks['lists_append'] = {
  init: function() {
    this.setColour(45);
    this.appendDummyInput()
        .appendField("append")
    this.appendValueInput("list")
    this.appendValueInput("item")
        .appendField("item")
    this.setInputsInline(true);
    this.setTooltip('append items to a list');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};
Blockly.Python['lists_append'] = function(block) {
  var list = Blockly.Python.valueToCode(block, 'list', Blockly.Python.ORDER_ATOMIC);
  var item = Blockly.Python.valueToCode(block, 'item', Blockly.Python.ORDER_ATOMIC);
  var code = list + ".append(" + item + ")\n";
  return code;
};

Blockly.Blocks['imgsize'] = {
  init: function() {
    this.setColour(45);
    this.appendDummyInput()
        .appendField("imgsize")
    this.appendValueInput("image")
    this.setInputsInline(true);
    this.setOutput(true);
    this.setTooltip('');
  }
};
Blockly.Python['imgsize'] = function(block) {
  var image = Blockly.Python.valueToCode(block, 'image', Blockly.Python.ORDER_ATOMIC);
  var code = "np.shape(" + image + ")[:2]";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['load'] = {
  init: function() {
    this.setColour(45);
    this.appendDummyInput()
        .appendField("load")
        .appendField(new Blockly.FieldVariable('image'), 'image')
        .appendField(new Blockly.FieldTextInput("media/lena.jpg"), "filename")
        .appendField("gray")
        .appendField(new Blockly.FieldCheckbox("FALSE"), "grey");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  },
  getVars: function(){return [this.getFieldValue('image')]},
  renameVar: function(oldName,newName) {if (Blockly.Names.equals(oldName,this.getFieldValue('image'))){this.setFieldValue(newName,'image');}},
};
Blockly.Python['load'] = function(block) {
  var img = block.getFieldValue('image');
  var filename = block.getFieldValue('filename');
  var grey = block.getFieldValue('grey') == 'TRUE';
  var flag = grey ? 0 : 1;
  var code = img + " = cv2.imread('" + filename + "'," + flag + ")\n";
  return code;
};

Blockly.Blocks['imshow'] = {
  init: function() {
    this.setColour(45);
    this.appendDummyInput()
        .appendField("imshow")
        //.appendField(new Blockly.FieldVariable('mywin'), 'windowname')
        .appendField(new Blockly.FieldTextInput("mywin"), "windowname");
    this.appendValueInput("image")
        .setCheck("image");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};
Blockly.Python['imshow'] = function(block) {
  var image = Blockly.Python.valueToCode(block, 'image', Blockly.Python.ORDER_ATOMIC);
  var windowname = block.getFieldValue('windowname');
  var code = "cv2.imshow('" + windowname + "',"+ image +")\r\n";
  return code;
};

Blockly.Blocks['waitkey'] = {
  init: function() {
    this.setColour(45);
    this.setInputsInline(true);
    this.appendDummyInput()
        .appendField("waitKey");
    this.appendDummyInput()
        .appendField("millis")
        .appendField(new Blockly.FieldTextInput("0"), "millis");
    this.appendDummyInput()
        .appendField("key")
        .appendField(new Blockly.FieldTextInput("27"), "key");
    this.appendStatementInput("statement");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};
Blockly.Python['waitkey'] = function(block) {
  var m = block.getFieldValue('millis');
  var k = block.getFieldValue('key');
  var s = Blockly.Python.statementToCode(block, 'statement') || '  pass\n';
  var code = "if cv2.waitKey("+m+")&0xff == "+k+":\n"+s;
  //return [code, Blockly.Python.ORDER_NONE];
  return code;
};

Blockly.Blocks['onmouse'] = {
  init: function() {
    this.setColour(45);
    this.setInputsInline(true);
    this.appendDummyInput()
        .appendField("onmouse")
        .appendField(new Blockly.FieldVariable('mywin'), 'windowname')
        .appendField(new Blockly.FieldVariable('button'), 'button')
        .appendField(new Blockly.FieldVariable('x'), 'x')
        .appendField(new Blockly.FieldVariable('y'), 'y')
        .appendField(new Blockly.FieldVariable('state'), 'state');
    this.appendStatementInput("statement");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  },
  getVars: function() {
    return [
      this.getFieldValue('windowname'),
      this.getFieldValue('button'),
      this.getFieldValue('x'),
      this.getFieldValue('y'),
      this.getFieldValue('state')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('windowname'))) { this.setFieldValue(newName, 'windowname'); }
    if (Blockly.Names.equals(oldName, this.getFieldValue('button'))) { this.setFieldValue(newName, 'button'); }
    if (Blockly.Names.equals(oldName, this.getFieldValue('x'))) { this.setFieldValue(newName, 'x'); }
    if (Blockly.Names.equals(oldName, this.getFieldValue('y'))) { this.setFieldValue(newName, 'y'); }
    if (Blockly.Names.equals(oldName, this.getFieldValue('state'))) { this.setFieldValue(newName, 'state'); }
  },
};
Blockly.Python['onmouse'] = function(block) {
  var w = block.getFieldValue('windowname');
  var k = block.getFieldValue('key');
  var s = Blockly.Python.statementToCode(block, 'statement') || '  pass\n';
  var code = "def onmouse(button, x, y, state, param):\n" +s + "\n" + "cv2.setMouseCallback('"+w+"', onmouse)\n";
  return code;
};

Blockly.Blocks['cascade'] = {
  init: function() {
    this.setColour(290);
    this.appendDummyInput()
        .appendField("create")
        .appendField(new Blockly.FieldVariable('cascade'), 'cascade')
        .appendField(new Blockly.FieldTextInput("opencv/data/haarcascades/haarcascade_frontalface_alt2.xml"), "xmlfile");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  },
  getVars: function() {
    return [this.getFieldValue('cascade')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('cascade'))) {
      this.setFieldValue(newName, 'cascade');
    }
  },
};
Blockly.Python['cascade'] = function(block) {
  var text_input = block.getFieldValue('xmlfile');
  var cascade = block.getFieldValue('cascade');
  var code = cascade + " = cv2.CascadeClassifier('"+text_input+"')\n" +
             "if "+cascade+".empty(): raise Exception(\"your cascade is empty. are you sure, the path is correct ?\")\n"
  return code;
};

Blockly.Blocks['findobjects'] = {
  init: function() {
    this.setColour(290);
    this.appendDummyInput()
        .appendField("detect")
        .appendField(new Blockly.FieldVariable('cascade'), 'cascade');
    this.appendValueInput("image")
        .setCheck("image");
    this.setOutput(true);
    this.setTooltip('find objects in an image and return a list of rects.\nto draw them, you will need the tl and br items');
  },
  getVars: function() {
    return [this.getFieldValue('cascade')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('cascade'))) {
      this.setFieldValue(newName, 'cascade');
    }
  },
};
Blockly.Python['findobjects'] = function(block) {
  var image = Blockly.Python.valueToCode(block, 'image', Blockly.Python.ORDER_ATOMIC);
  var cascade = block.getFieldValue('cascade');
  var code = "cascade.detectMultiScale("+image+")"
  return [code, Blockly.Python.ORDER_NONE];
};

/*
Blockly.Blocks['people'] = {
  init: function() {
    this.setColour(260);
    this.appendDummyInput()
        .appendField("create")
        .appendField(new Blockly.FieldVariable('people'), 'people');
    this.setTooltip('create an peopledetector object');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  },
  getVars: function() {
    return [this.getFieldValue('people')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('people'))) {
      this.setFieldValue(newName, 'people');
    }
  },
};
Blockly.Python['people'] = function(block) {
  var people = block.getFieldValue('people');
  var code = people + " = cv2.HOGDescriptor()\n" +
             people + ".setSVMDetector( cv2.HOGDescriptor_getDefaultPeopleDetector() )\n"
  return code;
};

Blockly.Blocks['peopledetect'] = {
  init: function() {
    this.setColour(260);
    this.appendDummyInput()
        .appendField("detect");
    this.appendValueInput("image")
        .setCheck("image")
        .appendField(new Blockly.FieldVariable('people'), 'people');
    this.setOutput(true);
    this.setTooltip('find people in an image, return a list of bounding boxes');
  },
  getVars: function() {
    return [this.getFieldValue('people')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('people'))) {
      this.setFieldValue(newName, 'people');
    }
  },
};
Blockly.Python['peopledetect'] = function(block) {
  var image = Blockly.Python.valueToCode(block, 'image', Blockly.Python.ORDER_ATOMIC);
  var people = block.getFieldValue('people');
  var code = people + ".detect("+image+")[0]"
  return [code, Blockly.Python.ORDER_NONE];
};
*/


Blockly.Blocks['videocapture'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("VideoCapture")
        .appendField(new Blockly.FieldTextInput("0"), "input")
        .appendField(new Blockly.FieldTextInput("img"), "img")
        //.appendField(new Blockly.FieldVariable('img'), 'img');
    this.appendStatementInput("statements")
        .setCheck("image");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  },
  getVars: function() {
    return [this.getFieldValue('img')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('img'))) {
      this.setFieldValue(newName, 'img');
    }
  },
};
Blockly.Python['videocapture'] = function(block) {
	/*
  var text_input = block.getFieldValue('input');
  var statements_name = Blockly.Python.statementToCode(block, 'statements');
  var img_name = block.getFieldValue('img');
  var code = "cap=cv2.VideoCapture("+text_input+")\n" +
             "if not cap.isOpened(): raise Exception(\"your input:"+text_input+" could not be opened !\")\n" +
             "while cap.isOpened():\n  r,"+img_name+"=cap.read()\n  if r==False: break\n"+statements_name;
	     */


  Blockly.Python.definitions_['import_cv2'] = 'import cv2 \nimport numpy as np';

  var text_input = block.getFieldValue('input');
  var statements_name = Blockly.Python.statementToCode(block, 'statements');
  var img_name = block.getFieldValue('img');

  var code = "cap=cv2.VideoCapture("+text_input+")\n" +
             "if not cap.isOpened(): raise Exception(\"your input:"+text_input+" could not be opened !\")\n" +
             "while cap.isOpened():\n  r,"+img_name+"=cap.read()\n  if r==False: break\n"+statements_name;


  return code;
};




Blockly.Blocks['VideoWriter_VideoWriter'] = {
  init: function() {
    this.setColour(22);
    this.appendDummyInput()
        .appendField('VideoWriter')
        .appendField(new Blockly.FieldVariable('writer'), 'writer');
    this.appendDummyInput()
        .appendField('filename')
        .appendField(new Blockly.FieldTextInput('my.asf'), 'filename')
    this.appendDummyInput()
        .appendField('fourcc')
        .appendField(new Blockly.FieldTextInput('XVID'), 'fourcc')
    this.appendDummyInput()
        .appendField('fps')
        .appendField(new Blockly.FieldTextInput('24'), 'fps');
    this.appendValueInput('frameSize')
        .appendField('frameSize')
        .setCheck('size');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip('videoio_VideoWriter_VideoWriter');
  },
  getVars: function() {
    return [this.getFieldValue('writer')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('writer'))) {
      this.setFieldValue(newName, 'writer');
    }
  },
};
Blockly.Blocks['VideoWriter_write'] = {
  init: function() {
    this.setColour(22);
    this.appendDummyInput()
        .appendField('write')
        .appendField(new Blockly.FieldVariable('writer'), 'writer');
    this.appendValueInput('image')
        .appendField('image')
        .setCheck('image');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('videoio_VideoWriter_write');
  },
  getVars: function() {
    return [this.getFieldValue('writer')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('writer'))) {
      this.setFieldValue(newName, 'writer');
    }
  },
};


Blockly.Python['VideoWriter_VideoWriter'] = function(block) {
  var writer = block.getFieldValue('writer');
  var filename = block.getFieldValue('filename')
  var fourcc = block.getFieldValue('fourcc')
  var fps = block.getFieldValue('fps');
  var frameSize = Blockly.Python.valueToCode(block, 'frameSize', Blockly.Python.ORDER_ATOMIC);
  var code = writer + " = cv2.VideoWriter('"+filename+"',"+"cv2.VideoWriter_fourcc(*'"+fourcc+"')"+","+fps+","+frameSize+")\n"
  code += "if not " + writer + ".isOpened(): raise Exception(\"your writer failed to open!\")\n"
  return code;
};
Blockly.Python['VideoWriter_write'] = function(block) {
  var that = block.getFieldValue('writer');
  var image = Blockly.Python.valueToCode(block, 'image', Blockly.Python.ORDER_ATOMIC);
  var code = that + ".write("+image+")\n"
  return code;
};

Blockly.Blocks['cvtcolor'] = {
  init: function() {
    this.setColour(65);
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["BGR2GRAY","cv2.COLOR_BGR2GRAY"],
          ["GRAY2BGR","cv2.COLOR_GRAY2BGR"],
          ["BGR2HSV", "cv2.COLOR_BGR2HSV"],
          ["HSV2BGR", "cv2.COLOR_HSV2BGR"],]), "flag");
    this.appendValueInput("img")
        .setCheck("image")
        .appendField("cvtColor");
    this.setOutput(true, "image");
    this.setTooltip('');
  }
};
Blockly.Python['cvtcolor'] = function(block) {
  var img = Blockly.Python.valueToCode(block, 'img', Blockly.Python.ORDER_ATOMIC);
  var flag = block.getFieldValue('flag');
  var code = "cv2.cvtColor("+img+","+flag+")";
  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Blocks['threshold'] = {
  init: function() {
    this.setColour(65);
    this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput("30"), "thresh_val")
        .appendField(new Blockly.FieldTextInput("255"), "thresh_to")
        .appendField(new Blockly.FieldDropdown([
          ["BINARY","cv2.THRESH_BINARY"],
          ["BINARY_INV", "cv2.THRESH_BINARY_INV"],
          ["OTSU", "cv2.THRESH_OTSU"]]), "flag");
    this.appendValueInput("img")
        .appendField("threshold")
        .setCheck("image");
    this.setOutput(true, "image");
    this.setTooltip('');
  }
};
Blockly.Python['threshold'] = function(block) {
  var img = Blockly.Python.valueToCode(block, 'img', Blockly.Python.ORDER_ATOMIC);
  var flag = block.getFieldValue('flag');
  var thresh_val = block.getFieldValue('thresh_val');
  var thresh_to = block.getFieldValue('thresh_to');
  var code = "cv2.threshold("+img+","+thresh_val+","+thresh_to+","+flag+")[1]";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['newimage'] = {
  init: function() {
    this.setColour(65);
    this.appendDummyInput()
        .appendField("new image")
        .appendField(new Blockly.FieldTextInput("100"), "w")
        .appendField(new Blockly.FieldTextInput("100"), "h")
        .appendField(new Blockly.FieldDropdown([["bgr", "bgr"], ["gray","gray"], ["float", "float"]]), "type")
    this.appendValueInput("color")
        .appendField("color")
        //.setCheck("Colour");
    this.setOutput(true, "image");
    this.setTooltip('make a new, empty image');
  }
};
Blockly.Python['newimage'] = function(block) {
  var w = block.getFieldValue('w');
  var h = block.getFieldValue('h');
  var t = block.getFieldValue('type');
  var c = Blockly.Python.valueToCode(block, 'color', Blockly.Python.ORDER_ATOMIC);
  code = "np.ones(("+h+","+w+"),np.uint8)";
  if (t=="bgr")
    code = "np.ones(("+h+","+w+","+3+"),np.uint8)";
  if (t=="float")
    code = "np.ones(("+h+","+w+"),np.float)";
  if (c)
    code += " * " + c;
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['point'] = {
  init: function() {
    this.setColour(65);
    this.appendDummyInput()
        .appendField("point")
        .appendField(new Blockly.FieldTextInput("0"), "x")
        .appendField(new Blockly.FieldTextInput("0"), "y")
    this.setOutput(true, "point");
    this.setTooltip('');
  }
};
Blockly.Python['point'] = function(block) {
  var x = block.getFieldValue('x');
  var y = block.getFieldValue('y');
  var code = "("+x+","+y+")";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['point_tl'] = {
  init: function() {
    this.setColour(65);
    this.appendValueInput("rect")
        .appendField("tl")
        .setCheck("rect");
    this.setOutput(true, "point");
    this.setTooltip('');
  }
};
Blockly.Python['point_tl'] = function(block) {
  var r = Blockly.Python.valueToCode(block, 'rect', Blockly.Python.ORDER_ATOMIC);
  var code = "("+r+"[0],"+r+"[1])";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['point_br'] = {
  init: function() {
    this.setColour(65);
    this.appendValueInput("rect")
        .appendField("br")
        .setCheck("rect");
    this.setOutput(true, "point");
    this.setTooltip('');
  }
};
Blockly.Python['point_br'] = function(block) {
  var r = Blockly.Python.valueToCode(block, 'rect', Blockly.Python.ORDER_ATOMIC);
  var code = "("+r+"[0]+" + r + "[2],"+r+"[1]+"+r+"[3])";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['size'] = {
  init: function() {
    this.setColour(65);
    this.appendDummyInput()
        .appendField("size")
        .appendField(new Blockly.FieldTextInput("0"), "w")
        .appendField(new Blockly.FieldTextInput("0"), "h")
    this.setOutput(true, "size");
    this.setTooltip('');
  }
};
Blockly.Python['size'] = function(block) {
  var w = block.getFieldValue('w');
  var h = block.getFieldValue('h');
  var code = "("+w+","+h+")";
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks['tuple'] = {
  init: function() {
    this.setColour(65);
    this.appendDummyInput()
        .appendField("tuple")
    this.appendValueInput("X")
    this.setOutput(true);
    this.setTooltip('');
  }
};
Blockly.Python['tuple'] = function(block) {
  var X = Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_ATOMIC);
  var code = "("+X+")";
  return [code, Blockly.Python.ORDER_NONE];
};
//~ Blockly.Blocks['tuple'] = {
  //~ init: function() {
    //~ this.setColour(65);
    //~ this.appendDummyInput()
        //~ .appendField("tuple")
        //~ .appendField(new Blockly.FieldTextInput("0"), "a")
        //~ .appendField(new Blockly.FieldTextInput("0"), "b")
        //~ .appendField(new Blockly.FieldTextInput("0"), "c")
    //~ this.setOutput(true, "Colour");
    //~ this.setTooltip('');
  //~ }
//~ };
//~ Blockly.Python['tuple'] = function(block) {
  //~ var a = block.getFieldValue('a');
  //~ var b = block.getFieldValue('b');
  //~ var c = block.getFieldValue('c');
  //~ var code = "("+a+","+b+","+c+")";
  //~ return [code, Blockly.Python.ORDER_NONE];
//~ };

Blockly.Blocks['forRange'] = {
  init: function() {
    this.setColour(135);
    this.setInputsInline(true);
    this.appendDummyInput()
        .appendField("for");
    this.appendDummyInput()
        .appendField(new Blockly.FieldVariable('i'), 'i')
        .appendField("in range")
    this.appendValueInput("rend")
        .setCheck("Number");
    this.appendStatementInput("statement");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};
Blockly.Python['forRange'] = function(block) {
  var i = block.getFieldValue('i');
  var stop = Blockly.Python.valueToCode(block, 'rend', Blockly.Python.ORDER_ATOMIC);
  var s = Blockly.Python.statementToCode(block, 'statement') || '  pass\n';
  var code = "for "+i+" in range("+stop+"):\n"+s;
  return code;
};

Blockly.Blocks['forEnum'] = {
  init: function() {
    this.setColour(135);
    this.setInputsInline(true);
    this.appendDummyInput()
        .appendField("enumerate");
    this.appendDummyInput()
        .appendField(new Blockly.FieldVariable('index'), 'index')
        .appendField("and")
        .appendField(new Blockly.FieldVariable('i'), 'i')
        .appendField("in")
    this.appendValueInput("list")
    this.appendStatementInput("statement");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  },
  getVars: function() {
    return [this.getFieldValue('index'),this.getFieldValue('i')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('index'))) { this.setFieldValue(newName, 'index'); }
    if (Blockly.Names.equals(oldName, this.getFieldValue('i'))) { this.setFieldValue(newName, 'i'); }
  },
};
Blockly.Python['forEnum'] = function(block) {
  var index = block.getFieldValue('index');
  var i = block.getFieldValue('i');
  var list = Blockly.Python.valueToCode(block, 'list', Blockly.Python.ORDER_ATOMIC);
  var s = Blockly.Python.statementToCode(block, 'statement') || '  pass\n';
  var code = "for "+index+","+i+" in enumerate("+list+"):\n"+s;
  return code;
};


Blockly.Blocks['text_eval'] = {
  init: function() {
    this.setColour(45);
    this.setInputsInline(true);
    this.appendDummyInput()
        .appendField("eval")
        .appendField(new Blockly.FieldTextInput(""), "text");
    //~ this.appendStatementInput("statement");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('direct python eval');
  }
};

Blockly.Python['text_eval'] = function(block) {
  var c = block.getFieldValue('text');
  var code = c + "\n";
  return code;
};

//-------------------------------------
/*LEGACY_BLOCKS_START: Old timings blocks*/



/*LEGACY_BLOCKS_END: Old timings blocks*/

Blockly.Python['utime.deadline'] = function(block) {
  Blockly.Python.definitions_['import_utime'] = 'import utime';

  var value_id = block.getFieldValue('ID');
  var value_time = Blockly.Python.valueToCode(block, 'TIME', Blockly.Python.ORDER_NONE);
  var dropdown_scale = block.getFieldValue('SCALE');
  var statements_do = Blockly.Python.statementToCode(block, 'DO');

  var code = `deadline${value_id} = utime.ticks_add(utime.${dropdown_scale}(), ${value_time})\nwhile utime.ticks_diff(deadline${value_id}, utime.${dropdown_scale}()) > 0:\n${statements_do}\n`;
  return code;
};











Blockly.Python['thread'] = function(block) {

  var interval = block.getFieldValue('interval');
  var timerNumber = block.getFieldValue('timerNumber');
  var statements_name = Blockly.Python.statementToCode(block, 'statements');
  
  Blockly.Python.definitions_['import_thread'] = 'import _thread';

  Blockly.Python.definitions_['import_timer_callback' + timerNumber] = '\n#Thread function \ndef thread' + timerNumber + '():\n' + statements_name + '\n\n'; 

  var code = '_thread.start_new_thread(thread' + timerNumber + ', ())\n';
             
  return code;
};

Blockly.Python['timer'] = function(block) {

  var interval = block.getFieldValue('interval');
  var timerNumber = block.getFieldValue('timerNumber');
  var statements_name = Blockly.Python.statementToCode(block, 'statements');
  var dropdown_mode = block.getFieldValue('MODE');
  
  // Fix for global variables inside callback
  // Piece of code from generators/python/procedures.js
  // Define a procedure with a return value.
  // First, add a 'global' statement for every variable that is not shadowed by
  // a local parameter.
  var globals = [];
  var workspace = block.workspace;
  var variables = Blockly.Variables.allUsedVarModels(workspace) || [];
  for (var i = 0, variable; (variable = variables[i]); i++) {
    var varName = variable.name;
    if (block.getVars().indexOf(varName) == -1) {
      globals.push(Blockly.Python.nameDB_.getName(varName,
          Blockly.VARIABLE_CATEGORY_NAME));
    }
  }
  globals = globals.length ? Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';

  Blockly.Python.definitions_['import_timer'] = 'from machine import Timer';

  Blockly.Python.definitions_[`import_timer_start${timerNumber}`] = `try:\n\ttim${timerNumber} = Timer(${timerNumber})\nexcept:\n\ttim${timerNumber} = Timer()\n`;
  Blockly.Python.definitions_[`import_timer_callback${timerNumber}`] = `\n#Timer Function Callback\ndef timerFunc${timerNumber}(t):\n${globals}${statements_name}\n\n`;

  var code = `tim${timerNumber}.init(period=${interval}, mode=Timer.${dropdown_mode}, callback=timerFunc${timerNumber})\n`;
             
  return code
};



Blockly.Python['deep_sleep'] = function(block) {
	var value_interval = Blockly.Python.valueToCode(block, 'interval', Blockly.Python.ORDER_ATOMIC);
	Blockly.Python.definitions_['import_machine'] = 'import machine';
	var code = 'machine.deepsleep(' + value_interval + ')\n';
	return code;
  };








//Sckit-Learn Test
//Author: Andouglas Junior


  
    






Blockly.Python['file_close_old'] = function(block) {
  var pIn = Blockly.Python.valueToCode(block, 'filename', Blockly.Python.ORDER_ATOMIC);
  var code = 'f.close()\n';
  return code;
};



Blockly.Python['file_read_old'] = function(block) {
  var code = 'f.read()';
  return [code, Blockly.Python.ORDER_NONE];
};





Blockly.Python['file_write_old'] = function(block) {
  var pIn = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_ATOMIC);
  var code = 'f.write(' + pIn + ')\n';
  code += "f.write('\\n')\n";
  return code;
};



//HCSR04 ultrasound

//I2C Character LCD

Blockly.Python['char_lcd_custom'] = function (block) {
  var id = Blockly.Python.valueToCode(block, 'id', Blockly.Python.ORDER_ATOMIC);
  var checkbox_a0 = block.getFieldValue('A0') == 'TRUE';
  var checkbox_a1 = block.getFieldValue('A1') == 'TRUE';
  var checkbox_a2 = block.getFieldValue('A2') == 'TRUE';
  var checkbox_a3 = block.getFieldValue('A3') == 'TRUE';
  var checkbox_a4 = block.getFieldValue('A4') == 'TRUE';
  var checkbox_b0 = block.getFieldValue('B0') == 'TRUE';
  var checkbox_b1 = block.getFieldValue('B1') == 'TRUE';
  var checkbox_b2 = block.getFieldValue('B2') == 'TRUE';
  var checkbox_b3 = block.getFieldValue('B3') == 'TRUE';
  var checkbox_b4 = block.getFieldValue('B4') == 'TRUE';
  var checkbox_c0 = block.getFieldValue('C0') == 'TRUE';
  var checkbox_c1 = block.getFieldValue('C1') == 'TRUE';
  var checkbox_c2 = block.getFieldValue('C2') == 'TRUE';
  var checkbox_c3 = block.getFieldValue('C3') == 'TRUE';
  var checkbox_c4 = block.getFieldValue('C4') == 'TRUE';
  var checkbox_d0 = block.getFieldValue('D0') == 'TRUE';
  var checkbox_d1 = block.getFieldValue('D1') == 'TRUE';
  var checkbox_d2 = block.getFieldValue('D2') == 'TRUE';
  var checkbox_d3 = block.getFieldValue('D3') == 'TRUE';
  var checkbox_d4 = block.getFieldValue('D4') == 'TRUE';
  var checkbox_e0 = block.getFieldValue('E0') == 'TRUE';
  var checkbox_e1 = block.getFieldValue('E1') == 'TRUE';
  var checkbox_e2 = block.getFieldValue('E2') == 'TRUE';
  var checkbox_e3 = block.getFieldValue('E3') == 'TRUE';
  var checkbox_e4 = block.getFieldValue('E4') == 'TRUE';
  var checkbox_f0 = block.getFieldValue('F0') == 'TRUE';
  var checkbox_f1 = block.getFieldValue('F1') == 'TRUE';
  var checkbox_f2 = block.getFieldValue('F2') == 'TRUE';
  var checkbox_f3 = block.getFieldValue('F3') == 'TRUE';
  var checkbox_f4 = block.getFieldValue('F4') == 'TRUE';
  var checkbox_g0 = block.getFieldValue('G0') == 'TRUE';
  var checkbox_g1 = block.getFieldValue('G1') == 'TRUE';
  var checkbox_g2 = block.getFieldValue('G2') == 'TRUE';
  var checkbox_g3 = block.getFieldValue('G3') == 'TRUE';
  var checkbox_g4 = block.getFieldValue('G4') == 'TRUE';
  var checkbox_h0 = block.getFieldValue('H0') == 'TRUE';
  var checkbox_h1 = block.getFieldValue('H1') == 'TRUE';
  var checkbox_h2 = block.getFieldValue('H2') == 'TRUE';
  var checkbox_h3 = block.getFieldValue('H3') == 'TRUE';
  var checkbox_h4 = block.getFieldValue('H4') == 'TRUE';

  var line1 = Number(checkbox_a0) * 2**4 + Number(checkbox_a1) * 2**3 + Number(checkbox_a2) * 2**2 + Number(checkbox_a3) * 2**1 + Number(checkbox_a4) * 2**0;
  var line2 = Number(checkbox_b0) * 2**4 + Number(checkbox_b1) * 2**3 + Number(checkbox_b2) * 2**2 + Number(checkbox_b3) * 2**1 + Number(checkbox_b4) * 2**0;
  var line3 = Number(checkbox_c0) * 2**4 + Number(checkbox_c1) * 2**3 + Number(checkbox_c2) * 2**2 + Number(checkbox_c3) * 2**1 + Number(checkbox_c4) * 2**0;
  var line4 = Number(checkbox_d0) * 2**4 + Number(checkbox_d1) * 2**3 + Number(checkbox_d2) * 2**2 + Number(checkbox_d3) * 2**1 + Number(checkbox_d4) * 2**0
  var line5 = Number(checkbox_e0) * 2**4 + Number(checkbox_e1) * 2**3 + Number(checkbox_e2) * 2**2 + Number(checkbox_e3) * 2**1 + Number(checkbox_e4) * 2**0;
  var line6 = Number(checkbox_f0) * 2**4 + Number(checkbox_f1) * 2**3 + Number(checkbox_f2) * 2**2 + Number(checkbox_f3) * 2**1 + Number(checkbox_f4) * 2**0;
  var line7 = Number(checkbox_g0) * 2**4 + Number(checkbox_g1) * 2**3 + Number(checkbox_g2) * 2**2 + Number(checkbox_g3) * 2**1 + Number(checkbox_g4) * 2**0;
  var line8 = Number(checkbox_h0) * 2**4 + Number(checkbox_h1) * 2**3 + Number(checkbox_h2) * 2**2 + Number(checkbox_h3) * 2**1 + Number(checkbox_h4) * 2**0;

	var code = 'data'+ id +' = bytearray([' + line1 + ', ' + line2 + ', ' + line3 + ', ' + line4 +', ' + line5 + ', ' + line6 + ', ' + line7 + ', ' + line8 + '])\n'
	code += 'lcd.custom_char(' + id + ', data' + id +')\n'
	code += 'lcd.putchar(chr(' + id +'))\n'
  return code;
};



//MFRC522 RFID module






  
  
Blockly.Python['rfid_rc522_read_card'] = function(block) {
  var code = 'rdr=mfrc522.MFRC522(0,2,4,5,14)\n';
  return code;
};


Blockly.Python['rfid_rc522_write_card'] = function(block) {
  var code = 'rdr=mfrc522.MFRC522(0,2,4,5,14)\n';
  return code;
};


//New Network related functions











/*
 *
 *
 *
 * HTTP Web Server Example From MicroPython
import machine
pins = [machine.Pin(i, machine.Pin.IN) for i in (0, 2, 4, 5, 12, 13, 14, 15)]

html = """<!DOCTYPE html>
<html>
    <head> <title>ESP8266 Pins</title> </head>
    <body> <h1>ESP8266 Pins</h1>
        <table border="1"> <tr><th>Pin</th><th>Value</th></tr> %s </table>
    </body>
</html>
"""

import socket
addr = socket.getaddrinfo('0.0.0.0', 80)[0][-1]

s = socket.socket()
s.bind(addr)
s.listen(1)

print('listening on', addr)

while True:
    cl, addr = s.accept()
    print('client connected from', addr)
    cl_file = cl.makefile('rwb', 0)
    while True:
        line = cl_file.readline()
        if not line or line == b'\r\n':
            break
    rows = ['<tr><td>%s</td><td>%d</td></tr>' % (str(p), p.value()) for p in pins]
    response = html % '\n'.join(rows)
    cl.send('HTTP/1.0 200 OK\r\nContent-type: text/html\r\n\r\n')
    cl.send(response)
    cl.close()
*/












//SIM900L GSM MODEM








//UART
//MAX30100 oximeter
//GY33 I2C Module
  


//GY33 UART Module
Blockly.Python['gy33_uart_uart_baud_rate'] = function(block) {
	var baudrate = block.getFieldValue('BAUDRATE');

	var code = 'gy33_uart.set_baudrate(' + baudrate + ')\n';
	return code;
};
//GPS Module
//Optical Encoder
//Stepper Motor
//DC Motor with H-Bridge
//ESP32 specific functions

//CAN BUS
//https://github.com/nos86/micropython/blob/esp32-can-driver-v3/docs/library/machine.CAN.rst







  







Blockly.Python['neopixel_color_numbers'] = function(block) {
  var value_red = Blockly.Python.valueToCode(block, 'red', Blockly.Python.ORDER_ATOMIC);
  var value_green = Blockly.Python.valueToCode(block, 'green', Blockly.Python.ORDER_ATOMIC);
  var value_blue = Blockly.Python.valueToCode(block, 'blue', Blockly.Python.ORDER_ATOMIC);

  // Style block with compiled values, see block_definitions.js
  this.styleBlock([value_red, value_green, value_blue])

  var code = `(${value_red},${value_green},${value_blue})`;

  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['neopixel_color_colors'] = function(block) {
  var color = block.getFieldValue('color');
  var h = Tool.HEX2RGB(color);
  var code = `(${h.r},${h.g},${h.b})`;
  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['HSL_to_RGB'] = function(block) {
  var value_hue = Blockly.Python.valueToCode(block, 'hue', Blockly.Python.ORDER_ATOMIC);
  var value_saturation = Blockly.Python.valueToCode(block, 'saturation', Blockly.Python.ORDER_ATOMIC);
  var value_brightness = Blockly.Python.valueToCode(block, 'lightness', Blockly.Python.ORDER_ATOMIC);

  Blockly.Python.definitions_['HSL_to_RGB'] = 'def HSL_to_RGB(h, s, l):\n	h, s, l = h/360, s/100, l/100\n	def hue2rgb (p, q, t):\n		if(t < 0.): t += 1\n		if(t > 1.): t -= 1\n		if(t < 1/6): return p + (q - p) * 6 * t\n		if(t < 1/2): return q\n		if(t < 2/3): return p + (q - p) * (2/3 - t) * 6\n		return p\n	q = l * (1 + s) if l < 0.5 else l + s - l * s\n	p = 2 * l - q\n	r, g, b = hue2rgb(p, q, h + 1/3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1/3)\n	return (int(r * 255), int(g * 255), int(b * 255))\n';

  this.styleBlock([value_hue, value_saturation, value_brightness])

  var code = `HSL_to_RGB(${value_hue},${value_saturation},${value_brightness})`;

  return [code, Blockly.Python.ORDER_NONE];
};



Blockly.Python['localstorage_store'] = function(block) {
  var topic = block.getFieldValue('topic');
  var elements = new Array(block.itemCount_);
  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] = Blockly.Python.valueToCode(block, 'ADD' + i,
        Blockly.Python.ORDER_NONE) || 'None';
  }
  var code = `print('$${topic}:',${elements.join(",',',")})\n`;
  return code;
};

//REPL over Web Bluetooth
  


Blockly.Python['bluetooth_pico_w_receive'] = function(block) {
	var t = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_ATOMIC);
	var statements_code = Blockly.Python.statementToCode(block, 'code');
	// Fix for global variables inside callback
	// Piece of code from generators/python/procedures.js
	// Define a procedure with a return value.
	// First, add a 'global' statement for every variable that is not shadowed by
	// a local parameter.
	var globals = [];
	var workspace = block.workspace;
	var variables = Blockly.Variables.allUsedVarModels(workspace) || [];
	for (var i = 0, variable; (variable = variables[i]); i++) {
		var varName = variable.name;
		if (block.getVars().indexOf(varName) == -1) {
			if (varName != t) {
				globals.push(Blockly.Python.nameDB_.getName(varName, Blockly.VARIABLE_CATEGORY_NAME));
			}
		};
	}
	globals = globals.length ? Blockly.Python.INDENT + 'global ' + globals.join(', ') + '\n' : '';

	Blockly.Python.definitions_[`bluetooth_rcv_interrupt`] = `\n#Interrupt handler\ndef on_rx(${t}):\n${globals}\n  ${t} = ${t}.decode()\n${statements_code}\n\n`;

	var code = 'def on_rx(' + t + '):\n'

	code+= '	print("Data received: ", ' + t + '.decode())\n'

	var code = 'sp.on_write(on_rx)\n';
	return code;
};


//Russ Hughes ST7789 display
  

  

//ST7789 display
Blockly.Python['st7789_color_numbers'] = function(block) {
  var value_red = Blockly.Python.valueToCode(block, 'red', Blockly.Python.ORDER_ATOMIC);
  var value_green = Blockly.Python.valueToCode(block, 'green', Blockly.Python.ORDER_ATOMIC);
  var value_blue = Blockly.Python.valueToCode(block, 'blue', Blockly.Python.ORDER_ATOMIC);

  // Style block with compiled values, see block_definitions.js
  this.styleBlock([value_red, value_green, value_blue])

  var code = `(${value_red},${value_green},${value_blue})`;

  return [code, Blockly.Python.ORDER_NONE];
};


Blockly.Python['st7789_color_colors'] = function(block) {
  var color = block.getFieldValue('color');
  var h = Tool.HEX2RGB(color);
  var code = `(${h.r},${h.g},${h.b})`;
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['control_pid.__init__'] = function(block) {
  var number_id = block.getFieldValue('ID');
  var number_kp = block.getFieldValue('Kp');
  var number_ki = block.getFieldValue('Ki');
  var number_kd = block.getFieldValue('Kd');
  var number_sample_time = block.getFieldValue('SAMPLETIME');
  number_sample_time = parseInt(number_sample_time) == 0 ? 'None': number_sample_time;
  var dropdown_scale = block.getFieldValue('SCALE');
  var value_setpoint = Blockly.Python.valueToCode(block, 'SETPOINT', Blockly.Python.ORDER_NONE);

  this.check([number_kp,number_ki,number_kd], number_sample_time);

  Blockly.Python.definitions_['import_pid'] = 'from control import PID';

  let code = `pid${number_id} = PID(${number_kp}, ${number_ki}, ${number_kd}, setpoint=${value_setpoint}, scale='${dropdown_scale}'`;
  code = number_sample_time != 0 ? `${code}, sample_time=${number_sample_time})\n` : `${code})\n`;
  return code;
};










// Pololu 3pi+ 2040




Blockly.Python['threepi_rgb_leds_set_brightness'] = function(block) {
	var value_brightness = Blockly.Python.valueToCode(block, 'brightness', Blockly.Python.ORDER_ATOMIC);

	Blockly.Python.definitions_['import_3pirobot'] = 'from pololu_3pi_2040_robot import robot as threepi_robot';
	Blockly.Python.definitions_['make_3pirgb_leds'] = 'threepi_rgb_leds = threepi_robot.RGBLEDs()';
	var code = 'threepi_rgb_leds.set_brightness(' + value_brightness + ')\n';
	return code
};

Blockly.Python['threepi_rgb_leds_show'] = function(block) {
	Blockly.Python.definitions_['import_3pirobot'] = 'from pololu_3pi_2040_robot import robot as threepi_robot';
	Blockly.Python.definitions_['make_3pirgb_leds'] = 'threepi_rgb_leds = threepi_robot.RGBLEDs()';
	var code = 'threepi_rgb_leds.show()\n';
	return code
};

Blockly.Python['threepi_rgb_leds_off'] = function(block) {
	Blockly.Python.definitions_['import_3pirobot'] = 'from pololu_3pi_2040_robot import robot as threepi_robot';
	Blockly.Python.definitions_['make_3pirgb_leds'] = 'threepi_rgb_leds = threepi_robot.RGBLEDs()';
	var code = 'threepi_rgb_leds.off()\n';
	return code
};

Blockly.Python['threepi_rgb_leds_set'] = function(block) {
	var value_address = Blockly.Python.valueToCode(block, 'address', Blockly.Python.ORDER_ATOMIC);
	var value_color = Blockly.Python.valueToCode(block, 'color', Blockly.Python.ORDER_ATOMIC);

	Blockly.Python.definitions_['import_3pirobot'] = 'from pololu_3pi_2040_robot import robot as threepi_robot';
	Blockly.Python.definitions_['make_3pirgb_leds'] = 'threepi_rgb_leds = threepi_robot.RGBLEDs()';
	var code = 'threepi_rgb_leds.set(' + value_address + ',' + value_color + ')\n';
	return code
};

















//Other st7789 functions
/*
def set_window(self, x0, y0, x1, y1):
def vline(self, x, y, length, color):
def hline(self, x, y, length, color):
def pixel(self, x, y, color):
def blit_buffer(self, buffer, x, y, width, height):
def rect(self, x, y, w, h, color):
def fill_rect(self, x, y, width, height, color):
def fill(self, color):
def line(self, x0, y0, x1, y1, color):
*/

//Fri Aug  6 23:26:20 -03 2021
//Snek (https://sneklang.org/doc/snek.html)









Blockly.Python['google_spreadsheet'] = function(block) {
  Blockly.Python.definitions_['import_prequests'] = 'import prequests';
  Blockly.Python.definitions_['import_ujson'] = 'import ujson';

  var number_sheet_num = block.getFieldValue('sheet_num');
  var value_deploy_code = Blockly.Python.valueToCode(block, 'deploy_code', Blockly.Python.ORDER_ATOMIC);
  var cells_blocks = block.getInputTargetBlock('cells_values');

  // TODO: Assemble Python into code variable.
  Blockly.Python.definitions_['post_data'] = 'def post_data(row_data, deployment_code):\n  request_data = ujson.dumps({"parameters": row_data})\n  r = prequests.post("https://script.google.com/macros/s/" + deployment_code + "/exec", headers = {"content-type": "application/json"}, data = request_data)\n  r.close()';
  Blockly.Python.definitions_['deployment_code' + number_sheet_num] = 'deployment_code' + number_sheet_num + '= ' + value_deploy_code;
  Blockly.Python.definitions_['row_data_' + number_sheet_num] = 'row_data' + number_sheet_num +' = {}';

  if(cells_blocks)
  var num_cell = 0;
  var row_data_def = '';
    do{
      var cell_value = Blockly.Python.blockToCode(cells_blocks, 'Cell');
      row_data_def += ' row_data' + number_sheet_num +'["var' + num_cell+ '"] = ' + cell_value+'\n';
      num_cell ++;
    }while (cells_blocks = cells_blocks.getNextBlock());

    Blockly.Python.definitions_['row_data_cell'+ number_sheet_num] = 'def update_row_data'+ number_sheet_num+'():\n' + row_data_def;
  
  var code = 'update_row_data'+ number_sheet_num+'()\npost_data(row_data' + number_sheet_num+',deployment_code' + number_sheet_num+')\n';
  return code;
};

Blockly.Python['cell_value'] = function(block) {
  var value_value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC);
  // TODO: Assemble Python into code variable.
  var code = value_value;
  return code;
};
// Gerando os códigos dos Blocos do Pluviômetro
// Iniciar Pluviômetro
// Parar Pluviômetro
//Gerando os códigos dos Blocos do Anemômetro
// Iniciar Anemômetro
// Parar Anemômetro
// Gerando código dos blocos de interrupção
// Iniciar Interrupção


Blockly.Python['http_get_status'] = function(block) {
  var variable_request = Blockly.Python.nameDB_.getName(block.getFieldValue('request'), Blockly.VARIABLE_CATEGORY_NAME);
 
  var code = variable_request + '.status_code';

  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python['http_get_content'] = function(block) {
  var variable_request = Blockly.Python.nameDB_.getName(block.getFieldValue('request'), Blockly.VARIABLE_CATEGORY_NAME);
 
  var code = 'str(' + variable_request + '.content)';

  return [code, Blockly.Python.ORDER_NONE];
};

//BMP180
//BMP280
Blockly.Python['bmp280_altitude'] = function(block) {
	var code = 'bmp280.altitude';
	return [code, Blockly.Python.ORDER_NONE];
};

//MCP23017
//CCS811
//SHT20




/* ------------------------------------------------------------------------
 * Carried over from upstream `master` during the merge of upstream `offline`.
 *
 * These 16 definitions exist on master but not on offline -- mostly the
 * Bluetooth/BLE and data-plotter work from amadomaker's PR #241, which landed
 * on master after offline had already branched. Taking offline's file wholesale
 * would have silently dropped them.
 * ---------------------------------------------------------------------- */



Blockly.Python['configurar_plotter_dados'] = function(block) {
  var sensorCount = block.sensorCount_;
  var code = 'def formatar_dados_para_plotter():\n';
  
  // Lista para armazenar as variáveis dos sensores
  var sensorVars = [];

  // Gera código para pegar os valores dos sensores
  for (var i = 0; i < sensorCount; i++) {
    var sensor = Blockly.Python.valueToCode(block, 'SENSOR_' + i, Blockly.Python.ORDER_ATOMIC);
    if (sensor) {
      sensorVars.push(sensor);  // Adiciona o sensor à lista de variáveis
      code += '    global ' + sensor + '\n';  // Declara a variável como global
    }
  }

  // Verifica se há sensores e gera o código de envio para o plotter
  if (sensorVars.length > 0) {
    // Formata a string de dados para incluir todos os sensores
    var plotterData = sensorVars.map(function(sensor, index) {
      return `{}`;  // Um placeholder '{}' para cada sensor
    }).join(', ');  // Separe os sensores por vírgula
    
    // Gera a linha de código com todos os sensores
    code += '    plotter_data = "' + plotterData + '{}".format(' + sensorVars.join(', ') + ', chr(0x0A))\n';
    
    // Envia os dados via Bluetooth
    code += '    uart.write(plotter_data)\n';
  } else {
    code += '    pass  # Nenhum sensor configurado\n';  // Caso nenhum sensor esteja configurado
  }

  return code;
};

Blockly.Python['enviar_dados_ble'] = function(block) {
  var code = `
formatar_dados_para_plotter()  # Chama a função que formata e envia os dados ao plotter
  `;
  return code;
};

Blockly.Python['gps_get_datetime'] = function(block) {

  var code = 'gps_datetime';

  return [code, Blockly.Python.ORDER_NONE];
};





Blockly.Python['pico_timer'] = function(block) {

  var interval = block.getFieldValue('interval');
  var timerNumber = block.getFieldValue('timerNumber');
  var statements_name = Blockly.Python.statementToCode(block, 'statements');
  
  Blockly.Python.definitions_['import_timer'] = 'from machine import Timer';
  Blockly.Python.definitions_['import_timer_start'] = 'tim=Timer()'; //-1)';

  Blockly.Python.definitions_['import_timer_callback'] = '\n#Timer Function Callback\ndef timerFunc(t):\n' + statements_name + '\n\n'; 

  var code = 'tim.init(period=' + interval + ', mode=Timer.PERIODIC, callback=timerFunc)\n';
             
  return code;
};



Blockly.Python['show_received_data'] = function(block) {
  var code = 'received_data';
  return [code, Blockly.Python.ORDER_ATOMIC];
};



