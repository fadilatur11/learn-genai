import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const LLM_API_URL = "http://localhost:11434/api/generate";
const WEATHER_API_URL = "https://Weather-API.proxy-production.allthingsdev.co/weather/getForecast";

const SYSTEM_MESSAGE = `Hello, I am Sera Assistant. If you say "Hi" or a similar greeting, I will introduce myself with a greeting and introduction, such as: "Hello! I am Sera Assistant. How can I assist you today?" For other questions, I will do my best to respond appropriately.

Here is how I work:
- **Thought:** I analyze your input to determine the best response.
- **Action:** If needed, I will perform actions such as looking up information or processing data.
- **Observation:** I’ll provide the results of those actions.

Finally, I will clearly state the Answer or response prefixed by "Answer:".

Feel free to ask me anything or just start a conversation!`;

export async function answer(text) {
    const MARKER = "Answer:";
    const pos = text.indexOf(MARKER);

    if (pos < 0) return text.trim();
    return text.substring(pos + MARKER.length).trim();
}

export async function think(inquiry) {
    const greetings = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"];
    
    if (greetings.some(greeting => inquiry.toLowerCase().includes(greeting))) {
        return "Hello! I am Sera Assistant. How can I assist you today?";
    }

    if (inquiry.toLowerCase().includes("weather") || inquiry.toLowerCase().includes("cuaca")) {
        const prompt = `${SYSTEM_MESSAGE}\n\n${inquiry}`;
        const response = await generate(prompt);
        console.log("response generate:", response);
        
        // Cek apakah response mengandung koordinat
        const coordinates = extractCoordinates(response);
        if (coordinates) {
            return await getWeather(coordinates.latitude, coordinates.longitude);
        } else {
            return "Maaf, saya tidak mendapatkan koordinat dari respons model. Pastikan untuk menyebutkan kota dengan benar.";
        }
    }

    const prompt = `${SYSTEM_MESSAGE}\n\n${inquiry}`;
    const response = await generate(prompt);
    return answer(response);
}

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

function extractCoordinates(text) {
    // Ekstrak koordinat dari response
    const coordMatch = text.match(/latitude:\s*([\d.]+).*longitude:\s*([\d.]+)/i);
    if (coordMatch) {
        return {
            latitude: coordMatch[1],
            longitude: coordMatch[2]
        };
    }
    return null;
}

function extractCity(inquiry) {
    // Coba ambil nama kota dari inquiry
    const cityMatch = inquiry.match(/(?:in|di|from)\s+([a-zA-Z\s]+)/i);
    if (cityMatch) {
        return cityMatch[1].trim();
    }
    const simpleMatch = inquiry.match(/([a-zA-Z\s]+)/i);
    if (simpleMatch) {
        return simpleMatch[1].trim();
    }
    return null;
}

export async function getWeather(lat, long) {
    const url = `${WEATHER_API_URL}?latitude=${lat}&longitude=${long}&unit=celsius`;

    const headers = {
        "accept": "*/*",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "x-apihub-key": "46ygr-f4kI47ukz01laTipVH4AdKr4P2FsTaANVNUpRgp1HvAA"
    };

    try {
        const res = await fetch(url, { headers });
        const data = await res.json();

        if (data.data && data.data.currentConditions) {
            const weatherDescription = data.data.currentConditions.description;
            return `Hari ini cuaca di kota yang dimaksud adalah ${weatherDescription}.`;
        } else {
            return `Maaf, saya tidak dapat mendapatkan informasi cuaca untuk lokasi tersebut.`;
        }
    } catch (error) {
        console.error("Error fetching weather data:", error);
        return `Terjadi kesalahan saat mendapatkan data cuaca.`;
    }
}
