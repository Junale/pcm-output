# pcm-output

`@junale/pcm-output` is a small Bun library for sending PCM audio samples to the system playback device.
It provides a simple TypeScript API backed by a native audio implementation.

`AudioOutput.write()` accepts interleaved `Float32Array` samples and blocks until
the samples fit in the native ring buffer. The miniaudio callback never waits;
if the producer falls behind, it fills the missing samples with silence.
Call `close()` after stopping the producer. A write must not run concurrently
with `close()`.

## Context

```mermaid
architecture-beta
	service bunApp(server)[Bun application]
	service pcmOutput(server)[pcm-output]
	service playbackDevice(server)[Playback device]

	bunApp:R --> L:pcmOutput
	pcmOutput:R --> L:playbackDevice
```
