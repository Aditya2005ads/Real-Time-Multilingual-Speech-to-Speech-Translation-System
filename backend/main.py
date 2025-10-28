from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import speech_recognition as sr
from googletrans import Translator
from gtts import gTTS
from pydub import AudioSegment
import tempfile, subprocess, os
import traceback
from fastapi.responses import JSONResponse
import base64
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

FFMPEG_DIR = os.getenv("FFMPEG_DIR")


# Add ffmpeg folder to PATH for this session
os.environ["PATH"] += os.pathsep + FFMPEG_DIR

AudioSegment.converter = os.path.join(FFMPEG_DIR, "ffmpeg.exe")
AudioSegment.ffprobe = os.path.join(FFMPEG_DIR, "ffprobe.exe")

try:
    subprocess.run([AudioSegment.converter, "-version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print("✅ FFmpeg detected and working.")
except Exception as e:
    print(f"💥 FFmpeg not working: {e}")
    
# --------------------------------------
# ⚙️ FastAPI Setup
# --------------------------------------
app = FastAPI(title="🎙 Speech Translator Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow any origin for now (safe in dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------
# 🧠 Speech Recognition
# --------------------------------------
def recognize_speech(file_path, lang_code="en-IN"):
    recognizer = sr.Recognizer()
    with sr.AudioFile(file_path) as source:
        audio_data = recognizer.record(source)
    try:
        text = recognizer.recognize_google(audio_data, language=lang_code)
        print(f"📝 Recognized: {text}")
        return text
    except sr.UnknownValueError:
        print("⚠️ Could not understand audio")
        return None
    except sr.RequestError as e:
        print(f"⚠️ API error: {e}")
        return None

# --------------------------------------
# 🌐 Translation
# --------------------------------------
def translate_text(text, src="en", dest="hi"):
    translator = Translator()
    translated = translator.translate(text, src=src, dest=dest)
    print(f"🌐 {src} → {dest}: {translated.text}")
    return translated.text

# --------------------------------------
# 🔊 Text to Speech
# --------------------------------------
def text_to_speech(text, lang="hi"):
    output_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3").name
    tts = gTTS(text=text, lang=lang)
    tts.save(output_file)
    print(f"🔊 Audio generated: {output_file}")
    return output_file

# --------------------------------------
# 🎯 Main Translation Endpoint
# --------------------------------------
@app.post("/translate")
async def translate_audio(
    file: UploadFile,
    input_lang: str = Form("en"),
    output_lang: str = Form("hi")
):
    temp_input = None
    temp_wav = None
    try:
        # 1️⃣ Save uploaded WebM file
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
        with open(temp_input.name, "wb") as f:
            f.write(await file.read())
        print(f"📁 Uploaded file saved: {temp_input.name}")

        # 2️⃣ Convert WebM → WAV
        temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix=".wav").name
        try:
            sound = AudioSegment.from_file(temp_input.name, format="webm")
            print("step1 done")
            sound.export(temp_wav, format="wav")            
            print(f"🎧 Converted WebM → WAV: {temp_wav}")
        except Exception as e:
            raise Exception(f"Audio conversion failed: {e}")

        # 3️⃣ Recognize Speech
        lang_code = f"{input_lang}-IN" if input_lang in ["hi", "en"] else input_lang
        text = recognize_speech(temp_wav, lang_code)
        if not text:
            return JSONResponse({"error": "Speech not recognized"}, status_code=400)

        # 4️⃣ Translate Text
        translated_text = translate_text(text, src=input_lang, dest=output_lang)

        # 5️⃣ Generate Translated Speech
        output_mp3 = text_to_speech(translated_text, lang=output_lang)

        print("✅ Translation flow complete.")
        
        with open(output_mp3, "rb") as f:
            audio_bytes = f.read()
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        return JSONResponse({
            "recognized_text": text,
            "translated_text": translated_text,
            "audio_base64": audio_b64,
        })
        
        # return FileResponse(output_mp3, media_type="audio/mpeg", filename="translated.mp3")

    except Exception as e:
        print("💥 Error occurred!")
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)

    finally:
        # Cleanup temp files
        for fpath in [temp_input, temp_wav]:
            try:
                if fpath and os.path.exists(fpath if isinstance(fpath, str) else fpath.name):
                    os.remove(fpath if isinstance(fpath, str) else fpath.name)
            except Exception:
                pass

# --------------------------------------
# 🏠 Root Route
# --------------------------------------
@app.get("/")
def root():
    return {"message": "🎙 Real-Time Speech Translator backend is running!"}
