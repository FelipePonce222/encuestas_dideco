from flask import Flask, request, jsonify
from flask_cors import CORS
from database import get_connection, init_db

app = Flask(__name__)
CORS(app)

# Inicializar DB local al arrancar
init_db()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    rut = data.get('rut')
    password = data.get('password')

    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM funcionario WHERE rut = ? AND password = ?", (rut, password))
    user = cursor.fetchone()
    conn.close()

    if user:
        return jsonify({
            "status": "success",
            "message": "Bienvenido/a al sistema",
            "user": {
                "id": user["id_funcionario"],
                "rut": user["rut"],
                "nombre": user["nombre"],
                "cargo": user["cargo"]
            }
        }), 200
    else:
        return jsonify({"status": "error", "message": "RUT o contraseña incorrectos"}), 401

if __name__ == '__main__':
    app.run(debug=True, port=5000)