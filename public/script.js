const fns = {
	getPageHTML: {
		description: 'Gets the HTML for the current page',
		fn: () => {
			return { success: true, html: document.documentElement.outerHTML };
		}
	},
	changeBackgroundColor: {
		description: 'Changes the background color of a web page',
		parameters: {
			type: 'object',
			properties: {
				color: { type: 'string', description: 'A hex value of the color' },
			},
		},
		fn: ({ color }) => {
			document.body.style.backgroundColor = color;
			return { success: true, color };
		}
	},
	changeTextColor: {
		description: 'Changes the text color of a web page',
		parameters: {
			type: 'object',
			properties: {
				color: { type: 'string', description: 'A hex value of the color' },
			},
		},
		fn: ({ color }) => {
			document.body.style.color = color;
			return { success: true, color };
		}
	},
	generateImage: {
		description: 'Generates an image using AI and displays it on the page',
		parameters: {
			type: 'object',
			properties: {
				prompt: { type: 'string', description: 'Text description of the image to generate' }
			}
		},
		fn: async ({ prompt }) => {
			console.log('generateImage', prompt);
			const imageUrl = await fetch('/generate-image', {
				method: 'POST',
				body: prompt,
			}).then((r) => r.text());

			console.log('imageUrl', imageUrl);
			
			// append the image to the page
			const img = document.createElement('img');
			img.src = imageUrl;
			img.style.maxWidth = '100%';
			const container = document.getElementById('image-container');
			container.prepend(img);

			return { success: true, imageUrl };
		}
	}
};

// Massage the functions object into the format expected by the OpenAI API
// Removing the fn property from the object
const tools = Object.entries(fns).map(([name, { fn, ...tool }]) => ({
	type: 'function',
	name,
	...tool
}));


console.log('tools', tools);

// Create a WebRTC Agent
const peerConnection = new RTCPeerConnection();

// On inbound audio add to page
peerConnection.ontrack = (event) => {
	const el = document.createElement('audio');
	el.srcObject = event.streams[0];
	el.autoplay = el.controls = true;
	const container = document.getElementById('audio-container');
	container.appendChild(el);
};

const dataChannel = peerConnection.createDataChannel('response');

function configureData() {
	console.log('Configuring data channel');
	const event = {
		type: 'session.update',
		session: {
			modalities: ['text', 'audio'],
			tools
		},
	};
	dataChannel.send(JSON.stringify(event));
}

dataChannel.addEventListener('open', (ev) => {
	console.log('Opening data channel', ev);
	configureData();
});

dataChannel.addEventListener('message', async (ev) => {
	const msg = JSON.parse(ev.data);
	// Handle function calls
	if (msg.type === 'response.function_call_arguments.done') {
		const { fn } = fns[msg.name];
		if (fn !== undefined) {
			console.log(`Calling local function ${msg.name} with ${msg.arguments}`);
			const args = JSON.parse(msg.arguments);
			const result = await fn(args);
			console.log('result', result);
			// Let OpenAI know that the function has been called and share it's output
			const event = {
				type: 'conversation.item.create',
				item: {
					type: 'function_call_output',
					call_id: msg.call_id, // call_id from the function_call message
					output: JSON.stringify(result), // result of the function
				},
			};
			dataChannel.send(JSON.stringify(event));
		}
	}
});

function visualize(stream) {
	const canvas = document.getElementById('visualizer');
	const canvasCtx = canvas.getContext('2d');

	const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	const source = audioCtx.createMediaStreamSource(stream);
	const analyser = audioCtx.createAnalyser();
	analyser.fftSize = 2048;
	source.connect(analyser);

	const bufferLength = analyser.frequencyBinCount;
	const dataArray = new Uint8Array(bufferLength);

	canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

	function draw() {
		requestAnimationFrame(draw);

		analyser.getByteTimeDomainData(dataArray);

		canvasCtx.fillStyle = 'rgb(243 244 246)'; // bg-gray-50
		canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

		canvasCtx.lineWidth = 2;
		canvasCtx.strokeStyle = 'rgb(17 24 39)'; // text-gray-900

		canvasCtx.beginPath();

		const sliceWidth = canvas.width * 1.0 / bufferLength;
		let x = 0;

		for(let i = 0; i < bufferLength; i++) {
			const v = dataArray[i] / 128.0;
			const y = v * canvas.height/2;

			if(i === 0) {
				canvasCtx.moveTo(x, y);
			} else {
				canvasCtx.lineTo(x, y);
			}

			x += sliceWidth;
		}

		canvasCtx.lineTo(canvas.width, canvas.height/2);
		canvasCtx.stroke();
	};

	draw();
}

// Capture microphone
navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
	visualize(stream);
	// Add microphone to PeerConnection
	stream.getTracks().forEach((track) => peerConnection.addTransceiver(track, { direction: 'sendrecv' }));

	peerConnection.createOffer().then((offer) => {
		peerConnection.setLocalDescription(offer);

		// Send WebRTC Offer to Workers Realtime WebRTC API Relay
		fetch('/rtc-connect', {
			method: 'POST',
			body: offer.sdp,
			headers: {
				'Content-Type': 'application/sdp',
			},
		})
			.then((r) => r.text())
			.then((answer) => {
				// Accept answer from Realtime WebRTC API
				peerConnection.setRemoteDescription({
					sdp: answer,
					type: 'answer',
				});
			});
	});
});
