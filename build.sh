#!/bin/bash

# Linux build
gcc \
  -shared \
  -fPIC \
  native/audio.c \
  -o native/libpcm-output.so

# macOS build
clang \
  -shared \
  -fPIC \
  native/audio.c \
  -o native/libpcm-output.dylib
  
# Windows build
clang \
  -shared \
  native/audio.c \
  -o native/pcm-output.dll