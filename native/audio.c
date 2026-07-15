#define MINIAUDIO_IMPLEMENTATION
#include "miniaudio.h"

#include <stdlib.h>
#include <string.h>


static ma_device device;


#define BUFFER_SIZE 48000 * 2

static float buffer[BUFFER_SIZE];

static int buffer_size = 0;


void data_callback(
    ma_device* device,
    void* output,
    const void* input,
    ma_uint32 frameCount
)
{
    float* out = output;

    int samples =
        frameCount *
        device->playback.channels;


    for(int i = 0; i < samples; i++)
    {
        if(i < buffer_size)
            out[i] = buffer[i];
        else
            out[i] = 0;
    }


    if(buffer_size > samples)
    {
        memmove(
            buffer,
            buffer + samples,
            (buffer_size-samples)
            * sizeof(float)
        );

        buffer_size -= samples;
    }
    else
    {
        buffer_size = 0;
    }
}



void audio_init(
    int sampleRate,
    int channels
)
{

    ma_device_config config =
        ma_device_config_init(
            ma_device_type_playback
        );


    config.playback.format =
        ma_format_f32;

    config.playback.channels =
        channels;

    config.sampleRate =
        sampleRate;

    config.dataCallback =
        data_callback;


    ma_device_init(
        NULL,
        &config,
        &device
    );


    ma_device_start(
        &device
    );
}



void audio_write(
    float* samples,
    unsigned int count
)
{

    if(buffer_size + count >= BUFFER_SIZE)
        return;


    memcpy(
        buffer + buffer_size,
        samples,
        count * sizeof(float)
    );


    buffer_size += count;
}



void audio_close()
{
    ma_device_uninit(&device);
}