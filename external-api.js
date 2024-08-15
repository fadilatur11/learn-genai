import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const NEWS_API_URL = "https://newsapi.org/v2/everything"; // Menggunakan endpoint yang sesuai untuk pencarian berita

// Fungsi untuk mengekstrak topik dari pertanyaan pengguna
export function extractTopic(inquiry) {
    // Mencoba menangkap topik setelah kata "tentang", "mengenai", atau "about"
    const topicMatch = inquiry.match(/(?:tentang|mengenai|about|berita)\s+([a-zA-Z\s]+)/i);
    if (topicMatch) {
        return topicMatch[1].trim();
    }
    
    // Fallback: Mencoba menangkap topik setelah kata "berita"
    const simpleMatch = inquiry.match(/berita\s+([a-zA-Z\s]+)/i);
    if (simpleMatch) {
        return simpleMatch[1].trim();
    }

    // Jika tidak ada yang berhasil, kembalikan null
    return null;
}

// Fungsi untuk mendapatkan berita terkini menggunakan NewsAPI
export async function getNews(topic, fromDate = '2024-07-15') {
    console.log(topic)
    if (!topic) {
        topic = 'headline'; // Fallback jika tidak ada topik yang diekstrak
    }
    console.log("Extracted topic:", topic); // Debug log untuk melihat topik yang diekstrak
    const url = `${NEWS_API_URL}?q=${encodeURIComponent(topic)}&from=${fromDate}&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`;

    try {
        const response = await axios.get(url);
        if (response.data.articles && response.data.articles.length > 0) {
            // Membuat HTML untuk berita
            const newsHTML = response.data.articles.map((article, index) => {
                const title = article.title;
                const publishedAt = new Date(article.publishedAt).toLocaleString(); // Format date menjadi lebih mudah dibaca
                const sourceName = article.source.name;
                const url = article.url;
                return `
                    <div class="news-item">
                        <div class="news-title" style="font-weight: bold">${index + 1}. ${title}</div>
                        <div class="news-meta">
                            Published At:  ${publishedAt} <br>
                            Source: <b>${sourceName}</b> <br>
                            <a href="${url}" target="_blank">Read more</a>
                        </div>
                    </div>
                `;
            }).join("");
            return newsHTML;
        } else {
            return "<p>No news available for the selected topic.</p>";
        }
    } catch (error) {
        console.error("Error fetching news:", error);
        return "<p>Error fetching news. Please try again later.</p>";
    }
}

