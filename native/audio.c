#define MINIAUDIO_IMPLEMENTATION
#include "miniaudio.h"

#include <stdatomic.h>
#include <stdbool.h>
#include <stdint.h>

#define RING_CAPACITY 16384u
#define RING_MASK (RING_CAPACITY - 1u)

typedef struct {
	float data[RING_CAPACITY];
	_Atomic uint32_t head;
	_Atomic uint32_t tail;
} AudioRingBuffer;

static AudioRingBuffer ring;
static ma_device device;
static _Atomic bool running = false;
static uint32_t device_channels;
static bool device_initialized;

static void ring_init(void)
{
	atomic_init(&ring.head, 0);
	atomic_init(&ring.tail, 0);
}

static uint32_t ring_read(float *output, uint32_t requested)
{
	uint32_t head = atomic_load_explicit(&ring.head, memory_order_relaxed);
	uint32_t tail = atomic_load_explicit(&ring.tail, memory_order_acquire);
	uint32_t available = tail - head;
	uint32_t count = requested < available ? requested : available;

	for (uint32_t i = 0; i < count; i++) {
		output[i] = ring.data[(head + i) & RING_MASK];
	}

	atomic_store_explicit(&ring.head, head + count, memory_order_release);
	return count;
}

static void data_callback(
	ma_device *device_ptr,
	void *output,
	const void *input,
	ma_uint32 frame_count
)
{
	(void)input;

	float *out = (float *)output;
	uint32_t requested = frame_count * device_ptr->playback.channels;
	uint32_t read = ring_read(out, requested);

	for (uint32_t i = read; i < requested; i++) {
		out[i] = 0.0f;
	}
}

int32_t audio_init(int32_t sample_rate, int32_t channels)
{
	if (sample_rate <= 0 || channels < 1 || channels > 2) {
		return -1;
	}

	if (device_initialized) {
		return -2;
	}

	device_channels = (uint32_t)channels;
	ring_init();

	ma_device_config config =
		ma_device_config_init(ma_device_type_playback);
	config.playback.format = ma_format_f32;
	config.playback.channels = device_channels;
	config.sampleRate = (ma_uint32)sample_rate;
	config.dataCallback = data_callback;

	ma_result result = ma_device_init(NULL, &config, &device);
	if (result != MA_SUCCESS) {
		return (int32_t)result;
	}

	device_initialized = true;
	atomic_store_explicit(&running, true, memory_order_release);

	result = ma_device_start(&device);
	if (result != MA_SUCCESS) {
		atomic_store_explicit(&running, false, memory_order_release);
		device_initialized = false;
		ma_device_uninit(&device);
		return (int32_t)result;
	}

	return 0;
}

int32_t audio_write(const float *samples, uint32_t count)
{
	if (samples == NULL && count != 0) {
		return -1;
	}

	if (!device_initialized || count % device_channels != 0) {
		return -1;
	}

	uint32_t written = 0;
	while (written < count) {
		if (!atomic_load_explicit(&running, memory_order_acquire)) {
			return -1;
		}

		uint32_t tail = atomic_load_explicit(&ring.tail, memory_order_relaxed);
		uint32_t head = atomic_load_explicit(&ring.head, memory_order_acquire);
		uint32_t used = tail - head;
		uint32_t free_space = (RING_CAPACITY - 1u) - used;

		if (free_space == 0) {
			ma_sleep(1);
			continue;
		}

		uint32_t remaining = count - written;
		uint32_t chunk = remaining < free_space ? remaining : free_space;
		chunk -= chunk % device_channels;

		if (chunk == 0) {
			ma_sleep(1);
			continue;
		}

		for (uint32_t i = 0; i < chunk; i++) {
			ring.data[(tail + i) & RING_MASK] = samples[written + i];
		}

		atomic_store_explicit(&ring.tail, tail + chunk, memory_order_release);
		written += chunk;
	}

	return (int32_t)written;
}

void audio_close(void)
{
	if (!device_initialized) {
		return;
	}

	atomic_store_explicit(&running, false, memory_order_release);
	ma_device_uninit(&device);
	device_initialized = false;
}
