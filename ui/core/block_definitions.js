
















//Blockly.Blocks['utime.delay'] = {


Blockly.Blocks['utime.deadline'] = {
  init: function() {
    this.appendValueInput("TIME")
        .setCheck(null)
        .appendField("until deadline #")
        .appendField(new Blockly.FieldNumber(Math.floor(Math.random() * 10), 0, 9, 1), "ID")
        .appendField("of");
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([["seconds","time"], ["milliseconds","ticks_ms"], ["microseconds","ticks_us"], ["nanoseconds","time_ns"], ["cpu ticks","ticks_cpu"]]), "SCALE");
    this.appendStatementInput("DO")
        .setCheck(null)
        .appendField("do");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(135);
    this.setTooltip("Creates a loop with deadline.");
    this.setHelpUrl("https://docs.micropython.org/en/latest/library/utime.html#utime.ticks_add");
  }
};















Blockly.Blocks['timer'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("Timer #")
        .appendField(new Blockly.FieldNumber(0, 0, 9, 1), "timerNumber")
        .appendField("do")
        .appendField(new Blockly.FieldDropdown([["every","PERIODIC"], ["once in","ONE_SHOT"]]), "MODE")
        .appendField(new Blockly.FieldNumber(1000, 0, Infinity, 1), "interval")
        .appendField("ms");
    this.appendStatementInput("statements")
        .setCheck("image");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set a Timer to execute periodically or one after a time given in milliseconds.');
    this.setHelpUrl("https://docs.micropython.org/en/latest/esp32/quickref.html#timers")
  }
};



















/*
Blockly.Blocks['esp32_adc'] = {
  init: function() {
    this.appendValueInput("pin")
        .setCheck("Number")
        .appendField("ESP32 Analog (ADC) Input");
    this.setOutput(true, null);
    this.setColour(230);
 this.setTooltip("Read ESP32 ADC input of specified pin");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};
*/

Blockly.Blocks['esp32_adc'] = {
  init: function() {
	if (UI ['workspace'].selector.value == "ESP32S2") {
		this.appendDummyInput()
		.appendField("ESP32S2 Analog Input (ADC)");
		this.appendValueInput("pin")
		.setCheck("Number")
		.setAlign(Blockly.ALIGN_RIGHT)
		.appendField("pin");
		this.setOutput(true, null);
		this.setTooltip("Read ESP32S2 Analog Input");
	}
	else {
		this.appendDummyInput()
		.appendField("ESP32 Analog Input (ADC)");
		this.appendDummyInput()
		.appendField("Attenuation: ")
		.appendField(new Blockly.FieldDropdown([["ATTN_0DB","0"], ["ATTN_2_5DB","1"], ["ATTN_6DB","2"], ["ATTN_11DB","3"]]), "Attenuation");
		this.appendDummyInput()
		.appendField("Width: ")
		.appendField(new Blockly.FieldDropdown([["WIDTH_9BIT","0"], ["WIDTH_10BIT","1"], ["WIDTH_11BIT","2"], ["WIDTH_12BIT","3"]]), "Width: ");
		this.appendValueInput("pin")
		.setCheck("Number")
		.setAlign(Blockly.ALIGN_RIGHT)
		.appendField("pin");
		this.setOutput(true, null);
		this.setColour(230);
		this.setTooltip("Read ESP32 Analog Input");
	}

	this.setColour(230);
  }
};












Blockly.Blocks['gpio_interrupt'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("External event (Interrupt on Input Pin)");
    this.appendDummyInput()
        .appendField("Trigger:")
        .appendField(new Blockly.FieldDropdown([["IRQ_FALLING","IRQ_FALLING"], ["IRQ_RISING","IRQ_RISING"], ["IRQ_FALLING and IRQ_RISING","BOTH"]]), "trigger");
    this.appendValueInput("pin")
        .setCheck(null)
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Pin");
    this.appendStatementInput("code")
        .setCheck(null)
        .appendField("do");
    this.setColour(230);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip("Trigger interrupt when pin state changes");
 this.setHelpUrl("bipes.net.br");
  }
};



