from flask import Flask, request, jsonify
from flask_cors import CORS
import chess.pgn
import chess.engine
import io
import os
import requests
import math
import chess.polyglot
from datetime import datetime

app = Flask(__name__)
CORS(app)

STOCKFISH_PATH = os.path.join(os.path.dirname(__file__), "stockfish", "stockfish.exe")

# 🎯 New: Scoring function closer to Chess.com
def eval_to_score(drop):
    if drop <= 30:
        return 1.0
    return max(0.0, round(math.exp(-drop / 150), 2))

@app.route('/analyze', methods=['POST'])
def analyze_game():
    try:
        pgn_text = request.json.get('pgn', '')
        if not pgn_text.strip():
            return jsonify({"error": "No PGN provided"}), 400

        game = chess.pgn.read_game(io.StringIO(pgn_text))
        if game is None:
            return jsonify({"error": "Invalid PGN"}), 400

        board = game.board()
        engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

        analysis = []
        white_score = black_score = 0
        white_total = black_total = 0

        # Fallback cutoff if we don't use polyglot
        eco_code = game.headers.get("ECO", "")
        eco_move_cutoff = 12 if eco_code else 6

        for move in game.mainline_moves():
            is_white_to_move = board.turn
            move_number = board.fullmove_number

            try:
                info_before = engine.analyse(board, chess.engine.Limit(depth=15))
                best_move = info_before.get("pv", [None])[0]
                best_score = info_before["score"].white().score(mate_score=10000) if is_white_to_move else info_before["score"].black().score(mate_score=10000)
            except:
                best_move = None
                best_score = 0

            moving_piece = board.piece_at(move.from_square)
            captured_piece = board.piece_at(move.to_square)
            san = board.san(move)
            board.push(move)

            try:
                info_after = engine.analyse(board, chess.engine.Limit(depth=15))
                actual_score = info_after["score"].white().score(mate_score=10000) if is_white_to_move else info_after["score"].black().score(mate_score=10000)
            except:
                actual_score = best_score

            drop = best_score - actual_score if best_score is not None and actual_score is not None else 0
            score_percent = eval_to_score(abs(drop))

            # ---- Classification ----
            classification = "Best Move"

            if board.ply() < eco_move_cutoff * 2:
                classification = "Book Move"

            elif (
                captured_piece and moving_piece and
                moving_piece.piece_type > captured_piece.piece_type and
                abs(drop) <= 10 and
                move != best_move and
                score_percent >= 0.997
            ):
                classification = "Brilliant"

            elif (
                move != best_move and
                abs(drop) <= 20 and
                score_percent >= 0.99 and
                not san.startswith("K") and
                not san[0].islower() and
                not san.startswith("O-O")
            ):
                classification = "Great Move"

            elif move == best_move:
                classification = "Best Move"

            elif abs(drop) <= 50:
                classification = "Excellent"

            elif abs(drop) <= 100:
                classification = "Good"

            elif abs(drop) <= 300:
                classification = "Inaccuracy"

            elif abs(drop) <= 700:
                classification = "Mistake"

            else:
                classification = "Blunder"

            # --- Accuracy Aggregation ---
            if classification != "Book Move":
                if is_white_to_move:
                    white_score += score_percent
                    white_total += 1
                else:
                    black_score += score_percent
                    black_total += 1

            analysis.append({
                "move_number": move_number,
                "move": san,
                "classification": classification,
                "eval": actual_score
            })

        engine.quit()

        white_accuracy = round((white_score / white_total) * 100, 2) if white_total else 100.0
        black_accuracy = round((black_score / black_total) * 100, 2) if black_total else 100.0

        return jsonify({
            "analysis": analysis,
            "white_accuracy": white_accuracy,
            "black_accuracy": black_accuracy
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/fetch_chesscom_pgn', methods=['POST'])
def fetch_chesscom_pgn():
    try:
        data = request.get_json()
        username = data.get("username", "").strip().lower()
        if not username:
            return jsonify({"error": "Chess.com username required"}), 400

        archive_url = f"https://api.chess.com/pub/player/{username}/games/archives"
        archives = requests.get(archive_url).json()
        if "archives" not in archives:
            return jsonify({"error": "Could not fetch archives"}), 400

        latest_url = archives["archives"][-1]
        games = requests.get(latest_url).json().get("games", [])
        for game in reversed(games):
            if "pgn" in game:
                return jsonify({"pgn": game["pgn"]})
        return jsonify({"error": "No PGN found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/recent_games', methods=['POST'])
def recent_games():
    try:
        data = request.get_json()
        username = data.get("username", "").strip().lower()
        if not username:
            return jsonify({"error": "Chess.com username required"}), 400

        archive_url = f"https://api.chess.com/pub/player/{username}/games/archives"
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; ChessAnalyzerBot/1.0)"
        }

        archive_res = requests.get(archive_url, headers=headers)
        archives = archive_res.json()

        if "archives" not in archives:
            return jsonify({"error": "Could not fetch archives"}), 400

        latest_archive_url = archives["archives"][-1]
        games_res = requests.get(latest_archive_url, headers=headers)
        games_data = games_res.json()

        games = games_data.get("games", [])
        recent_games = []

        for game in games[::-1]:
            if "pgn" in game:
                recent_games.append({
                    "pgn": game["pgn"],
                    "white": game["white"]["username"],
                    "black": game["black"]["username"],
                    "result": game.get("white", {}).get("result", "N/A") + " - " + game.get("black", {}).get("result", "N/A"),
                    "date": datetime.utcfromtimestamp(game.get("end_time", 0)).strftime("%Y-%m-%d")
                })

        if not recent_games:
            return jsonify({"error": "No PGNs found in recent games"}), 404

        return jsonify({"games": recent_games})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
