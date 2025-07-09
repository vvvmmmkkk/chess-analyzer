# ♟️ Chess Game Analyzer

A full-stack web application that analyzes chess games using [Stockfish](https://stockfishchess.org/) and classifies each move (e.g., Brilliant, Blunder, etc.) similar to Chess.com. Built using **React**, **Flask**, and **Chess.com Public API**.

---

## 🚀 Features

- ♖ Upload PGN files or paste PGN directly
- 🔍 Fetch and analyze **recent games from Chess.com**
- 📈 See **accuracy scores** for both players (White & Black)
- ✅ Move classification: Best, Brilliant, Great, Good, Inaccuracy, Blunder
- ♟️ Visualize game using an interactive chessboard
- ▶️ Play through moves with "Next" and "Previous" navigation

---

## 🛠 Tech Stack

### Frontend:
- React
- react-chessboard
- Axios
- CSS Modules / Custom Styling

### Backend:
- Flask (Python)
- python-chess
- Stockfish (UCI Engine)
- Chess.com API