/// Pinout
Blockly.Blocks['pinout'] = {
  update_list: function(load_) {
    let device_init_ = this.device_init;
    let device_ = this.getFieldValue('DEVICE');
    if (!device_) device_ = device_init_;
    /* make device name if it do not match with workspace */
    if (device_ !== device_init_)
      this.setColour(1);
    else if (device_ === device_init_)
      this.setColour(230);  // this.setDisabled causes all modifiers to stop working at the workspace, using visual colour feedback instead.
    if (this.first_load < 1 && load_) {
      device_ = device_init_;
      this.setColour(230);
      this.getField('DEVICE').doValueUpdate_(device_);
    } else {
      this.first_load = this.first_load - 1; // function is triggered twice on load due to setting values
    }
    this.setTooltip(device_ + " Pins");
    let devices = UI ['workspace'].devices

    if (device_  in  devices && 'pinout' in devices [device_]){
      return devices [device_].pinout;
    } else {
      return [[MSG["notDefined"],"None"]];
    }
  },
  refresh: function() {
    this.device_init = document.querySelector ('#device_selector').value
    this.update_list(false);
  },
  device_init: '',
  options: [],
  first_load: 2,
  init: function() {

    /*
    "this.getField('DEVICE').SERIALIZABLE = true;" could be used instead of FieldLabelSerializable
    */
    this.device_init = document.querySelector ('#device_selector').value;
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable(this.device_init), 'DEVICE') // will use device_init if new block or no device specification on XML.
        .appendField(MSG["pin"])
        //.appendField('pin')
        .appendField(new Blockly.FieldDropdown(() => { return this.update_list(true);}), 'PIN');
    this.getField('DEVICE').setVisible(false);
    this.setOutput(true, null);
    this.setColour(230);
    this.setHelpUrl("http://www.bipes.net.br");
  },
};

//OneWire and DS1820
//

//DS3231
//VL53L0X
//MPR121











Blockly.Blocks['max7219_custom'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Custom Data Matrix layout");
      this.appendDummyInput()
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A0")
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A1")
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A2")
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A3")
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A4")
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A5")
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A6")
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A7");
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B4")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B5")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B6")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B7");
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C4")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C5")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C6")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C7");
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D4")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D5")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D6")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D7");
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E4")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E5")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E6")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E7");
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F4")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F5")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F6")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F7");
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G4")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G5")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G6")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G7");
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H4")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H5")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H6")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H7");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour("olive");
      this.setTooltip("Write to LED Matrix");
      this.setHelpUrl("http://www.bipes.net.br");
    }
};



Blockly.Blocks['tm1640_custom'] = {
    init: function () {

        this.appendDummyInput()
                .appendField("Custom Data Matrix layout");
        this.appendDummyInput()
                .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A0")
	    	//Heart
                //.appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2661'}), "A0")
                .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A1")
                .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A2")
                .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A3")
                .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A4")
                .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A5")
                .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A6")
                .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A7");
        this.appendDummyInput()
                .appendField(new Blockly.FieldCheckbox("TRUE"), "B0")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "B1")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "B2")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "B3")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "B4")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "B5")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "B6")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "B7");
        this.appendDummyInput()
                .appendField(new Blockly.FieldCheckbox("TRUE"), "C0")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "C1")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "C2")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "C3")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "C4")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "C5")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "C6")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "C7");
        this.appendDummyInput()
                .appendField(new Blockly.FieldCheckbox("TRUE"), "D0")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "D1")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "D2")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "D3")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "D4")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "D5")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "D6")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "D7");
        this.appendDummyInput()
                .appendField(new Blockly.FieldCheckbox("TRUE"), "E0")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "E1")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "E2")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "E3")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "E4")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "E5")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "E6")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "E7");
        this.appendDummyInput()
                .appendField(new Blockly.FieldCheckbox("TRUE"), "F0")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "F1")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "F2")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "F3")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "F4")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "F5")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "F6")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "F7");
        this.appendDummyInput()
                .appendField(new Blockly.FieldCheckbox("TRUE"), "G0")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "G1")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "G2")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "G3")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "G4")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "G5")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "G6")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "G7");
        this.appendDummyInput()
                .appendField(new Blockly.FieldCheckbox("TRUE"), "H0")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "H1")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "H2")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "H3")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "H4")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "H5")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "H6")
                .appendField(new Blockly.FieldCheckbox("TRUE"), "H7");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
 this.setTooltip("Write to LED Matrix");
 this.setHelpUrl("http://www.bipes.net.br");

    }
};

















/// Initialize BH1750 Sensor
/// Read BH1750 
/// Start AHT Sensor
/// Read AHT10/20 Temperature
/// Read AHT10/20 Humidity
/// MQTT
/// Start MQTT Client

/// Add Data to MQTT Buffer

/// Publish Buffer to MQTT Topic

/// Publish Payload to MQTT Topic

/// Subscribe to MQTT Topic

/// Set Callback to MQTT Messages
Blockly.Blocks['mqtt_set_callback'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable(MSG["mqtt_set_callback"]), "BLOCK_MQTT_SET_CALLBACK");
    this.appendDummyInput()
        .appendField(MSG["with"])
        .appendField(new Blockly.FieldVariable('data_bytes'), 'MQTT_DATA_VAR')
        .appendField(MSG["received_from"])
        .appendField(new Blockly.FieldVariable(
          'topic',
          null,
          ['String'],
          'String'
        ), 'MQTT_TOPIC_VAR');
    this.appendStatementInput('do')
        .appendField(MSG["do"]);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setInputsInline(false);
    this.setTooltip(MSG["mqtt_callback_tooltip"]);
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// Check MQTT Server for pending messages

