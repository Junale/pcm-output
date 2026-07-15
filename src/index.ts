import {
  dlopen,
  FFIType,
  suffix,
} from "bun:ffi";

const lib = dlopen(
  `./native/libpcm-output.${suffix}`,
  {
    audio_init: {
      args: [
        FFIType.i32,
        FFIType.i32
      ],
      returns: FFIType.void,
    },

    audio_write: {
      args: [
        FFIType.ptr,
        FFIType.u32
      ],
      returns: FFIType.void,
    },

    audio_close: {
      args: [],
      returns: FFIType.void,
    }
  }
);


export class AudioOutput {

  constructor(
    options: {
      sampleRate?: number;
      channels?: number;
    } = {}
  ) {

    lib.symbols.audio_init(
      options.sampleRate ?? 48000,
      options.channels ?? 2
    );
  }


  write(samples: Float32Array) {

    lib.symbols.audio_write(
      samples,
      samples.length
    );

  }


  close() {
    lib.symbols.audio_close();
  }
}