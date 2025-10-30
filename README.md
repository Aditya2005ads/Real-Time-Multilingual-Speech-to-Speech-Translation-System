### 🔧 FFmpeg Setup
Download and install FFmpeg:

1. Go to [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. For Windows, download the prebuilt binaries (e.g., from gyan.dev).
3. Extract it and note the `bin` path (e.g., `C:\ffmpeg\bin`).
4. Add that path to your system’s `PATH` environment variable, OR update the path in `main.py`:

```python
FFMPEG_DIR = r"C:\ffmpeg\bin"