/// Wait for MQTT Server messages

/// Disconnect MQTT Client

/// EasyMQTT
/// EasyMQTT Init
Blockly.Blocks['easymqtt_init'] = {
  generate_id: function(){
    return Math.random().toString(36).substring(7);
  },
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldLabelSerializable(MSG["easymqtt_start"]), "BLOCK_EASYMQTT_INIT");
    this.appendDummyInput()
        .appendField(MSG["session_id"])
        .appendField(new Blockly.FieldTextInput(this.generate_id()),
            'EASYMQTT_SESSION_ID');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Start EasyMQTT Client");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// EasyMQTT Publish Data

///EasyMQTT Subscribe
Blockly.Blocks['easymqtt_subscribe'] = {
  init: function() {
    this.appendValueInput("topic")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable(MSG["easymqtt_subscribe"]), "EASYMQTT_TOPIC");
    this.appendDummyInput()
        .appendField(MSG['when'])
        .appendField(new Blockly.FieldVariable(
          'data',
          null,
          ['Number'],
          'Number'
        ), 'EASYMQTT_VAR')
        .appendField(MSG["data_received"]);
    this.appendStatementInput('do')
        .appendField('do');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setInputsInline(false);
    this.setTooltip("Subscribe to a topic and define what to do when data is received from EasyMQTT Server");
    this.setHelpUrl("http://www.bipes.net.br");
  }
};

/// EasyMQTT Receive Data

/// EasyMQTT Disconnect

/// Convert to Str

/// Decode Bytes to Str

/// Convert to Int

/// Convert to Float


Blockly.Blocks['control_pid.__init__'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Init PID Controller #")
        .appendField(new Blockly.FieldNumber(0, 0, 9, 1), "ID")
    this.appendDummyInput()
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("tunings Kp")
        .appendField(new Blockly.FieldNumber(1), "Kp")
        .appendField("Ki")
        .appendField(new Blockly.FieldNumber(0), "Ki")
        .appendField("Kd")
        .appendField(new Blockly.FieldNumber(0), "Kd");
    this.appendDummyInput()
        .appendField("update every")
        .appendField(new Blockly.FieldNumber(2, 0, Infinity, 1), "SAMPLETIME")
        .appendField(new Blockly.FieldDropdown([["seconds","s"], ["miliseconds","ms"], ["microseconds","us"], ["nanoseconds","ns"], ["cpu ticks","cpu"]]), "SCALE");
    this.appendValueInput("SETPOINT")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("setpoint");
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#7b49ad');
    this.setTooltip("Init PID controler, set 'update every' to zero for non realtime simulation or with non fixed intervals");
    this.setHelpUrl("https://micropython-simple-pid.readthedocs.io/");
  },
  check (gains, sampletime) {
    Tool.warningIfTrue (this, [
      [() => !gains.every(e => e * gains[0] >= 0), 'All gains in the PID should have the same sign.'],
      [() => sampletime == 'None', 'Non fixed timestep PID enabled.']
    ]);
  }
};






















































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































//RC522 RFID module







//rfid_rc522_read_card
Blockly.Blocks['rfid_rc522_read_card'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("Read RFID Card Memory");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};


//rfid_rc522_write_card
Blockly.Blocks['rfid_rc522_write_card'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("Write RFID Card Memory");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};



//I2C Char LCD

Blockly.Blocks['char_lcd_custom'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Char LCD layout");
	    this.appendValueInput("id")
	        .setCheck("Number")
	        .setAlign(Blockly.ALIGN_RIGHT)
	        .appendField("ID (0 - 7)");
      this.appendDummyInput()
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A0")
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A1")
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A2")
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A3")
        .appendField(new Blockly.FieldCheckbox(true, null, {checkCharacter: '\u2713'}), "A4")
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "B4")
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "C4")
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "D4")
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "E4")
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "F4")
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "G4")
      this.appendDummyInput()
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H0")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H1")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H2")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H3")
          .appendField(new Blockly.FieldCheckbox("TRUE"), "H4")
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour("olive");
      this.setTooltip("Write to LCD");
      this.setHelpUrl("http://www.bipes.net.br");
    }
};


//uMail
//New Network related functions
//








//TCP/IP Sockets



















//UART

//MAX30100
// GY33 I2C
//
  
// GY33 UART 
//
//GPS Module
//
//Rotatory Encoder
//Stepper Motor
//
//

