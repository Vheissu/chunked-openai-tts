import axios, { AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export interface TextToSpeechOptions {
    apiKey: string;
    model?: string;
    voice?: string;
    maxChunkSize?: number;
}

export class AudioUtils {
    private apiKey: string;
    private model: string;
    private voice: string;
    private maxChunkSize: number;

    constructor(options: TextToSpeechOptions) {
        this.apiKey = options.apiKey;
        this.model = options.model || 'tts-1';
        this.voice = options.voice || 'nova';
        this.maxChunkSize = options.maxChunkSize || 4000;
    }

    public async textToSpeech(text: string): Promise<Buffer> {
        const chunks = this.chunkText(text);
        const audioBuffers = await Promise.all(chunks.map(chunk => this.generateAudio(chunk)));
        return this.joinAudioBuffers(audioBuffers);
    }

    private chunkText(text: string): string[] {
        const chunks: string[] = [];
        let remainingText = text;

        while (remainingText.length > 0) {
            if (remainingText.length <= this.maxChunkSize) {
                chunks.push(remainingText);
                break;
            }

            let chunkEnd = remainingText.lastIndexOf('.', this.maxChunkSize);
            if (chunkEnd === -1 || chunkEnd < this.maxChunkSize / 2) {
                chunkEnd = remainingText.lastIndexOf(' ', this.maxChunkSize);
            }
            if (chunkEnd === -1) {
                chunkEnd = this.maxChunkSize;
            }

            chunks.push(remainingText.substring(0, chunkEnd + 1));
            remainingText = remainingText.substring(chunkEnd + 1).trim();
        }

        return chunks;
    }

    private async generateAudio(text: string): Promise<Buffer> {
        const config: AxiosRequestConfig = {
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            } as RawAxiosRequestHeaders,
            responseType: 'arraybuffer',
        };

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/audio/speech',
                {
                    model: this.model,
                    input: text,
                    voice: this.voice,
                },
                config
            );

            return Buffer.from(response.data);
        } catch (error) {
            console.error('Error in OpenAI TTS:', error);
            throw new Error('Failed to generate audio content');
        }
    }

    private async joinAudioBuffers(buffers: Buffer[]): Promise<Buffer> {
        const tempDir = os.tmpdir();
        const inputFiles = buffers.map((buffer, index) => {
            const filePath = path.join(tempDir, `chunk_${index}.mp3`);
            fs.writeFileSync(filePath, buffer);
            return filePath;
        });

        const outputFile = path.join(tempDir, 'output.mp3');
        const inputFileList = inputFiles.map((file) => `file '${file}'`).join('\n');
        const inputListFile = path.join(tempDir, 'input_list.txt');
        fs.writeFileSync(inputListFile, inputFileList);

        try {
            const ffmpegCommand = `ffmpeg -f concat -safe 0 -i ${inputListFile} -c copy ${outputFile}`;
            await execPromise(ffmpegCommand);

            const outputBuffer = fs.readFileSync(outputFile);

            // Clean up temp files
            inputFiles.forEach((file) => fs.unlinkSync(file));
            fs.unlinkSync(inputListFile);
            fs.unlinkSync(outputFile);

            return outputBuffer;
        } catch (error) {
            console.error('Error joining audio files:', error);
            throw new Error('Failed to join audio files');
        }
    }
}
