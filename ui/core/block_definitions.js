
















Blockly.Blocks['deep_sleep'] = {
	init: function() {
    this.appendValueInput("interval")
        .setCheck("Number")
	.appendField("deep sleep");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
 this.setTooltip("Deep sleep process in milliseconds");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};
/*LEGACY_BLOCKS_START:Old timings blocks*/
Blockly.Blocks['delay_old'] = {
  init: function() {
    this.appendValueInput("time")
        .setCheck("Number")
        .appendField("delay seconds");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
 this.setTooltip("Delay processing in seconds");
 this.setHelpUrl("http://www.bipes.net.br/");
  }
};





/*LEGACY_BLOCKS_END: Old timings blocks*/
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








Blockly.Blocks['pico_timer'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("RPI Pico Timer ")
        .appendField(" Interval (ms): ")
        .appendField(new Blockly.FieldTextInput("1000"), "interval");
    this.appendStatementInput("statements")
        .setCheck("image");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};

Blockly.Blocks['pico_stop_timer'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("RPI Pico Stop Timer ")
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};


Blockly.Blocks['thread'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("Thread #")
        .appendField(new Blockly.FieldNumber(2, 0, 9, 1), "timerNumber")
        .appendField(" Interval (ms): ")
        .appendField(new Blockly.FieldTextInput("1000"), "interval");
    this.appendStatementInput("statements")
        .setCheck("image");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
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


















Blockly.Blocks['adc'] = {
  init: function() {
    this.appendValueInput("pin")
        .setCheck("Number")
        //.appendField("Read ADC Input");
        .appendField(MSG["read_analog_pin"]);
    this.setOutput(true, null);
    this.setColour(230);
 this.setTooltip("Read ADC input of specified pin");
 this.setHelpUrl("http://www.bipes.net.br");
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




Blockly.Blocks['adc_pico'] = {
  init: function() {
    this.appendValueInput("pin")
        .setCheck("Number")
        .appendField("Read RPI Pico ADC Input");
    this.setOutput(true, null);
    this.setColour(230);
 this.setTooltip("Read ADC input of specified pin from Raspberry Pi Pico");
 this.setHelpUrl("http://www.bipes.net.br");
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

Blockly.Blocks['gpio_interrupt_off'] = {
  init: function() {

    this.appendValueInput("pin")
        .setCheck("Number")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("Disable interrupt on pin");

    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
 this.setTooltip("Disable interrupt on a given pin");
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

Blockly.Blocks['net_get_request'] = {
  init: function() {

    this.appendDummyInput()
        .appendField(MSG["net_http_get"]); 
    this.appendValueInput("URL")
        .setAlign(Blockly.ALIGN_RIGHT)
        .setCheck("String")
        .appendField(new Blockly.FieldLabelSerializable("URL"), "BLOCK_NET_GET");
    this.setOutput(true, null);
    this.setColour(230);
 this.setTooltip("Make HTTP GET Request");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};

Blockly.Blocks['net_post_request'] = {
  init: function() {
    this.appendValueInput("URL")
        .setCheck("String")
        .appendField(new Blockly.FieldLabelSerializable("Make HTTP POST Request URL"), "NET_POST_REQUEST_URL");
    this.appendValueInput("data")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("Data"), "NET_POST_REQUEST_DATA");
    this.setOutput(true, null);
    this.setColour(230);
 this.setTooltip("Make HTTP POST Request");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};

Blockly.Blocks['net_post_request_json'] = {
  init: function() {
    this.appendValueInput("URL")
        .setCheck("String")
        .appendField(new Blockly.FieldLabelSerializable("Make HTTP POST Request URL"), "NET_POST_REQUEST_URL");
    this.appendValueInput("data")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabelSerializable("JSON Data"), "NET_POST_REQUEST_DATA");
    this.setOutput(true, null);
    this.setColour(230);
 this.setTooltip("Make HTTP POST Request with JSON data");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};








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




Blockly.Blocks['file_close_old'] = {
  init: function() {
   this.appendDummyInput()
        .appendField("Close file");

 this.appendValueInput("filename")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("filename");

 this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);

    this.setColour(230);
 this.setTooltip("Safely close file");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};







Blockly.Blocks['file_write_old'] = {
  init: function() {
   this.appendDummyInput()
        .appendField("Write text to file");


 this.appendValueInput("filename")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("filename");

 this.appendValueInput("data")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("data");

 this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);

    this.setColour(230);
 this.setTooltip("Write string to file");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};



Blockly.Blocks['file_read_old'] = {
  init: function() {
   this.appendDummyInput()
        .appendField("Read text from the file");

 this.appendValueInput("filename")
        .setCheck("String")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("filename");

    this.setOutput(true, null);

    this.setColour(230);
 this.setTooltip("Read string from a file");
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




















































































































































































































































































































































































































Blockly.Blocks["machine.ADCWiPy_ADCWiPy.channel"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" ADCWiPy.channel");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.ADCWiPy.html");
  }
};



Blockly.Blocks["machine.ADCWiPy_ADCWiPy.init"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" ADCWiPy.init");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: ADCWiPy.init() Enable the ADC block. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.ADCWiPy.html");
  }
};



Blockly.Blocks["machine.ADCWiPy_ADCWiPy.deinit"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" ADCWiPy.deinit");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: ADCWiPy.deinit() Disable the ADC block. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.ADCWiPy.html");
  }
};



Blockly.Blocks["machine.ADCWiPy_adcchannel"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" adcchannel");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: adcchannel() Fast method to read the channel value. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.ADCWiPy.html");
  }
};



Blockly.Blocks["machine.ADCWiPy_adcchannel.value"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" adcchannel.value");
    this.setColour(0);
    this.setOutput(true, null);
 this.setTooltip(".. method:: adcchannel.value() Read the channel value. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.ADCWiPy.html");
  }
};



Blockly.Blocks["machine.ADCWiPy_adcchannel.init"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" adcchannel.init");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: adcchannel.init() Re-init (and effectively enable) the ADC channel. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.ADCWiPy.html");
  }
};