//DC Motor with H-Bridge
//ESP32 specific functions

//CAN BUS
//https://github.com/nos86/micropython/blob/esp32-can-driver-v3/docs/library/machine.CAN.rst











// Motors








//neopixel
function componentToHex(c) {
  var hex =  parseInt(c).toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

Blockly.Blocks['neopixel_color_numbers'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Red");
    this.appendValueInput("red")
        .setCheck(null);
    this.appendDummyInput()
        .appendField("Green");
    this.appendValueInput("green")
        .setCheck(null);
    this.appendDummyInput()
        .appendField("Blue");
    this.appendValueInput("blue")
        .setCheck(null);
    this.setInputsInline(true);
    this.setOutput(true, null);
    this.setColour("olive");
    this.setTooltip("NeoPixel LED RGB URL");
    this.setHelpUrl("https://bipes.net.br/wp/?page_id=177");
  },
  styleBlock: function(colours) {
    colours = colours.map(x => parseInt(x))
    colours = colours.includes(NaN) ? [89,102,166] : colours
    if(colours.every((e) => {return e <= 255}) && colours.every((e) => {return e >= 0})) {
      let hex_ = Tool.RGB2HEX (colours [0], colours [1], colours [2]);
      this.setColour(hex_);
    } else
      this.setColour("#FF0000");
  }
};


Blockly.Blocks['HSL_to_RGB'] = {
  init: function  () {
    this.appendDummyInput()
        .appendField("Hue");
    this.appendValueInput("hue")
        .setCheck('Number');
    this.appendDummyInput()
        .appendField("Saturation");
    this.appendValueInput("saturation")
        .setCheck('Number');
    this.appendDummyInput()
        .appendField("Lightness");
    this.appendValueInput("lightness")
        .setCheck('Number');

    this.setInputsInline(true);
    this.setOutput(true, null);
    this.setColour("olive");
    this.setTooltip("HUE to RGB color, Hue from 0º to 360º, Saturation and Lightness from 0% to 100%.");
    this.setHelpUrl("https://bipes.net.br/wp/?page_id=177");
  },

  styleBlock: function(colours) {
    colours = colours.map(x => parseFloat(x))
    colours = colours.includes(NaN) ? [230,30,50] : colours
    if (colours[0] <= 360 && colours[0] >= 0 && colours[1] >= 0 && colours[1] <= 100 && colours[2] >= 0 && colours[2] <= 100) {
      let hex_ = Tool.HUE2HEX (colours [0], colours [1], colours [2]);
      this.setColour(hex_);
    } else
      this.setColour("#FF0000");
  }
};


Blockly.Blocks['localstorage_store'] = {
    init: function () {
        this.appendDummyInput()
          .appendField("localStorage topic")
          .appendField(new Blockly.FieldTextInput("data"), "topic");
        this.itemCount_ = 3;
        this.updateShape_();
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setMutator(new Blockly.Mutator(["localstorage_store_item"]));
        this.setTooltip("The data will be stored in the browser, organized by topic, see the 'Databoard' tab.");
    },
    mutationToDom: function () {
        var a = Blockly.utils.xml.createElement("mutation");
        a.setAttribute("items", this.itemCount_);
        return a;
    },
    domToMutation: function (a) {
        this.itemCount_ = parseInt(a.getAttribute("items"), 10);
        this.updateShape_();
    },
    decompose: function (a) {
        var b = a.newBlock("localstorage_store_container");
        b.initSvg();
        for (var c = b.getInput("STACK").connection, d = 0; d < this.itemCount_; d++) {
            var e = a.newBlock("localstorage_store_item");
            e.initSvg();
            c.connect(e.previousConnection);
            c = e.nextConnection;
        }
        return b;
    },
    compose: function (a) {
        var b = a.getInputTargetBlock("STACK");
        for (a = []; b && !b.isInsertionMarker(); ) a.push(b.valueConnection_), (b = b.nextConnection && b.nextConnection.targetBlock());
        for (b = 0; b < this.itemCount_; b++) {
            var c = this.getInput("ADD" + b).connection.targetConnection;
            c && -1 == a.indexOf(c) && c.disconnect();
        }
        this.itemCount_ = a.length;
        this.updateShape_();
        for (b = 0; b < this.itemCount_; b++) Blockly.Mutator.reconnect(a[b], this, "ADD" + b);
    },
    saveConnections: function (a) {
        a = a.getInputTargetBlock("STACK");
        for (var b = 0; a; ) {
            var c = this.getInput("ADD" + b);
            a.valueConnection_ = c && c.connection.targetConnection;
            b++;
            a = a.nextConnection && a.nextConnection.targetBlock();
        }
    },
    updateShape_: function () {
        this.itemCount_ && this.getInput("EMPTY") ? this.removeInput("EMPTY") : this.itemCount_ || this.getInput("EMPTY") || this.appendDummyInput("EMPTY").appendField("no axis set").setAlign(Blockly.ALIGN_RIGHT);
        for (var a = 0; a < this.itemCount_; a++)
            if (!this.getInput("ADD" + a)) {
                var b = this.appendValueInput("ADD" + a).setAlign(Blockly.ALIGN_RIGHT);
                0 == a && b.appendField("axis data (x, y, ...)");
            }
        for (; this.getInput("ADD" + a); ) this.removeInput("ADD" + a), a++;
    },
};
Blockly.Blocks['localstorage_store_container'] = {
    init: function () {
        this.setColour(230);
        this.appendDummyInput().appendField("dataset");
        this.appendStatementInput("STACK");
        this.setTooltip("Dataset composed by multiple axis, the first axis is 'x'.");
        this.contextMenu = !1;
    },
};
Blockly.Blocks['localstorage_store_item'] = {
    init: function () {
        this.setColour(230);
        this.appendDummyInput().appendField("axis");
        this.setPreviousStatement(!0);
        this.setNextStatement(!0);
        this.setTooltip("Add axis to the dataset (x, y1, y2, ...).");
        this.contextMenu = !1;
    },
};

