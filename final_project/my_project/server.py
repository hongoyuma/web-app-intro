from fastapi import FastAPI, Response, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse
from pydantic import BaseModel
from typing import List, Optional

import sqlite3
import os
import uvicorn

app = FastAPI()

BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "data.db")


class Language(BaseModel):
    id: Optional[int] = None
    name: str

class Program(BaseModel):
    id: Optional[int] = None
    language_id: int
    title: str
    code: str

class ProgramUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    # 言語テーブル
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS languages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
        """
    )
    # プログラムテーブル
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS programs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            language_id INTEGER NOT NULL,
            title TEXT,
            code TEXT,
            FOREIGN KEY(language_id) REFERENCES languages(id)
        )
        """
    )
    conn.commit()
    conn.close()

@app.get("/languages", response_model=List[Language])
def get_languages():
    conn = get_db_connection()
    items = conn.execute("SELECT * FROM languages").fetchall()
    conn.close()
    return [Language(**dict(item)) for item in items]

@app.post("/languages", response_model=Language, status_code=201)
def create_language(item: Language):
    if not item.name:
        raise HTTPException(status_code=400, detail="name is required")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO languages (name) VALUES (?)",
            (item.name,),
        )
        conn.commit()
        item_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=409, detail="Language already exists")
    conn.close()
    return Language(id=item_id, name=item.name)

# コード一覧取得
@app.get("/languages/{language_id}/programs", response_model=List[Program])
def get_programs(language_id: int):
    conn = get_db_connection()
    items = conn.execute(
        "SELECT * FROM programs WHERE language_id = ? ORDER BY id DESC", (language_id,)
    ).fetchall()
    conn.close()
    return [Program(**dict(item)) for item in items]

# コード追加
@app.post("/languages/{language_id}/programs", response_model=Program, status_code=201)
def create_program(language_id: int, program: Program):
    if not program.title or not program.code:
        raise HTTPException(status_code=400, detail="title and code are required")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO programs (language_id, title, code) VALUES (?, ?, ?)",
        (language_id, program.title, program.code),
    )
    conn.commit()
    program_id = cursor.lastrowid
    conn.close()
    return Program(id=program_id, language_id=language_id, title=program.title, code=program.code)

# コード削除
@app.delete("/programs/{program_id}", status_code=204)
def delete_program(program_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM programs WHERE id = ?", (program_id,))
    conn.commit()
    conn.close()
    return Response(status_code=204)

# コード編集
@app.put("/programs/{program_id}", response_model=Program)
def update_program(program_id: int, update: ProgramUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM programs WHERE id = ?", (program_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Program not found")
    title = update.title if update.title is not None else row["title"]
    code = update.code if update.code is not None else row["code"]
    cursor.execute(
        "UPDATE programs SET title = ?, code = ? WHERE id = ?",
        (title, code, program_id),
    )
    conn.commit()
    conn.close()
    return Program(id=program_id, language_id=row["language_id"], title=title, code=code)

# ここから下は書き換えない
@app.get("/", response_class=HTMLResponse)
async def read_html():
    html_file_path = os.path.join(BASE_DIR, "client.html")
    with open(html_file_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content, status_code=200)

@app.get("/style.css")
def read_css():
    css_file_path = os.path.join(BASE_DIR, "style.css")
    with open(css_file_path, "r", encoding="utf-8") as f:
        css_content = f.read()
    return Response(content=css_content, media_type="text/css")

@app.get("/script.js", response_class=PlainTextResponse)
def read_js():
    js_file_path = os.path.join(BASE_DIR, "script.js")
    with open(js_file_path, "r", encoding="utf-8") as f:
        js_content = f.read()
    return PlainTextResponse(
        content=js_content, status_code=200, media_type="application/javascript"
    )

@app.get("/favicon.ico")
def read_favicon():
    favicon_path = os.path.join(BASE_DIR, "favicon.ico")
    with open(favicon_path, "rb") as f:
        favicon_content = f.read()
    return Response(content=favicon_content, media_type="image/x-icon")

if __name__ == "__main__":
    initialize_db()
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)