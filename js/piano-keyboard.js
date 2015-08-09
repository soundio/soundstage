(function(window){

	var MidiKeyboard = (function() {
		var self;

		function MidiKeyboard(channel) {
			this.channel = channel || 1;
			this.keyMap = {};
			this.startTime = undefined;

			this.regNumber = 60;
			this.regNumberStep = 1;
			this._register = false;
			this._trigger = true;
			this._verbose = true;

			document.onkeydown = onKeyDown;
			document.onkeyup = onKeyUp;
			self = this;
		}

		function onKeyDown(event) {
	    event = event || window.event;
	    key = event.which || event.keyCode;

	    // SPACE
	    if (key === 32){
	    	self._register = !self._register;
	    	self.startTime = +(new Date());
	    }

	    // UP
	    if (key === 38){
	    	self.regNumber += self.regNumberStep;
	    	console.log('frequency now is ' + self.regNumber);
	    	return;
	    }

	    // DOWN
	    if (key === 40){
	    	self.regNumber -= self.regNumberStep;
	    	console.log('frequency now is ' + self.regNumber);
	    	return;
	    }

	    // we need to register the keys
	    if (self._register){
	    	console.log('Register ' + key + ' for frequency ' + self.regNumber);
	    	self.keyMap[key] = self.regNumber;
	    	self.regNumber += self.regNumberStep;
	    	event.preventDefault();
	    }
	    
	    // now we can play
	    if (!self._register && self.keyMap.hasOwnProperty(key)){
	    	self.pressed(event.timeStamp, 'noteon', self.keyMap[key]);
	    	event.preventDefault();
	    }
		}

		function onKeyUp(event) {
			event = event || window.event;
	    key = event.which || event.keyCode;

			if (!self._register && self.keyMap.hasOwnProperty(key)){
				self.pressed(event.timeStamp, 'noteoff', self.keyMap[key]);
	    	event.preventDefault();
	    }
		}

		MidiKeyboard.prototype.registerKeys = function(){
	  	console.log("Please register your keys. Press SPACE when you are finished! You can use UP and DOWN to increment or 	decrement the frequency.");

	  	this._register = true;
		}

		MidiKeyboard.prototype.pressed = function(time, type, number, velocity){
	  	velocity = velocity || 127;
	  	var diffTime = (time - this.startTime);
	  	var midiNumber = MIDI.typeToNumber(this.channel, type);
	  	
	  	// Play the note in the oscillator
	  	//window.osc.trigger(0, type, number, velocity);

	  	if (this._trigger) {
		  	MIDI.trigger([midiNumber, number, velocity]);
	  	}
	  }

	  if (this._verbose) {
		  MIDI.on(function(data, time){
		  	console.log(data, time);
		  });
		}

		return MidiKeyboard;
	})();

	// Create a new MIDIKeyboard
	var keyboard = new MidiKeyboard();

	// Enable registering of keys
	//keyboard.registerKeys();

	window.keyboard = keyboard;
})(window)