//REPL over Web Bluetooth



Blockly.Blocks['bluetooth_pico_w_receive'] = {
  init: function() {

    this.appendDummyInput()
        .appendField("On Receive");
    this.appendValueInput("VALUE")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("Receive Text Into:");
    this.appendStatementInput("code")
      .setCheck(null)
      .appendField("do");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);    
    this.setColour(230);

    this.setTooltip("Receive Text From Connected Bluetooth Device");
    this.setHelpUrl("www.bipes.net.br");
  }
};





//Russ Hughes ST7789 display











//ST7789 display


Blockly.Blocks['st7789_color_numbers'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("ST7789 Color: Red");
    this.appendValueInput("red")
        .setCheck(null);
    this.appendDummyInput()
        .appendField("Green");
    this.appendValueInput("green")
        .setCheck(null);
    this.appendDummyInput()
        .appendField("Blue");
    this.appendValueInput("blue")
        .setCheck(null);
    this.setInputsInline(true);
    this.setOutput(true, null);
    this.setColour("olive");
    this.setTooltip("ST7789 Color");
    this.setHelpUrl("https://bipes.net.br/wp/?page_id=177");
  },
  styleBlock: function(colours) {
    colours = colours.map(x => parseInt(x))
    colours = colours.includes(NaN) ? [89,102,166] : colours
    if(colours.every((e) => {return e <= 255}) && colours.every((e) => {return e >= 0})) {
      let hex_ = Tool.RGB2HEX (colours [0], colours [1], colours [2]);
      this.setColour(hex_);
    } else
      this.setColour("#FF0000");
  }
};








//Sound






// Pololu 3pi+ 2040




// The four Pololu 3pi+ 2040 generators that used to sit here have moved to
// generator_stubs.js, where the generators live. They were the only ones in
// this file, and ui/embed.html loads this file without any generator bundle at
// all -- so `Blockly.Python[...] = ...` threw on an undefined Blockly.Python
// and took the rest of the file with it, leaving embed mode without the seven
// block definitions that follow (google_spreadsheet, configurar_plotter_dados,
// sensor_container, sensor_create, play_melody and the two uasyncio blocks).
















//Fri Aug  6 23:23:55 -03 2021
//Snek

/*
snek_delay
snek_uptime
snek_gpio_set
snek_gpio_get
*/












//Thu Mar 10 13:57:50 -03 2022


