export const sendAudio = async (formData) => {
  const response = await fetch("http://127.0.0.1:8000/translate", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Error during translation");
  }

  return response.json(); // ✅ Now we get recognized_text, translated_text, audio_base64
};
