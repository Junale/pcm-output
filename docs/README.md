# pcm-output

`@junale/pcm-output` is a small Bun library for sending PCM audio samples to the system playback device.
It provides a simple TypeScript API backed by a native audio implementation.

## Context

```mermaid
architecture-beta
	service bunApp(server)[Bun application]
	service pcmOutput(server)[pcm-output]
	service playbackDevice(server)[Playback device]

	bunApp:R --> L:pcmOutput
	pcmOutput:R --> L:playbackDevice
```