Blockly.Blocks['google_spreadsheet'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Send data to a Google spreadsheet")
        .appendField("#")
        .appendField(new Blockly.FieldNumber(1, 1, 9, 1), "sheet_num");
    this.appendValueInput("deploy_code")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Deployment Code");
    this.appendStatementInput("cells_values")
        .setCheck(null)
        .appendField("Cells");
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

// Blocos do Pluviômetro
// Iniciar Pluviômetro
// Parar Pluviômetro
//Blocos Anemômetro
// Iniciar Anemômetro
//Parar Anemômetro
//Blocos de Interrupção
// Iniciar interrupção





//BMP180
//BMP280

//MCP23017
//CCS811 Air Quality Sensor
//SHT20




/* ------------------------------------------------------------------------
 * Carried over from upstream `master` during the merge of upstream `offline`.
 *
 * These 14 definitions exist on master but not on offline -- mostly the
 * Bluetooth/BLE and data-plotter work from amadomaker's PR #241, which landed
 * on master after offline had already branched. Taking offline's file wholesale
 * would have silently dropped them.
 * ---------------------------------------------------------------------- */



Blockly.Blocks['configurar_plotter_dados'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Configurar plotter para sensores");
    this.appendValueInput('SENSOR_0')
        .setCheck('Number')
        .appendField('Sensor 1');
    this.setMutator(new Blockly.Mutator(['sensor_create']));
    this.sensorCount_ = 1;
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Configura o plotter para enviar dados de múltiplos sensores.");
    this.setHelpUrl("");
  },
  mutationToDom: function() {
    var container = document.createElement('mutation');
    container.setAttribute('sensor_count', this.sensorCount_);
    return container;
  },
  domToMutation: function(xmlElement) {
    this.sensorCount_ = parseInt(xmlElement.getAttribute('sensor_count'), 10);
    this.updateShape_();
  },
  decompose: function(workspace) {
    var containerBlock = workspace.newBlock('sensor_container');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var i = 1; i < this.sensorCount_; i++) {
      var sensorBlock = workspace.newBlock('sensor_create');
      sensorBlock.initSvg();
      connection.connect(sensorBlock.previousConnection);
      connection = sensorBlock.nextConnection;
    }
    return containerBlock;
  },
  compose: function(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock = itemBlock.nextConnection &&
          itemBlock.nextConnection.targetBlock();
    }
    for (var i = 1; i <= this.sensorCount_; i++) {
      var input = this.getInput('SENSOR_' + i);
      if (input) {
        this.removeInput('SENSOR_' + i);
      }
    }
    this.sensorCount_ = connections.length + 1;
    this.updateShape_();
    for (var i = 1; i <= connections.length; i++) {
      Blockly.Mutator.reconnect(connections[i - 1], this, 'SENSOR_' + i);
    }
  },
  updateShape_: function() {
    if (this.sensorCount_ && this.sensorCount_ > 1) {
      for (var i = 1; i < this.sensorCount_; i++) {
        if (!this.getInput('SENSOR_' + i)) {
          var input = this.appendValueInput('SENSOR_' + i)
              .setCheck('Number')
              .appendField('Sensor ' + (i + 1));
        }
      }
    }
  }
};






Blockly.Blocks['sensor_container'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('sensores');
    this.appendStatementInput('STACK');
    this.setColour(230);
    this.contextMenu = false;
  }
};

Blockly.Blocks['sensor_create'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('adicionar sensor');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(230);
    this.contextMenu = false;
  }
};





/*
 * The three "(standalone)" game blocks -- Invaders, Snake and Defender with
 * the whole library embedded in the program instead of imported from a file
 * on the board.
 *
 * Their twins next to them in the Games category are generated from
 * blockdef/definitions/games.blockdef.yaml, and so is this half's toolbox
 * entry (`external: true` there, which is what keeps the two halves in one
 * flyout in one order). What cannot be generated is the Python: it is the
 * library source, indented and wrapped, rather than a template with holes,
 * and that is a transform -- the same reason `timer` and `google_spreadsheet`
 * are hand-written. See Blockly.Python.gameStandalone_ in generator_stubs.js.
 *
 * Written out one literal assignment at a time rather than in a loop over the
 * three, because gen_blocks.py reads the block types it has to check out of
 * this file's text: a computed `Blockly.Blocks['play_' + name]` is a block it
 * cannot see, and a toolbox entry for one is an "Unknown block type" that
 * stops the whole category from opening.
 */
(function () {
  /* One shape for all three: title, screenshot, the four pins. Identical to
     what the generator writes for the file-based twin, minus the next
     connector -- run() never comes back, so a block stacked under it would be
     dead code that looks live. */
  function standaloneGame(title, image, imageWidth, controls) {
    return {
      init: function () {
        this.appendDummyInput()
            .appendField("Play " + title + " (standalone)");
        this.appendDummyInput()
            .appendField(new Blockly.FieldImage(image, imageWidth, 55, "*"));
        this.appendValueInput("SDA")
            .setCheck("Number")
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField("SDA");
        this.appendValueInput("SCL")
            .setCheck("Number")
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField("SCL");
        this.appendValueInput("BTN")
            .setCheck("Number")
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField("Button");
        this.appendValueInput("LED")
            .setCheck("Number")
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField("LED");
        this.setPreviousStatement(true, null);
        this.setColour(290);
        this.setTooltip(
            "The whole game travels inside this block, so nothing has to be " +
            "installed on the board first. " + controls + " This block never " +
            "finishes -- press RST on the board to get back to your program.");
      }
    };
  }

  Blockly.Blocks['play_invaders_standalone'] =
      standaloneGame("Invaders", "media/invaders.jpg", 79,
                     "The cannon moves and fires by itself; tap the button to reverse it.");

  Blockly.Blocks['play_snake_standalone'] =
      standaloneGame("Snake", "media/snake.jpg", 91,
                     "Tap the button to turn right.");

  Blockly.Blocks['play_defender_standalone'] =
      standaloneGame("Defender", "media/defender.jpg", 91,
                     "The ship fires by itself; tap the button to change altitude.");
})();

