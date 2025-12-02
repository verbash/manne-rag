import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool, initDB } from "./db";

dotenv.config();

const app = express();
const DO_API_URL = "https://api.digitalocean.com/v2/ai";

app.use(cors());
app.use(express.json());

initDB().catch(console.error);

// Helper function to call DO Gradient AI API
async function callDOAPI(endpoint: string, body: any) {
  const response = await fetch(`${DO_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DO API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Add document endpoint
app.post("/api/documents", async (req, res) => {
  try {
    const { content, metadata } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Content is required" });
    }

    // Generate embedding with DO Gradient AI
    const embeddingResponse = await callDOAPI("/embeddings", {
      model: "multi-qa-mpnet-base-dot-v1",
      input: content,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Store in database
    const result = await pool.query(
      "INSERT INTO documents (content, embedding, metadata) VALUES ($1, $2, $3) RETURNING id",
      [content, JSON.stringify(embedding), metadata || {}]
    );

    res.json({ id: result.rows[0].id, message: "Document added successfully" });
  } catch (error) {
    console.error("Error adding document:", error);
    res.status(500).json({ error: "Failed to add document" });
  }
});

// Query endpoint (RAG)
app.post("/api/query", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "Question is required" });
    }

    // Generate query embedding
    const embeddingResponse = await callDOAPI("/embeddings", {
      model: "multi-qa-mpnet-base-dot-v1",
      input: question,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Find similar documents
    const similarDocs = await pool.query(
      `SELECT content, 1 - (embedding <=> $1::vector) AS similarity 
       FROM documents 
       ORDER BY embedding <=> $1::vector 
       LIMIT 3`,
      [JSON.stringify(queryEmbedding)]
    );

    if (similarDocs.rows.length === 0) {
      return res.json({
        answer:
          "I don't have any documents in my knowledge base to answer this question.",
        sources: [],
      });
    }

    // Build context from similar documents
    const context = similarDocs.rows.map((row) => row.content).join("\n\n");

    // Generate answer using Llama 3.1 8B
    const completion = await callDOAPI("/chat/completions", {
      model: "llama3-8b-instruct",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Use the following context to answer the question. If the answer is not in the context, say so.",
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${question}`,
        },
      ],
      max_tokens: 500,
    });

    res.json({
      answer: completion.choices[0].message.content,
      sources: similarDocs.rows,
    });
  } catch (error) {
    console.error("Error processing query:", error);
    res.status(500).json({ error: "Failed to process query" });
  }
});

// Get all documents
app.get("/api/documents", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, content, metadata, created_at FROM documents ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using Digital Ocean Gradient AI`);
});