Blockly.Blocks["machine.ADCWiPy_adcchannel.deinit"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" adcchannel.deinit");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: adcchannel.deinit() Disable the ADC channel. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.ADCWiPy.html");
  }
};











































































































































































Blockly.Blocks["machine.TimerWiPy_TimerWiPy.init"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" TimerWiPy.init");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.TimerWiPy.html");
  }
};



Blockly.Blocks["machine.TimerWiPy_TimerWiPy.deinit"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" TimerWiPy.deinit");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: TimerWiPy.deinit() Deinitialises the timer. Stops the timer, and disables the timer peripheral. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.TimerWiPy.html");
  }
};



Blockly.Blocks["machine.TimerWiPy_TimerWiPy.channel"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" TimerWiPy.channel");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.TimerWiPy.html");
  }
};



Blockly.Blocks["machine.TimerWiPy_timerchannel.irq"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" timerchannel.irq");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.TimerWiPy.html");
  }
};



Blockly.Blocks["machine.TimerWiPy_timerchannel.freq"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" timerchannel.freq");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.TimerWiPy.html");
  }
};



Blockly.Blocks["machine.TimerWiPy_timerchannel.period"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" timerchannel.period");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.TimerWiPy.html");
  }
};



Blockly.Blocks["machine.TimerWiPy_timerchannel.duty_cycle"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" timerchannel.duty_cycle");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/machine.TimerWiPy.html");
  }
};


































































