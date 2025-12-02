import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { pool, initDB } from "./db";

dotenv.config();

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

// Initialize database
initDB().catch(console.error);

// Add document endpoint
app.post("/api/documents", async (req, res) => {
  try {
    const { content, metadata } = req.body;

    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
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
    console.error(error);
    res.status(500).json({ error: "Failed to add document" });
  }
});

// Query endpoint (RAG)
app.post("/api/query", async (req, res) => {
  try {
    const { question } = req.body;

    // Generate query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
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

    // Build context from similar documents
    const context = similarDocs.rows.map((row) => row.content).join("\n\n");

    // Generate answer using GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
    });

    res.json({
      answer: completion.choices[0].message.content,
      sources: similarDocs.rows,
    });
  } catch (error) {
    console.error(error);
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
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
