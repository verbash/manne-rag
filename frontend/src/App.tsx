import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Document {
  id: number;
  content: string;
  metadata: any;
  created_at: string;
}

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDoc, setNewDoc] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const addDocument = async () => {
    if (!newDoc.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/documents`, { content: newDoc });
      setNewDoc('');
      await fetchDocuments();
    } catch (error) {
      console.error('Error adding document:', error);
      alert('Failed to add document');
    }
    setLoading(false);
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer('');
    try {
      const response = await axios.post(`${API_URL}/query`, { question });
      setAnswer(response.data.answer);
    } catch (error) {
      console.error('Error querying:', error);
      alert('Failed to get answer');
    }
    setLoading(false);
  };

  return (
    <div className="App">
      <h1>RAG Application</h1>
      <p className="subtitle">Powered by Digital Ocean Gradient AI</p>

      <div className="section">
        <h2>Add Document</h2>
        <textarea
          value={newDoc}
          onChange={(e) => setNewDoc(e.target.value)}
          placeholder="Enter document content..."
          rows={4}
        />
        <button onClick={addDocument} disabled={loading}>
          {loading ? 'Adding...' : 'Add Document'}
        </button>
      </div>

      <div className="section">
        <h2>Ask Question</h2>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
        />
        <button onClick={askQuestion} disabled={loading || documents.length === 0}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
        {documents.length === 0 && (
          <p className="hint">Add some documents first before asking questions!</p>
        )}
        {answer && (
          <div className="answer">
            <h3>Answer:</h3>
            <p>{answer}</p>
          </div>
        )}
      </div>

      <div className="section">
        <h2>Documents ({documents.length})</h2>
        <div className="documents">
          {documents.length === 0 ? (
            <p className="empty">No documents yet. Add your first document above!</p>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="document">
                <p>{doc.content}</p>
                <small>{new Date(doc.created_at).toLocaleString()}</small>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;