Blockly.Blocks["uasyncio_create_task"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" create_task");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: create_task(coro) Create a new task from the given coroutine and schedule it to run. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_run"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" run");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: run(coro) Create a new task from the given coroutine and run it until it completes. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_sleep"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" sleep");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: sleep(t) Sleep for block_definitions.js block_definitions_custom.js functions.txt generate-blocks.sh generator_stubs.js generator_stubs_custom.js list.txt listT.txt onlyfunctions.txt tmp.txt toolbox.js toolbox.xml toolbox.xml.sample toolbox_custom.xml seconds (can be a float). ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_sleep_ms"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" sleep_ms");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: sleep_ms(t) Sleep for block_definitions.js block_definitions_custom.js functions.txt generate-blocks.sh generator_stubs.js generator_stubs_custom.js list.txt listT.txt onlyfunctions.txt tmp.txt toolbox.js toolbox.xml toolbox.xml.sample toolbox_custom.xml milliseconds. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_wait_for"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" wait_for");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: wait_for(awaitable, timeout) Wait for the *awaitable* to complete, but cancel it if it takes longer that *timeout* seconds. If *awaitable* is not a task then a task will be ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_gather"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" gather");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(" ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Task.cancel"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Task.cancel");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Task.cancel() Cancel the task by injecting a ``CancelledError`` into it. The task may or may not ignore this exception. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Event.is_set"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Event.is_set");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Event.is_set() Returns ``True`` if the event is set, ``False`` otherwise. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Event.set"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Event.set");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Event.set() Set the event. Any tasks waiting on the event will be scheduled to run. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Event.clear"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Event.clear");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Event.clear() Clear the event. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Event.wait"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Event.wait");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Event.wait() Wait for the event to be set. If the event is already set then it returns immediately. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Lock.locked"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Lock.locked");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Lock.locked() Returns ``True`` if the lock is locked, otherwise ``False``. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Lock.acquire"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Lock.acquire");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Lock.acquire() Wait for the lock to be in the unlocked state and then lock it in an atomic way. Only one task can acquire the lock at any one time. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Lock.release"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Lock.release");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Lock.release() Release the lock. If any tasks are waiting on the lock then the next one in the ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_open_connection"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" open_connection");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: open_connection(host, port) Open a TCP connection to the given *host* and *port*. The *host* address wi ll be ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_start_server"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" start_server");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: start_server(callback, host, port, backlog=5) Start a TCP server on the given *host* and *port*. The *callback* will be called with incoming, accepted connections, and be passed 2 arguments: reade ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Stream.get_extra_info"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" Stream.get_extra_info");
        this.setColour(0);
    this.setOutput(true, null);
 this.setTooltip(".. method:: Stream.get_extra_info(v) Get extra information about the stream, given by *v*. The valid values for *v* are: ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Stream.close"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Stream.close");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Stream.close() Close the stream. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Stream.wait_closed"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Stream.wait_closed");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Stream.wait_closed() Wait for the stream to close. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Stream.read"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" Stream.read");
        this.setColour(0);
    this.setOutput(true, null);
 this.setTooltip(".. method:: Stream.read(n) Read up to block_definitions.js block_definitions_custom.js functions.txt generate-blocks.sh generator_stubs.js generator_stubs_custom.js onlyfunctions.txt bytes and return them. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Stream.readline"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Stream.readline");
    this.setColour(0);
    this.setOutput(true, null);
 this.setTooltip(".. method:: Stream.readline() Read a line and return it. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Stream.write"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" Stream.write");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Stream.write(buf) Accumulated *buf* to the output buffer. The data is only flushed when `Stream.drain` is called. It is recommended to call `Stream.drain` immediat ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Stream.drain"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Stream.drain");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Stream.drain() Drain (write) all buffered output data out to the stream. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Server.close"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Server.close");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Server.close() Close the server. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Server.wait_closed"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Server.wait_closed");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Server.wait_closed() Wait for the server to close. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_get_event_loop"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" get_event_loop");
    this.setColour(0);
    this.setOutput(true, null);
 this.setTooltip(".. function:: get_event_loop() Return the event loop used to schedule and run tasks. See `Loop`. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_new_event_loop"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" new_event_loop");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. function:: new_event_loop() Reset the event loop and return it. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Loop.create_task"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" Loop.create_task");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Loop.create_task(coro) Create a task from the given *coro* and return the new `Task` object. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Loop.run_forever"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Loop.run_forever");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Loop.run_forever() Run the event loop until `stop()` is called. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Loop.run_until_complete"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" Loop.run_until_complete");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Loop.run_until_complete(awaitable) Run the given *awaitable* until it completes. If *awaitable* is not a task then it will be promoted to one. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Loop.stop"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Loop.stop");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Loop.stop() Stop the event loop. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Loop.close"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Loop.close");
    this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Loop.close() Close the event loop. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Loop.set_exception_handler"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" Loop.set_exception_handler");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Loop.set_exception_handler(handler) Set the exception handler to call when a Task raises an exception that is no t ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Loop.get_exception_handler"] = {
  init: function() {
    this.appendDummyInput()
        .appendField(" Loop.get_exception_handler");
    this.setColour(0);
    this.setOutput(true, null);
 this.setTooltip(".. method:: Loop.get_exception_handler() Get the current exception handler. Returns the handler, or ``None`` if no custom handler is set. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Loop.default_exception_handler"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" Loop.default_exception_handler");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Loop.default_exception_handler(context) The default exception handler that is called. ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};



Blockly.Blocks["uasyncio_Loop.call_exception_handler"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" Loop.call_exception_handler");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: Loop.call_exception_handler(context) Call the current exception handler. The argument *context* is passed throug h and ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uasyncio.html");
  }
};




























































































Blockly.Blocks["uos_readblocks"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" readblocks");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: readblocks(block_num, buf, offset) The first form reads aligned, multiples of blocks. Starting at the block given by the index *block_num*, read blocks from ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uos.html");
  }
};






Blockly.Blocks["uos_writeblocks"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" writeblocks");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: writeblocks(block_num, buf, offset) The first form writes aligned, multiples of blocks, and requires that th e ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uos.html");
  }
};



