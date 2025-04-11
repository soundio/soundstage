#!/bin/bash

# Converts all .wav files to .m4a and stores them in the same location.
# Run the script with:
# ./wav-to-m4a.sh --vbr 3
# Or:
# ./wav-to-m4a.sh --bitrate 192
#
# Options:
# --vbr 0.1 to 1: Low quality, smaller file sizes
# --vbr 2: Good quality, roughly equivalent to ~128-160 kbps CBR
# --vbr 3: High quality, roughly equivalent to ~192 kbps CBR
# --vbr 4: Very high quality, around ~256 kbps CBR
# --vbr 5: Maximum quality, near-lossless
# Or:
# --bitrate 192: Constant bitrate of 192k

# Ensure ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "ffmpeg not found. Please install it first."
    exit 1
fi

# Default bitrate and VBR settings
BITRATE="192"
VBR=""

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --bitrate)
            BITRATE="$2"
            VBR=""
            shift 2
            ;;
        --vbr)
            VBR="$2"
            BITRATE=""
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Traverse the directory structure and convert .wav files to .m4a
find . -type f -name "*.wav" | while IFS= read -r file; do
    # Get the directory and filename without extension
    dir=$(dirname "$file")
    base=$(basename "$file" .wav)

    # Define output filename
    output="$dir/$base.m4a"

    # Get original sample rate and channel count
    SAMPLE_RATE=$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1 "$file")
    CHANNELS=$(ffprobe -v error -select_streams a:0 -show_entries stream=channels -of default=noprint_wrappers=1:nokey=1 "$file")

    # Determine encoding settings
    if [ -n "$BITRATE" ]; then
        ENCODING_OPTS="-b:a ${BITRATE}k"
        ENCODING_DESC="bitrate ${BITRATE}k"
    elif [ -n "$VBR" ]; then
        ENCODING_OPTS="-q:a ${VBR}"
        ENCODING_DESC="VBR quality ${VBR}"
    else
        ENCODING_OPTS="-b:a 192k"
        ENCODING_DESC="default bitrate 192k"
    fi

    # Convert using ffmpeg, preserving sample rate and channels
    if [ ! -f "$output" ]; then
        echo "Converting: $file -> $output with $ENCODING_DESC, sample rate $SAMPLE_RATE Hz, and $CHANNELS channels"
        ffmpeg -i "$file" -c:a aac $ENCODING_OPTS -ar "$SAMPLE_RATE" -ac "$CHANNELS" "$output"
    else
        echo "Skipping: $output already exists"
    fi
done

echo "Conversion complete."
