// Variables
let audioContext;
let recorder;
let audioArray = [];
let recording = false;
let windowLength = 88200; // 2 seconds of data (44100 Hz * 2)
let bufferLength = 2048; // Size of each audio buffer

// Button Elements
const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');

// Start recording when button is clicked
startRecordBtn.addEventListener('click', startRecording);

// Stop recording when button is clicked
stopRecordBtn.addEventListener('click', stopRecording);

// Function to start recording
async function startRecording() {
    startRecordBtn.disabled = true;
    stopRecordBtn.disabled = false;
    audioArray = []; // Reset the array before starting

    // Initialize AudioContext
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Set up audio input and create recorder
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaStreamSource = audioContext.createMediaStreamSource(stream);
    recorder = audioContext.createScriptProcessor(bufferLength, 1, 1);

    // Connect the media source to the recorder
    mediaStreamSource.connect(recorder);
    recorder.connect(audioContext.destination);

    // Set up the recorder to capture audio data
    recorder.onaudioprocess = function(event) {
        if (recording) {
            const inputData = event.inputBuffer.getChannelData(0);
            audioArray.push(...inputData);

            // Keep only the most recent 2 seconds (88200 samples)
            if (audioArray.length > windowLength) {
                audioArray.splice(0, audioArray.length - windowLength); // Remove older data
            }

            // Plot the audio waveform
            plotWaveform(audioArray);
        }
    };

    // Recording will continue indefinitely until stopRecording is called
    recording = true;
}

// Function to stop recording
function stopRecording() {
    recording = false;
    stopRecordBtn.disabled = true;
    startRecordBtn.disabled = false;

    // Log the length of the audio data array to the console
    console.log('Length of the audio array: ', audioArray.length);
    
    // Convert the audio data to WAV format
    const wavData = encodeWAV(audioArray, audioContext.sampleRate);

    // Create a Blob from the WAV data and create a download link
    const audioBlob = new Blob([wavData], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = audioUrl;
    downloadLink.style.display = 'inline-block';
}

// Function to encode the audio data to WAV format
function encodeWAV(audioData, sampleRate) {
    const bufferLength = audioData.length;
    const buffer = new ArrayBuffer(44 + bufferLength * 2);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + bufferLength * 2, true); // file size
    writeString(view, 8, 'WAVE');
    
    // fmt chunk
    writeString(view, 12, 'fmt '); 
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, 1, true); // number of channels (1 = mono)
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * channels * bitsPerSample / 8)
    view.setUint16(32, 2, true); // block align (channels * bitsPerSample / 8)
    view.setUint16(34, 16, true); // bits per sample

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, bufferLength * 2, true); // data size

    // Write audio data
    let offset = 44;
    for (let i = 0; i < bufferLength; i++) {
        view.setInt16(offset, audioData[i] * 32767, true); // convert to 16-bit PCM
        offset += 2;
    }

    return new Uint8Array(buffer);
}

// Helper function to write strings to the DataView
function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

// Function to plot the waveform with a stationary x-axis
function plotWaveform(audioData) {
    // Make sure to only keep the most recent 88,200 samples
    const dataToPlot = audioData.slice(Math.max(audioData.length - windowLength, 0));

    // Define the x values as fixed, corresponding to 88,200 data points
    const xValues = Array.from({ length: windowLength }, (_, i) => i);

    // Update the plot with the new data
    const trace = {
        x: xValues,  // Fixed x values
        y: dataToPlot,
        type: 'scatter',
        mode: 'lines',
        line: { color: 'rgb(0, 0, 255)' }
    };

    const layout = {
        title: 'Real-Time Audio Waveform',
        xaxis: {
            title: 'Sample Index',
            range: [0, windowLength - 1],  // Fixed x-axis range for 88,200 data points
            showticklabels: true,
            dtick: windowLength / 10  // Display ticks for better readability
        },
        yaxis: {
            title: 'Amplitude',
            range: [-0.2, 0.2]  // The amplitude range for audio signals
        }
    };

    // Replot the waveform
    Plotly.react('graph', [trace], layout);
}
