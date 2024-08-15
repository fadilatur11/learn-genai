import dotenv from 'dotenv';
import fetch from 'node-fetch';
// import axios from 'axios';
import {extractTopic, getNews} from "./external-api.js"

dotenv.config();

// URL untuk API LLM lokal dan API NewsAPI
const LLM_API_URL = "http://localhost:11434/api/generate";

// Pesan sistem yang mendefinisikan perilaku dasar asisten
const SYSTEM_MESSAGE = `Hello, I am Sera Assistant. If you say "Hi" or a similar greeting, I will introduce myself with a greeting and introduction, such as: "Hello! I am Sera Assistant. How can I assist you today?" For other questions, I will do my best to respond appropriately.

Here is how I work:
- **Thought:** I analyze your input to determine the best response.
- **Action:** If needed, I will perform actions such as looking up information or processing data.
- **Observation:** I’ll provide the results of those actions.

Finally, I will clearly state the Answer or response prefixed by "Answer:".

Feel free to ask me anything or just start a conversation!`;

// Fungsi untuk merespons pertanyaan pengguna
export async function think(inquiry) {
    const greetings = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"];
    
    // Respon standar untuk salam
    if (greetings.some(greeting => inquiry.toLowerCase().includes(greeting))) {
        return "Hello! I am Sera Assistant. How can I assist you today?";
    }

    // Respon untuk pertanyaan berita
    if (inquiry.toLowerCase().includes("berita")) {
        const topic = extractTopic(inquiry);
        return await getNews(topic || 'headline');
    }

    // Mengirim permintaan ke model LLM
    const prompt = `${SYSTEM_MESSAGE}\n\n${inquiry}`;
    const response = await generate(prompt);
    return answer(response);
}

// Fungsi untuk memanggil API LLM dan menghasilkan respon
export async function generate(prompt) {
    if (!prompt) throw new Error("Prompt is required");

    const method = "POST";
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.API_KEY}`
    };
    const body = JSON.stringify({
        model: "llama3:latest",
        temperature: 0.7,
        max_tokens: 150,
        prompt: prompt,
        options: {
            num_predict: 200,
            temperature: 0,
            top_k: 20,
            top_p: 0.9
        },
        stream: false
    });
    const request = { method, headers, body };

    try {
        const res = await fetch(LLM_API_URL, request);
        const data = await res.json();

        if (data.response && data.response.trim() !== '') {
            return data.response.trim();
        } else {
            throw new Error("Invalid response structure from API. Response does not contain the expected content.");
        }
    } catch (error) {
        console.error("Error in generate function:", error);
        throw error;
    }
}

// Fungsi untuk mengekstrak dan menampilkan jawaban dari model LLM
export async function answer(text) {
    const MARKER = "Answer:";
    const pos = text.indexOf(MARKER);

    if (pos < 0) return text.trim();
    return text.substring(pos + MARKER.length).trim();
}
