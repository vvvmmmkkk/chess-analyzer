import React, { useState } from "react";
import { Chessboard } from "react-chessboard";
import axios from "axios";
import "./App.css";

function App() {
  const [pgn, setPgn] = useState("");
  const [game, setGame] = useState(null);
  const [currentMove, setCurrentMove] = useState(0);
  const [whiteAccuracy, setWhiteAccuracy] = useState(null);
  const [blackAccuracy, setBlackAccuracy] = useState(null);
  const [analysis, setAnalysis] = useState([]);
  const [username, setUsername] = useState("");
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(false);


  const handleAnalyze = async (inputPGN = pgn) => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/analyze", { pgn: inputPGN });
      const data = res.data;
      setWhiteAccuracy(data.white_accuracy);
      setBlackAccuracy(data.black_accuracy);
      setAnalysis(data.analysis);
      setGame(data.analysis.map((m) => m.move));
      setCurrentMove(0);
    } catch (err) {
      alert("Analysis failed: " + err.message);
    }finally {
    setLoading(false); // Hide spinner
  }
  };

  const handleReset = () => {
    setPgn("");
    setGame(null);
    setCurrentMove(0);
    setWhiteAccuracy(null);
    setBlackAccuracy(null);
    setAnalysis([]);
    setRecentGames([]);
  };
  const playPrevious = () => {
  if (currentMove > 0) {
    setCurrentMove(currentMove - 1);
  }
};

  const playNext = () => {
    if (game && currentMove < game.length) {
      setCurrentMove(currentMove + 1);
    }
  };

  const getFEN = () => {
    const chess = require("chess.js");
    const board = new chess.Chess();
    if (game) {
      for (let i = 0; i < currentMove; i++) {
        board.move(game[i]);
      }
    }
    return board.fen();
  };

  const handleFetchGames = async () => {
    if (!username.trim()) return alert("Enter username");
    try {
      const res = await axios.post("http://localhost:5000/recent_games", { username });
      setRecentGames(res.data.games);
    } catch (err) {
      alert("Failed to fetch games: " + err.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPgn(event.target.result);
    };
    reader.readAsText(file);
  };

  const getClassificationStyle = (classification) => {
    switch (classification) {
      case "Blunder": return { color: "red", fontWeight: "bold" };
      case "Brilliant": return { color: "purple", fontWeight: "bold" };
      case "Miss": return { color: "#c62828", fontWeight: "bold" };
      case "Good Move": return { color: "#0277bd" };
      case "Great Move": return { color: "#2e7d32" };
      case "Book Move": return { color: "#6a1b9a" };
      default: return {};
    }
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Segoe UI", backgroundColor: "#769656", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center" }}>♟️ Chess Game Analyzer</h1>

      <div style={{ maxWidth: 1000, margin: "auto", background: "white", padding: 20, borderRadius: 10 }}>
        {/* Username Search */}
        <div style={{ marginBottom: 20 }}>
          <label><strong>🔎 Analyze Chess.com User:</strong></label><br />
          <input
            type="text"
            placeholder="Enter Chess.com username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: "8px", width: "60%", marginRight: 10 }}
          />
          <button className="btn btn-blue" onClick={handleFetchGames}>Fetch Games</button>
        </div>

        {/* Recent Games List */}
        {recentGames.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3>Recent Games:</h3>
            <ul>
              {recentGames.map((g, idx) => (
                <li key={idx} style={{ marginBottom: 10 }}>
                  <strong>{g.white}</strong> vs <strong>{g.black}</strong> — {g.result} on {g.date}
                  <button className="btn btn-green" onClick={() => handleAnalyze(g.pgn)} style={{ marginLeft: 10 }}>
                    Analyze
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* PGN Upload */}
        <div>
          <label><strong>📂 Upload PGN File:</strong></label><br />
          <input type="file" accept=".pgn" onChange={handleFileUpload} />
        </div>

        <br />
        <textarea
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          rows={8}
          placeholder="Paste PGN here or upload"
          style={{ width: "100%", padding: "10px", fontFamily: "monospace", borderRadius: 6, border: "1px solid #ccc" }}
        />

        <br />
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-green" onClick={() => handleAnalyze()} style={{ marginRight: 10 }}>Analyze</button>
          <button className="btn btn-red" onClick={handleReset}>Reset</button>
          {loading && (
  <div className="spinner" />
)}

        </div>

        {/* Accuracy Scores */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: "16px" }}>♔ White Accuracy: <strong>{whiteAccuracy !== null ? `${whiteAccuracy}%` : "-"}</strong></p>
          <p style={{ fontSize: "16px" }}>♚ Black Accuracy: <strong>{blackAccuracy !== null ? `${blackAccuracy}%` : "-"}</strong></p>
        </div>

        {/* Chessboard + Move List */}
        <div style={{ display: "flex", gap: 20, marginTop: 20, flexWrap: "wrap" }}>
          <Chessboard position={getFEN()} arePiecesDraggable={false} boardWidth={400} />
          <div style={{ fontSize: "14px", maxHeight: "400px", overflowY: "auto", flex: 1, padding: 10, background: "#f9f9f9", borderRadius: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {(() => {
                const movePairs = [];
                for (let i = currentMove; i < analysis.length; i += 2) {
                  const whiteMove = analysis[i];
                  const blackMove = analysis[i + 1];

                  movePairs.push(
                    <React.Fragment key={i}>
                      <div style={{ padding: "5px", background: "#fff" }}>
                        <strong>{whiteMove.move_number}.</strong> {whiteMove.move} →{" "}
                        <span style={getClassificationStyle(whiteMove.classification)}>
                          {whiteMove.classification}
                        </span>{" "}
                        {whiteMove.eval !== null ? `(${whiteMove.eval})` : ""}
                      </div>
                      {blackMove ? (
                        <div style={{ padding: "5px", background: "#fff" }}>
                          <strong>{blackMove.move_number}...</strong> {blackMove.move} →{" "}
                          <span style={getClassificationStyle(blackMove.classification)}>
                            {blackMove.classification}
                          </span>{" "}
                          {blackMove.eval !== null ? `(${blackMove.eval})` : ""}
                        </div>
                      ) : (
                        <div />
                      )}
                    </React.Fragment>
                  );
                }
                return movePairs;
              })()}
            </div>

           {game && (
  <div style={{ marginTop: 10, display: "flex", gap: "10px" }}>
    <button className="btn btn-blue" onClick={playPrevious}>◀️ Previous Move</button>
    {currentMove < game.length && (
      <button className="btn btn-blue" onClick={playNext}>▶️ Next Move</button>
    )}
  </div>
)}

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
