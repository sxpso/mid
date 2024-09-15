/*
 * Circular Web Audio Buffer Queue
 */
function CircularAudioBuffer(slots, audioCtx) {
	slots = slots || 24; // number of buffers
	this.slots = slots;
	this.buffers = new Array(slots);

	this.reset();

	for (var i = 0; i < slots; i++) {
		var buffer = audioCtx.createBuffer(channels, BUFFER, SAMPLE_RATE);
		this.buffers[i] = buffer;
	}
}

// pseudo empty all buffers
CircularAudioBuffer.prototype.reset = function() {
	this.used = 0;
	this.filled = 0;
};

// returns number of buffers that are filled
CircularAudioBuffer.prototype.filledBuffers = function() {
	var fills = this.filled - this.used;
	if (fills < 0) fills += this.slots;
	return fills;
}

// returns whether buffers are all filled
CircularAudioBuffer.prototype.full = function() {
	return this.filledBuffers() >= this.slots - 1;
}

// returns a reference to next available buffer to be filled
CircularAudioBuffer.prototype.prepare = function() {
	if (this.full()) {
		console.log('buffers full!!')
		return
	}
	var buffer = this.buffers[this.filled++];
	this.filled %= this.slots;
	return buffer;
}

// returns the next buffer in the queue
CircularAudioBuffer.prototype.use = function() {
	if (!this.filledBuffers()) return;
	var buffer = this.buffers[this.used++];
	this.used %= this.slots;
	return buffer;
}


/*
 * Web Audio Stuff
 */

var SAMPLE_RATE = 48000;
var BUFFER = 4096; // buffer sample
var channels = 2;

// Create AudioContext and buffer source
var audioCtx;
var source;
var scriptNode;
var circularBuffer;
var emptyBuffer;
var audioIsInitted = false;

function initAudio() {
    audioCtx = new window.AudioContext({sampleRate:SAMPLE_RATE});
    scriptNode = audioCtx.createScriptProcessor(BUFFER, 0, channels);
    scriptNode.onaudioprocess = onAudioProcess;

    source = audioCtx.createBufferSource();
    circularBuffer = new CircularAudioBuffer(4, audioCtx);
    emptyBuffer = audioCtx.createBuffer(channels, BUFFER, SAMPLE_RATE);

    source.connect(scriptNode);
    source.start(0);
}


function startAudio() {
	scriptNode.connect(audioCtx.destination);
}

function pauseAudio() {
	scriptNode.disconnect();
}

// Give the node a function to process audio events
function onAudioProcess(audioProcessingEvent) {
	var generated = circularBuffer.use();

	if (!generated && pauseAudioAfterDrainingBuffer) {
		// wait for remaining buffer to drain before disconnect audio
		pauseAudio();
		pauseAudioAfterDrainingBuffer = false;
		signalStop = 0;
		if (callbackOnStop) callbackOnStop();
		callbackOnStop = null;
		return;
	}
	if (!generated) {
		console.log('buffer under run!!')
		generated = emptyBuffer;
	}

	var outputBuffer = audioProcessingEvent.outputBuffer;
	var offset = 0;
	outputBuffer.copyToChannel(generated.getChannelData(0), 0, offset);
	outputBuffer.copyToChannel(generated.getChannelData(1), 1, offset);
}

/*
// debugging stats
setInterval(function() {
	console.log('audio queue', circularBuffer.filledBuffers());
}, 5000);
*/