Blockly.Blocks["uos_ioctl"] = {
  init: function() {
  this.appendValueInput("pIn")
        .appendField(" ioctl");
        this.setColour(0);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
 this.setTooltip(".. method:: ioctl(op, arg) Control the block device and query its parameters. The operation to perform is given by *op* which is one of the following integers: ");
 this.setHelpUrl("https://docs.micropython.org/en/latest/library/uos.html");
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

Blockly.Blocks['neopixel_color_colors'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Color")
        .appendField(new Blockly.FieldColour("#ff0000"), "color");
    this.setInputsInline(true);
    this.setOutput(true, null);
    this.setColour("olive");
 this.setTooltip("NeoPixel LED Color");
 this.setHelpUrl("https://bipes.net.br/wp/?page_id=177");
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

Blockly.Blocks['st7789_color_colors'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("ST7789 Color")
        .appendField(new Blockly.FieldColour("#ff0000"), "color");
    this.setInputsInline(true);
    this.setOutput(true, null);
    this.setColour("olive");
 this.setTooltip("ST7789 Color");
 this.setHelpUrl("https://bipes.net.br/wp/?page_id=177");
  }
};







//Sound






// Pololu 3pi+ 2040




// Pololu 3pi+ 2040
Blockly.Python['threepi_set_motor_speeds'] = function(block) {
	var value_lspeed = Blockly.Python.valueToCode(block, 'lspeed', Blockly.Python.ORDER_ATOMIC);
	var value_rspeed = Blockly.Python.valueToCode(block, 'rspeed', Blockly.Python.ORDER_ATOMIC);

	Blockly.Python.definitions_['import_3pirobot'] = 'from pololu_3pi_2040_robot import robot as threepi_robot';
	Blockly.Python.definitions_['make_3pimotors'] = 'threepi_motors = threepi_robot.Motors()';
	var code = 'threepi_motors.set_speeds(' + value_lspeed + "," + value_rspeed + ')\n';
	return code
};

Blockly.Python['threepi_set_motor_left_speed'] = function(block) {
	var value_speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);

	Blockly.Python.definitions_['import_3pirobot'] = 'from pololu_3pi_2040_robot import robot as threepi_robot';
	Blockly.Python.definitions_['make_3pimotors'] = 'threepi_motors = threepi_robot.Motors()';
	var code = 'threepi_motors.set_left_speed(' + value_speed + ')\n';
	return code
};

Blockly.Python['threepi_set_motor_right_speed'] = function(block) {
	var value_speed = Blockly.Python.valueToCode(block, 'speed', Blockly.Python.ORDER_ATOMIC);

	Blockly.Python.definitions_['import_3pirobot'] = 'from pololu_3pi_2040_robot import robot as threepi_robot';
	Blockly.Python.definitions_['make_3pimotors'] = 'threepi_motors = threepi_robot.Motors()';
	var code = 'threepi_motors.set_right_speed(' + value_speed + ')\n';
	return code
};

Blockly.Python['threepi_motors_off'] = function(block) {
	Blockly.Python.definitions_['import_3pirobot'] = 'from pololu_3pi_2040_robot import robot as threepi_robot';
	Blockly.Python.definitions_['make_3pimotors'] = 'threepi_motors = threepi_robot.Motors()';
	var code = 'threepi_motors.off()\n';
	return code
};















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

Blockly.Blocks['cell_value'] = {
  init: function() {
    this.appendValueInput("value")
        .setCheck(null)
        .appendField("Cell");
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
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



Blockly.Blocks['http_get_status'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(MSG["net_http_get_status"])
        .appendField(new Blockly.FieldVariable("request"), "request");
    this.setOutput(true, null);
    this.setColour(230);
 this.setTooltip("Status code of the HTTP GET request");
 this.setHelpUrl("bipes.net.br");
  }
};

Blockly.Blocks['http_get_content'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(MSG["net_http_get_content"])
        .appendField(new Blockly.FieldVariable("request"), "request");
    this.setOutput(true, null);
    this.setColour(230);
 this.setTooltip("Content of HTTP GET request");
 this.setHelpUrl("bipes.net.br");
  }
};

//BMP180
//BMP280
Blockly.Blocks['bmp280_altitude'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(MSG["altitude"]);
    this.setOutput(true, null);
    this.setColour(230);
 this.setTooltip("Altitude from the BMP280 sensor");
 this.setHelpUrl("http://www.bipes.net.br");
  }
};

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

Blockly.Blocks['gps_get_datetime'] = {
  init: function() {
    this.setColour(135);
    this.appendDummyInput()
        .appendField("GPS Date and Time");

    this.setOutput(true);

    this.setTooltip('');
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

Blockly.Blocks['show_received_data'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("dados recebidos BLE (received_data)");
    this.setOutput(true, "String");
    this.setColour(230);
    this.setTooltip("Retorna os dados recebidos via BLE");
    this.setHelpUrl("");
  }
};



