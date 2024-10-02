# chunked-openai-tts
A Node.js implementation to generate long audio files using OpenAI's limited text-to-speech (TTS) that only allows 4096 characters. It allows you to take long text inputs, chunk them and generate multiple audio files. Then using ffmpeg, combine them.

# Using it

```typescript
import { AudioUtils, TextToSpeechOptions } from './audio-utils';

const options: TextToSpeechOptions = {
    apiKey: 'your-openai-api-key',
    model: 'tts-1',
    voice: 'nova',
    maxChunkSize: 4000
};

const audioUtils = new AudioUtils(options);

async function generateAudioFromText(text: string) {
    try {
        const audioBuffer = await audioUtils.textToSpeech(text);
        // Now you can save this buffer to a file or use it as needed
        fs.writeFileSync('output.mp3', audioBuffer);
        console.log('Audio generated successfully!');
    } catch (error) {
        console.error('Error generating audio:', error);
    }
}

// Usage
const longText = "Your long text here...";
generateAudioFromText(longText);
```
