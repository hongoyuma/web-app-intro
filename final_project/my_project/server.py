from fastapi import FastAPI, Response, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import os
import uvicorn
import json

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
    tags: Optional[List[str]] = []


class ProgramUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    tags: Optional[List[str]] = None


class Comment(BaseModel):
    id: Optional[int] = None
    program_id: int
    text: str


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS languages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS programs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            language_id INTEGER NOT NULL,
            title TEXT,
            code TEXT,
            tags TEXT,
            FOREIGN KEY(language_id) REFERENCES languages(id)
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            program_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            FOREIGN KEY(program_id) REFERENCES programs(id)
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


@app.get("/languages/{language_id}/programs", response_model=List[Program])
def get_programs(language_id: int):
    conn = get_db_connection()
    items = conn.execute(
        "SELECT * FROM programs WHERE language_id = ? ORDER BY id DESC", (language_id,)
    ).fetchall()
    conn.close()
    result = []
    for item in items:
        d = dict(item)
        d["tags"] = json.loads(d["tags"]) if d.get("tags") else []
        result.append(Program(**d))
    return result


@app.post("/languages/{language_id}/programs", response_model=Program, status_code=201)
def create_program(language_id: int, program: Program):
    if not program.title or not program.code:
        raise HTTPException(status_code=400, detail="title and code are required")
    tags_json = json.dumps(program.tags or [])
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO programs (language_id, title, code, tags) VALUES (?, ?, ?, ?)",
        (language_id, program.title, program.code, tags_json),
    )
    conn.commit()
    program_id = cursor.lastrowid
    conn.close()
    return Program(
        id=program_id,
        language_id=language_id,
        title=program.title,
        code=program.code,
        tags=program.tags or [],
    )


@app.delete("/programs/{program_id}", status_code=204)
def delete_program(program_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM programs WHERE id = ?", (program_id,))
    conn.commit()
    conn.close()
    return Response(status_code=204)


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
    tags = (
        update.tags
        if update.tags is not None
        else (json.loads(row["tags"]) if row["tags"] else [])
    )
    tags_json = json.dumps(tags)
    cursor.execute(
        "UPDATE programs SET title = ?, code = ?, tags = ? WHERE id = ?",
        (title, code, tags_json, program_id),
    )
    conn.commit()
    conn.close()
    return Program(
        id=program_id, language_id=row["language_id"], title=title, code=code, tags=tags
    )


@app.get("/programs/{program_id}/comments", response_model=List[Comment])
def get_comments(program_id: int):
    conn = get_db_connection()
    items = conn.execute(
        "SELECT * FROM comments WHERE program_id = ? ORDER BY id ASC", (program_id,)
    ).fetchall()
    conn.close()
    return [Comment(**dict(item)) for item in items]


@app.post("/programs/{program_id}/comments", response_model=Comment, status_code=201)
def add_comment(program_id: int, comment: Comment):
    if not comment.text:
        raise HTTPException(status_code=400, detail="text is required")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO comments (program_id, text) VALUES (?, ?)",
        (program_id, comment.text),
    )
    conn.commit()
    comment_id = cursor.lastrowid
    conn.close()
    return Comment(id=comment_id, program_id=program_id, text=comment.text)


@app.put("/comments/{comment_id}", response_model=Comment)
def update_comment(comment_id: int, comment: Comment):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM comments WHERE id = ?", (comment_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Comment not found")
    cursor.execute(
        "UPDATE comments SET text = ? WHERE id = ?",
        (comment.text, comment_id),
    )
    conn.commit()
    conn.close()
    return Comment(id=comment_id, program_id=row["program_id"], text=comment.text)


@app.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
    conn.commit()
    conn.close()
    return Response(status_code=204)


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


@app.delete("/languages/{language_id}", status_code=204)
def delete_language(language_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    # まず関連プログラムとコメントも削除
    cursor.execute("SELECT id FROM programs WHERE language_id = ?", (language_id,))
    program_ids = [row["id"] for row in cursor.fetchall()]
    for pid in program_ids:
        cursor.execute("DELETE FROM comments WHERE program_id = ?", (pid,))
    cursor.execute("DELETE FROM programs WHERE language_id = ?", (language_id,))
    cursor.execute("DELETE FROM languages WHERE id = ?", (language_id,))
    conn.commit()
    conn.close()
    return Response(status_code=204)


initialize_db()

if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
