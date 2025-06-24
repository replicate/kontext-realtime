const App = () => {
	const visualizerRef = React.useRef(null);
	const [images, setImages] = React.useState([]);
	const [lastImageUrl, setLastImageUrl] = React.useState(null);
	const lastImageUrlRef = React.useRef();
	lastImageUrlRef.current = lastImageUrl;
	const [audios, setAudios] = React.useState([]);
	const [isGenerating, setIsGenerating] = React.useState(false);
	const [isWebcamOpen, setIsWebcamOpen] = React.useState(false);
	const isWebcamOpenRef = React.useRef(isWebcamOpen);
	const [isCommandsOpen, setIsCommandsOpen] = React.useState(() => {
		const stored = localStorage.getItem('isCommandsOpen');
		return stored !== null ? JSON.parse(stored) : true;
	});

	// Highlighted functions state
	const [highlightedFunctions, setHighlightedFunctions] = React.useState({});
	const highlightTimeouts = React.useRef({});

	React.useEffect(() => {
		localStorage.setItem('isCommandsOpen', JSON.stringify(isCommandsOpen));
	}, [isCommandsOpen]);

	React.useEffect(() => { isWebcamOpenRef.current = isWebcamOpen; }, [isWebcamOpen]);

	const handleNewImage = (imageUrl) => {
		setLastImageUrl(imageUrl);
		setImages(prevImages => [imageUrl, ...prevImages]);
		setIsWebcamOpen(false);
	};

	const fns = React.useMemo(() => ({
		showWebcam: {
			description: 'Show the webcam',
			examplePrompt: 'Show me the webcam',
			parameters: {
				type: 'object',
				properties: {}
			},
			fn: () => {
				console.log('show');
				setIsWebcamOpen(true);
				return { success: true, message: 'Webcam opened.' };
			}
		},
		captureWebcam: {
			description: 'Capture a photo from the webcam if it is open',
			examplePrompt: 'Snap a photo now',
			parameters: {
				type: 'object',
				properties: {}
			},
			fn: async () => {
				if (!isWebcamOpenRef.current) {
					return { success: false, error: 'Webcam is not open.' };
				}
				// Find the capture button in the WebcamCapture component and click it
				const captureButton = Array.from(document.querySelectorAll('button')).find(
					btn => btn.textContent && btn.textContent.trim().toLowerCase() === 'capture'
				);
				if (captureButton) {
					captureButton.click();
					return { success: true, message: 'Capture button clicked.' };
				} else {
					return { success: false, error: 'Capture button not found.' };
				}
			}
		},
		createImage: {
			description: 'Generate an image and display it on the page',
			examplePrompt: 'Make a linocut of a raccoon wearing spectacles',
			parameters: {
				type: 'object',
				properties: {
					prompt: { type: 'string', description: 'Text description of the image to generate' }
				}
			},
			fn: async ({ prompt }) => {
				console.log('createImage', prompt);
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
			description: 'Edit the last generated image based on a text prompt',
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
					
					setLastImageUrl(imageUrl);
					setImages(prevImages => [imageUrl, ...prevImages]);

					return { success: true, imageUrl };
				} finally {
					setIsGenerating(false);
				}
			},
		},
		enhanceImage: {
			description: 'Upscale the last generated image to a higher resolution',
			examplePrompt: 'Enhance!',
			parameters: {
				type: 'object',
				properties: {},
			},
			fn: async () => {
				if (!lastImageUrlRef.current) {
					return { success: false, error: 'No image to enhance. Please generate an image first.' };
				}
				setIsGenerating(true);
				try {
					const imageUrl = await fetch('/enhance-image', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ imageUrl: lastImageUrlRef.current }),
					}).then((r) => r.text());

					setLastImageUrl(imageUrl);
					setImages(prevImages => [imageUrl, ...prevImages]);
					return { success: true, imageUrl };
				} finally {
					setIsGenerating(false);
				}
			},
		},
		changeBackgroundColor: {
			description: 'Changes the background color of the page',
			examplePrompt: 'Change the background to the color of the sky',
			hideFromCommands: true,
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
			description: 'Change the text color of the page',
			examplePrompt: 'Change the text to the color of a polar bear',
			hideFromCommands: true,
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
		undo: {
			description: 'Removes the last image from the page',
			examplePrompt: 'Undo the last image so you can try again',
			parameters: {
				type: 'object',
				properties: {}
			},
			fn: () => {
				setImages(prevImages => {
					const newImages = prevImages.slice(1);
					setLastImageUrl(newImages[0] || null);
					return newImages;
				});
				return { success: true };
			}
		},
		startOver: {
			description: 'Removes all images from the page',
			examplePrompt: 'Start over',
			parameters: {
				type: 'object',
				properties: {}
			},
			fn: () => {
				setImages([]);
				setLastImageUrl(null);
				return { success: true };
			}
		},
	}), []);

	const tools = React.useMemo(() => Object.entries(fns).map(([name, { fn, examplePrompt, hideFromCommands, ...tool }]) => ({
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

					// Highlight as 'active' while running
					setHighlightedFunctions(prev => ({ ...prev, [msg.name]: 'active' }));
					if (highlightTimeouts.current[msg.name]) {
						clearTimeout(highlightTimeouts.current[msg.name]);
						delete highlightTimeouts.current[msg.name];
					}

					const result = await fn(args);
					console.log('result', result);

					// On function completion, set to 'fading', then remove after 0.5s
					setHighlightedFunctions(prev => ({ ...prev, [msg.name]: 'fading' }));
					highlightTimeouts.current[msg.name] = setTimeout(() => {
						setHighlightedFunctions(prev => {
							const updated = { ...prev };
							delete updated[msg.name];
							return updated;
						});
						delete highlightTimeouts.current[msg.name];
					}, 500);

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

				const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || 'rgb(17, 24, 39)';
				const rgb = textColor.match(/\d+/g);
				let r = 17, g = 24, b = 39;
				if (rgb && rgb.length >= 3) {
					[r, g, b] = rgb.map(Number);
				}
				
				const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
				gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
				gradient.addColorStop(0.1, `rgba(${r}, ${g}, ${b}, 1)`);
				gradient.addColorStop(0.9, `rgba(${r}, ${g}, ${b}, 1)`);
				gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
				canvasCtx.strokeStyle = gradient;

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
					.then(async (r) => {
						if (!r.ok) {
							const errorData = await r.json();
							throw new Error(errorData.error || `Server error: ${r.status}`);
						}
						
						const contentType = r.headers.get('content-type');
						if (contentType && contentType.includes('application/json')) {
							const errorData = await r.json();
							throw new Error(errorData.error || 'Server returned JSON instead of SDP');
						}
						
						return r.text();
					})
					.then((answer) => {
						peerConnection.setRemoteDescription({
							sdp: answer,
							type: 'answer',
						});
					})
					.catch((error) => {
						console.error('RTC connection failed:', error);
						alert(`Failed to connect: ${error.message}`);
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
			<div className="max-w-6xl mx-auto px-4 py-12">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-12">
					{/* Left Column */}
					<div>
						<h1 className="text-8xl font-bold mb-8">Kontext<br />Realtime</h1>		
						<p className="text-3xl mb-8">
							Create and edit images using voice commands
						</p>
						<canvas ref={visualizerRef} className="visualizer-canvas w-full h-40 my-8"></canvas>
						<h2 className="text-2xl font-bold opacity-30 cursor-pointer" onClick={() => setIsCommandsOpen(!isCommandsOpen)}>
							Commands {isCommandsOpen ? '▾' : '▸'}
						</h2>
						{isCommandsOpen && (
							<div className="space-y-3 mb-16 mt-8 text-base">
								{Object.entries(fns)
									.filter(([_, { hideFromCommands }]) => !hideFromCommands)
									.map(([name, { description, examplePrompt }]) => (
										<div
											key={name}
											className={`py-2 px-0 text-sm flex items-start transition-all duration-300 ${
												highlightedFunctions[name] === 'active' || highlightedFunctions[name] === 'fading'
													? 'pl-7'
													: 'pl-0'
											}`}
											style={{ minHeight: 32 }}
										>
											<span
												className={`absolute transition-opacity duration-300 ${
													highlightedFunctions[name] === 'active' ? 'opacity-100' : 'opacity-0'
												}`}
												style={{ marginLeft: '-28px', marginTop: '2px' }}
											>
												{highlightedFunctions[name] === 'active' && <GreenSpinner />}
											</span>
											<div className="flex flex-col">
												<h3 className="font-mono font-bold text-base m-0 p-0 leading-tight">{name}</h3>
												<p className="opacity-80 text-sm m-0 p-0 leading-tight mt-1">{description}</p>
												<blockquote className="mt-1 border-l-4 pl-4 italic opacity-60 text-xs leading-tight">
													"{examplePrompt}"
												</blockquote>
											</div>
										</div>
									))}
							</div>
						)}
						<div className="fixed bottom-8 right-8 flex flex-col space-y-2">
							{audios.map((stream, index) => (
								<Audio key={index} stream={stream} />
							))}
						</div>
						<footer className="py-8 opacity-70 mt-12">
							<p>
								This is a realtime demo of voice-powered function calling
								using <a href="https://developers.cloudflare.com" className="underline">Cloudflare Workers</a>, <a href="https://replicate.com" className="underline">Replicate</a>, and the <a href="https://platform.openai.com/docs/api-reference/realtime" className="underline">OpenAI Realtime API</a>. It generates images using <a href="https://replicate.com/black-forest-labs/flux-schnell" className="underline">Flux Schnell</a> and edits them using <a href="https://replicate.com/black-forest-labs/flux-kontext-pro" className="underline">Flux Kontext Pro</a>.
							</p>
							<p className="mt-4">
								Check out the <a href="https://github.com/zeke/kontext-realtime/" className="underline">code</a>.
							</p>
						</footer>
					</div>
					{/* Right Column */}
					<div>
						<div className="space-y-8">
							{isGenerating && <Spinner />}
							{isWebcamOpen && <WebcamCapture onCapture={handleNewImage} onClose={() => setIsWebcamOpen(false)} />}
							{images.map((imageUrl, index) => (
								<img key={index} src={imageUrl} style={{ maxWidth: '100%' }} />
							))}
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

const WebcamCapture = ({ onCapture, onClose }) => {
	const videoRef = React.useRef(null);
	const canvasRef = React.useRef(null);

	React.useEffect(() => {
		const video = videoRef.current;
		let stream;
		if (video) {
			navigator.mediaDevices.getUserMedia({ video: true })
				.then(s => {
					stream = s;
					video.srcObject = stream;
				})
				.catch(err => {
					console.error("Error accessing webcam:", err);
					onClose();
				});
		}

		return () => {
			if (stream) {
				stream.getTracks().forEach(track => track.stop());
			}
		};
	}, []);

	const handleCapture = () => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (video && canvas) {
			const context = canvas.getContext('2d');
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
			const dataUrl = canvas.toDataURL('image/png');
			onCapture(dataUrl);
		}
	};

	return (
		<div className="bg-white p-4 rounded-lg shadow-lg text-black border w-full max-w-xl mx-auto">
			<video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded"></video>
			<canvas ref={canvasRef} className="hidden"></canvas>
			<div className="mt-4 flex justify-between">
				<button onClick={handleCapture} className="px-4 py-2 bg-stone-900 text-white rounded">Capture</button>
				<button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Close</button>
			</div>
		</div>
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

const GreenSpinner = () => {
	// Use current text color from CSS variable
	const color = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#22c55e';
	return (
		<span className="inline-flex items-center justify-center mr-2 align-middle" style={{ width: 18, height: 18 }}>
			<svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
				<circle
					cx="8"
					cy="8"
					r="7"
					stroke={color}
					strokeWidth="3"
					strokeDasharray="34"
					strokeDashoffset="0"
					style={{ opacity: 0.25 }}
				/>
				<path
					d="M8 1a7 7 0 0 1 7 7"
					stroke={color}
					strokeWidth="3"
					strokeLinecap="round"
					style={{ opacity: 0.85 }}
				/>
			</svg>
		</span>
	);
};

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