/*
 * "Play melody" -- the block half of the Music tab (core/sound.js).
 *
 * Hand-written rather than generated because it does two things a
 * .blockdef.yaml has no way to say: the dropdown is filled at the moment its
 * menu opens, from melodies the user has written since the page loaded, and
 * the block carries the melody it plays.
 *
 * Carrying it is the important half, and it is where this parts company with
 * amadomaker's version. There the block stores only a name, and the generator
 * bakes *every* melody in localStorage into the program and has the board
 * search that list at run time for the one it wants. So the same .xml opened
 * on another computer generates a program that raises at run time; a class set
 * of machines each produce a different program from one file; and every melody
 * anyone ever wrote travels to the board on every run. Here the notes are in
 * the block, in a `<mutation>`, so a saved program plays the same tune
 * wherever it is opened and the melody store is only how you pick one.
 */
Blockly.Blocks['play_melody'] = {
  init: function() {
    this.melodyNotes_ = [];
    this.melodyBpm_ = 120;
    this.appendDummyInput()
        .appendField("Play melody")
        .appendField(new Blockly.FieldDropdown(
            () => this.melodyOptions_(),
            (name) => {this.takeMelody_(name);}), "MELODY");
    this.appendValueInput("pin")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Pin");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Play a melody written in the Music tab on a buzzer. " +
                    "The notes travel inside this block, so a saved program " +
                    "plays the same tune on any computer.");
  },
  /**
   * What the dropdown offers: every saved melody, plus whatever this block is
   * already playing.
   *
   * The block's own melody is included even when it has been deleted from the
   * store, or was written on somebody else's machine -- otherwise opening a
   * shared program would show a dropdown that cannot display its own value,
   * and Blockly would quietly reset the field to the first option, changing
   * the program by opening it.
   */
  melodyOptions_: function() {
    let names = typeof Music == 'undefined' ? [] : Music.melodies().map((m) => m.name);
    let mine = this.getFieldValue("MELODY");
    if (mine && mine != 'NONE' && !names.includes(mine))
      names.push(mine);
    names.sort();
    if (names.length == 0)
      return [["no melodies saved", "NONE"]];
    return names.map((name) => [name, name]);
  },
  /**
   * Copy a melody out of the store and into the block.
   *
   * A name the store does not have leaves the notes alone: that is the block
   * redisplaying its own melody, not the user choosing a different one.
   */
  takeMelody_: function(name) {
    let melody = typeof Music == 'undefined' ? undefined : Music.melody(name);
    if (melody == undefined)
      return;
    this.melodyNotes_ = melody.notes;
    this.melodyBpm_ = melody.bpm;
  },
  /** The melody rides in the saved XML, so the program is self-contained. */
  mutationToDom: function() {
    let container = document.createElement('mutation');
    container.setAttribute('bpm', this.melodyBpm_);
    container.setAttribute('notes', JSON.stringify(this.melodyNotes_));
    return container;
  },
  domToMutation: function(xmlElement) {
    this.melodyBpm_ = parseInt(xmlElement.getAttribute('bpm')) || 120;
    try {
      let notes = JSON.parse(xmlElement.getAttribute('notes') || '[]');
      this.melodyNotes_ = Array.isArray(notes) ? notes : [];
    } catch (e) {
      // A hand-edited or truncated file. An empty melody warns on the block,
      // which is a better answer than refusing to load the whole program.
      console.error('play_melody: unreadable notes in the saved program.', e);
      this.melodyNotes_ = [];
    }
  }
};


// --- uasyncio: the async function, and a call that makes a coroutine --------
//
// The `uasyncio` category is thirty-six blocks, and the ones the API calls
// coroutines emit `await`, which is legal inside an `async def` and a
// SyntaxError outside one. Nothing in BIPES opened an `async def`, so the
// whole category was Python a program had no way to reach -- the decision
// BACKLOG.md recorded under B1 as "add an async function block, or drop the
// category". These two are that block, and the call that hands what it defines
// to `run`, `create_task` and `wait_for`.
//
// They are hand-written rather than declared in blockdef/ for the same reason
// `timer` and `gpio_interrupt` are: the body is a function scope, so a write
// to a program variable inside it is a local unless the def says `global`, and
// working out which names those are means walking the block's own stack.
// `Blockly.Python.callbackGlobals_` is that walk.

