#!/bin/bash

gcc \
  -shared \
  -fPIC \
  native/audio.c \
  -o native/libpcm-output.so