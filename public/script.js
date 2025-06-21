const App = () => {
	const visualizerRef = React.useRef(null);
	const [images, setImages] = React.useState([]);
	const [lastImageUrl, setLastImageUrl] = React.useState(null);
	const lastImageUrlRef = React.useRef();
	lastImageUrlRef.current = lastImageUrl;
	const [audios, setAudios] = React.useState([]);
	const [isGenerating, setIsGenerating] = React.useState(false);

	const fns = React.useMemo(() => ({
		getPageHTML: {
			description: 'Gets the HTML for the current page',
			fn: () => {
				return { success: true, html: document.documentElement.outerHTML };
			}
		},
		changeBackgroundColor: {
			description: 'Changes the background color of a web page',
			examplePrompt: 'Change the background to the color of the sky',
			parameters: {
				type: 'object',
				properties: {
					color: { type: 'string', description: 'A hex value of the color' },
				},
			},
			fn: ({ color }) => {
				document.documentElement.style.setProperty('--background-color', color);
				return { success: true, color };
			}
		},
		changeTextColor: {
			description: 'Changes the text color of a web page',
			examplePrompt: 'Change the text to the color of a polar bear',
			parameters: {
				type: 'object',
				properties: {
					color: { type: 'string', description: 'A hex value of the color' },
				},
			},
			fn: ({ color }) => {
				document.documentElement.style.setProperty('--text-color', color);
				return { success: true, color };
			}
		},
		generateImage: {
			description: 'Generates an image and displays it on the page',
			examplePrompt: 'Make a linocut of a raccoon wearing spectacles',
			parameters: {
				type: 'object',
				properties: {
					prompt: { type: 'string', description: 'Text description of the image to generate' }
				}
			},
			fn: async ({ prompt }) => {
				console.log('generateImage', prompt);
				setIsGenerating(true);
				try {
					const imageUrl = await fetch('/generate-image', {
						method: 'POST',
						body: prompt,
					}).then((r) => r.text());

					console.log('imageUrl', imageUrl);
					
					setLastImageUrl(imageUrl);
					setImages(prevImages => [imageUrl, ...prevImages]);

					return { success: true, imageUrl };
				} finally {
					setIsGenerating(false);
				}
			}
		},
		editImage: {
			description: 'Edits an existing image based on a prompt and the last generated image',
			examplePrompt: 'Put a beanie on the raccoon',
			parameters: {
				type: 'object',
				properties: {
					prompt: { type: 'string', description: 'Text description of how to edit the image' }
				}
			},
			fn: async ({ prompt }) => {
				if (!lastImageUrlRef.current) {
					return { success: false, error: 'No image to edit. Please generate an image first.' };
				}
				console.log('editImage', prompt, lastImageUrlRef.current);
				setIsGenerating(true);
				try {
					const imageUrl = await fetch('/edit-image', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ prompt, imageUrl: lastImageUrlRef.current }),
					}).then((r) => r.text());

					console.log('new imageUrl', imageUrl);
					
					setImages(prevImages => [imageUrl, ...prevImages]);

					return { success: true, imageUrl };
				} finally {
					setIsGenerating(false);
				}
			}
		}
	}), []);

	const tools = React.useMemo(() => Object.entries(fns).map(([name, { fn, examplePrompt, ...tool }]) => ({
		type: 'function',
		name,
		...tool
	})), [fns]);

	React.useEffect(() => {
		console.log('tools', tools);

		const peerConnection = new RTCPeerConnection();

		peerConnection.ontrack = (event) => {
			const stream = event.streams[0];
			setAudios(prevAudios => [...prevAudios, stream]);
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
			if (msg.type === 'response.function_call_arguments.done') {
				const { fn } = fns[msg.name];
				if (fn !== undefined) {
					console.log(`Calling local function ${msg.name} with ${msg.arguments}`);
					const args = JSON.parse(msg.arguments);
					const result = await fn(args);
					console.log('result', result);
					const event = {
						type: 'conversation.item.create',
						item: {
							type: 'function_call_output',
							call_id: msg.call_id,
							output: JSON.stringify(result),
						},
					};
					dataChannel.send(JSON.stringify(event));
				}
			}
		});

		function visualize(stream) {
			const canvas = visualizerRef.current;
			if (!canvas) return;
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
				canvasCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background-color') || 'rgb(243 244 246)';
				canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
				canvasCtx.lineWidth = 2;
				canvasCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || 'rgb(17 24 39)';
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

		navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
			visualize(stream);
			stream.getTracks().forEach((track) => peerConnection.addTransceiver(track, { direction: 'sendrecv' }));

			peerConnection.createOffer().then((offer) => {
				peerConnection.setLocalDescription(offer);

				fetch('/rtc-connect', {
					method: 'POST',
					body: offer.sdp,
					headers: {
						'Content-Type': 'application/sdp',
					},
				})
					.then((r) => r.text())
					.then((answer) => {
						peerConnection.setRemoteDescription({
							sdp: answer,
							type: 'answer',
						});
					});
			});
		});

	}, [tools, fns]);
	
	const Audio = ({ stream }) => {
		const ref = React.useRef(null);
		React.useEffect(() => {
			if (ref.current) {
				ref.current.srcObject = stream;
			}
		}, [stream]);
		return (
			<div className="flex">
				<audio ref={ref} autoPlay controls />
			</div>
		);
	};

	return (
		<>
			<div className="max-w-3xl mx-auto px-6 py-12">
				<h1 className="text-6xl font-bold mb-8">Realtime Kontext</h1>
				<p className="text-3xl mb-4">
					Create and edit images with your voice.
				</p>
				<p className="text-sm opacity-50 mt-12">Try saying these commands:</p>
				<div className="space-y-12 mb-16 mt-12">
					{Object.values(fns).filter(fn => fn.examplePrompt).map(({ examplePrompt }) => (
						<blockquote key={examplePrompt} className="text-xl border-l-4 pl-4 italic">"{examplePrompt}"</blockquote>
					))}
				</div>
				<canvas ref={visualizerRef} className="visualizer-canvas w-full h-40 border rounded-lg mb-8"></canvas>
				<div className="space-y-8">
					{audios.map((stream, index) => (
						<Audio key={index} stream={stream} />
					))}
				</div>
				{isGenerating && <Spinner />}
				<div className="space-y-8">
					{images.map((imageUrl, index) => (
						<img key={index} src={imageUrl} style={{ maxWidth: '100%' }} />
					))}
				</div>
			</div>

			<footer className="max-w-3xl mx-auto px-6 py-8 opacity-70">
				<p>
					This is a realtime demo of voice-powered function calling
					using <a href="https://developers.cloudflare.com" className="underline">Cloudflare Workers</a>, <a href="https://replicate.com" className="underline">Replicate</a>, and the <a href="https://platform.openai.com/docs/api-reference/realtime" className="underline">OpenAI Realtime API</a>. It generates images using <a href="https://replicate.com/black-forest-labs/flux-schnell" className="underline">Flux Schnell</a> and edits them using <a href="https://replicate.com/black-forest-labs/flux-kontext-pro" className="underline">Flux Kontext Pro</a>.
				</p>
				<p className="mt-4">
					Check out the <a href="https://github.com/replicate/getting-started-with-openai-realtime-api" className="underline">code</a>.
				</p>
			</footer>
		</>
	);
};

const Spinner = () => (
	<div className="flex justify-center items-center my-8">
		<svg className="animate-spin h-10 w-10 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
			<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
			<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
	</div>
);

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