Blockly.Blocks['uasyncio_async_def'] = {
  /** The names the workspace's async-function blocks currently declare. */
  asyncDefNames: function() {
    let ws = this.workspace;
    if (ws && ws.isFlyout && ws.targetWorkspace)
      ws = ws.targetWorkspace;
    if (!ws || !ws.getBlocksByType)
      return [];
    let names = [];
    ws.getBlocksByType('uasyncio_async_def', false).forEach(function(def) {
      let name = def.getFieldValue('NAME');
      if (name)
        names.push(name);
    });
    return names;
  },
  /**
   * Two definitions under one name is one function: `definitions_` is keyed by
   * the name, so the second silently replaces the first and the body of one of
   * them is simply not in the program. Warn rather than refuse, the same call
   * the recursion guard makes.
   */
  onchange: function() {
    if (!this.workspace || this.workspace.isFlyout)
      return;
    let name = this.getFieldValue('NAME');
    let clash = name && this.asyncDefNames().filter(function(n) {
      return n === name;
    }).length > 1;
    this.setWarningText(clash ?
        'Two async functions are called "' + name + '".\nOnly one of them ends' +
        ' up in the program.' : null, 'asyncDuplicate');
  },
  init: function() {
    this.appendDummyInput()
        .appendField('async function')
        .appendField(new Blockly.FieldTextInput('main'), 'NAME');
    this.appendStatementInput('BODY');
    this.setColour(0);
    // No previous or next connector, the same as Blockly's own function
    // definition block: a definition is not a step in a program, and nothing
    // runs because it is there. The run block is what starts it.
    this.setTooltip('An async function. The await blocks in this category are ' +
        'legal inside\none and a SyntaxError outside, so this is what they go ' +
        'in.\nStart it with the run block, or hand it to create_task.');
    this.setHelpUrl('https://docs.micropython.org/en/latest/library/uasyncio.html');
  }
};

Blockly.Blocks['uasyncio_coro'] = {
  /**
   * The dropdown. It lists the async functions the workspace defines, plus
   * whatever this block already holds -- a function can be renamed or deleted
   * with a call block still pointing at it, and a value Blockly does not find
   * among the options is one it refuses to load back.
   */
  coroOptions: function() {
    let names = Blockly.Blocks['uasyncio_async_def'].asyncDefNames.call(this);
    names = names.filter(function(n, i) { return names.indexOf(n) === i; }).sort();
    let current = this.getField && this.getField('NAME') ? this.getFieldValue('NAME') : null;
    if (current && current !== 'NONE' && names.indexOf(current) === -1)
      names.unshift(current);
    if (!names.length)
      return [[(typeof MSG != 'undefined' && MSG['notDefined']) ||
               'no async function', 'NONE']];
    return names.map(function(n) { return [n, n]; });
  },
  /** A name nothing defines any more emits `name()` and raises a NameError. */
  onchange: function() {
    if (!this.workspace || this.workspace.isFlyout)
      return;
    let name = this.getFieldValue('NAME');
    let defined = Blockly.Blocks['uasyncio_async_def'].asyncDefNames.call(this);
    let missing = !name || name === 'NONE' || defined.indexOf(name) === -1;
    this.setWarningText(missing ?
        'No async function block declares this name,\nso this raises a ' +
        'NameError on the board.' : null, 'asyncUndefined');
  },
  init: function() {
    let field = new Blockly.FieldDropdown(() => this.coroOptions());
    // A dropdown refuses a value that is not one of its options, and it
    // validates against the options it cached when the field was built. On
    // load that is the wrong moment: Blockly creates the blocks in document
    // order, so a call block that comes before its `async function` block sees
    // an empty workspace, caches "no async function", and then drops the name
    // the saved program gave it -- `uasyncio.run(None)` where the program said
    // `uasyncio.run(counter())`. So this field takes any string and names it
    // as its own option when the list does not have it; `coroOptions` puts it
    // back in the list, and the block warns if nothing defines it.
    field.doClassValidation_ = function(value) {
      return (value === null || value === undefined) ? null : String(value);
    };
    let updateValue = field.doValueUpdate_;
    field.doValueUpdate_ = function(value) {
      updateValue.call(this, value);
      if (!this.selectedOption_ || this.selectedOption_[1] != this.value_)
        this.selectedOption_ = [String(value), String(value)];
    };
    this.appendDummyInput()
        .appendField('coroutine')
        .appendField(field, 'NAME')
        .appendField('( )');
    this.setOutput(true, null);
    this.setColour(0);
    this.setTooltip('Calls an async function, which builds the coroutine ' +
        'object that\nrun, create_task and wait_for take. It does not run it.');
    this.setHelpUrl('https://docs.micropython.org/en/latest/library/uasyncio.html');
  }
};
