from fastapi import FastAPI, HTTPException
import sqlite3
import os
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional

app = FastAPI(title="EcoPickLed SGA API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def inicializar_bd_si_no_existe():
    conn = sqlite3.connect("almacen.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='operarios'")
    tabla_existe = cursor.fetchone()
    
    if not tabla_existe:
        cursor.execute("""
            CREATE TABLE productos (
                id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_producto TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE almacen_ubicaciones (
                id_almacen INTEGER PRIMARY KEY AUTOINCREMENT,
                producto_id INTEGER,
                estanteria TEXT NOT NULL,
                fila INTEGER NOT NULL,
                columna INTEGER NOT NULL,
                cantidad INTEGER NOT NULL,
                FOREIGN KEY (producto_id) REFERENCES productos (id_producto)
            )
        """)
        cursor.execute("""
            CREATE TABLE operarios (
                id_operario INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                rol TEXT NOT NULL,
                password TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE operarios_tareas (
                id_tarea INTEGER PRIMARY KEY AUTOINCREMENT,
                id_operario INTEGER,
                id_almacen INTEGER,
                cantidad_a_buscar INTEGER NOT NULL,
                estado_tarea TEXT DEFAULT 'Pendiente',
                nota TEXT,
                id_lote TEXT DEFAULT 'Individual',
                FOREIGN KEY (id_operario) REFERENCES operarios (id_operario),
                FOREIGN KEY (id_almacen) REFERENCES almacen_ubicaciones (id_almacen)
            )
        """)
        cursor.execute("INSERT INTO operarios (id_operario, nombre, rol, password) VALUES (0, 'Administrador', 'Admin', 'admin123')")
        cursor.execute("INSERT INTO operarios (id_operario, nombre, rol, password) VALUES (1, 'JuanT', 'Operario', NULL)")
        cursor.execute("INSERT INTO operarios (id_operario, nombre, rol, password) VALUES (2, 'ManuelG', 'Operario', NULL)")
        conn.commit()
    conn.close()

inicializar_bd_si_no_existe()

def obtener_conexion():
    conn = sqlite3.connect("almacen.db")
    conn.row_factory = sqlite3.Row
    return conn

class ProductoAdmin(BaseModel):
    nombre_producto: str
    estanteria: str
    fila: int
    columna: int
    cantidad: int

class ItemLote(BaseModel):
    id_almacen: int
    cantidad_a_buscar: int

class TareaAgrupadaAdmin(BaseModel):
    id_operario: int
    nombre_lote: str = Field(..., alias="nombre_lote")
    items: List[ItemLote]

class TareaIncompleta(BaseModel):
    nota: str

class LoginAdmin(BaseModel):
    password: str

@app.post("/api/login/admin")
def login_admin(datos: LoginAdmin):
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM operarios WHERE rol = 'Admin'")
    admin = cursor.fetchone()
    conn.close()
    
    if admin and admin["password"] == datos.password:
        return {"exito": True, "mensaje": "Acceso autorizado"}
    else:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

@app.get("/api/almacen")
def ver_almacen():
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id_almacen, p.nombre_producto, a.estanteria, a.fila, a.columna, a.cantidad
        FROM almacen_ubicaciones a
        JOIN productos p ON a.producto_id = p.id_producto
    """)
    filas = cursor.fetchall()
    conn.close()
    return [dict(fila) for fila in filas]

@app.post("/api/admin/producto")
def agregar_producto(prod: ProductoAdmin):
    conn = obtener_conexion()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id_producto FROM productos WHERE LOWER(nombre_producto) = LOWER(?)", (prod.nombre_producto.strip(),))
    producto_existente = cursor.fetchone()
    
    if producto_existente:
        producto_id = producto_existente["id_producto"]
    else:
        cursor.execute("INSERT INTO productos (nombre_producto) VALUES (?)", (prod.nombre_producto.strip(),))
        producto_id = cursor.lastrowid
    
    cursor.execute("""
        SELECT id_almacen, cantidad 
        FROM almacen_ubicaciones 
        WHERE producto_id = ? AND LOWER(estanteria) = LOWER(?) AND fila = ? AND columna = ?
    """, (producto_id, prod.estanteria.strip(), prod.fila, prod.columna))
    
    ubicacion_existente = cursor.fetchone()
    
    if ubicacion_existente:
        nueva_cantidad = ubicacion_existente["cantidad"] + prod.cantidad
        cursor.execute("UPDATE almacen_ubicaciones SET cantidad = ? WHERE id_almacen = ?", (nueva_cantidad, ubicacion_existente["id_almacen"]))
    else:
        cursor.execute("""
            INSERT INTO almacen_ubicaciones (producto_id, estanteria, fila, columna, cantidad)
            VALUES (?, ?, ?, ?, ?)
        """, (producto_id, prod.estanteria.strip(), prod.fila, prod.columna, prod.cantidad))
    
    conn.commit()
    conn.close()
    return {"mensaje": "Stock y ubicación actualizados correctamente"}

@app.delete("/api/admin/almacen/{id_almacen}")
def eliminar_ubicacion(id_almacen: int):
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM operarios_tareas WHERE id_almacen = ?", (id_almacen,))
    cursor.execute("DELETE FROM almacen_ubicaciones WHERE id_almacen = ?", (id_almacen,))
    conn.commit()
    conn.close()
    return {"mensaje": "Ubicación eliminada correctamente"}

@app.post("/api/admin/tarea-agrupada")
def crear_tarea_agrupada(datos: TareaAgrupadaAdmin):
    conn = obtener_conexion()
    cursor = conn.cursor()
    
    for item in datos.items:
        cursor.execute("""
            INSERT INTO operarios_tareas (id_operario, id_almacen, cantidad_a_buscar, estado_tarea, nota, id_lote)
            VALUES (?, ?, ?, 'Pendiente', NULL, ?)
        """, (datos.id_operario, item.id_almacen, item.cantidad_a_buscar, datos.nombre_lote))
        
    conn.commit()
    conn.close()
    return {"mensaje": f"Lote '{datos.nombre_lote}' creado y asignado con éxito"}

@app.get("/api/admin/tareas")
def listar_todas_tareas():
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.id_tarea, o.nombre AS operario, p.nombre_producto, a.estanteria, a.fila, a.columna, t.cantidad_a_buscar, t.estado_tarea, t.nota, t.id_lote
        FROM operarios_tareas t
        JOIN operarios o ON t.id_operario = o.id_operario
        JOIN almacen_ubicaciones a ON t.id_almacen = a.id_almacen
        JOIN productos p ON a.producto_id = p.id_producto
    """)
    filas = cursor.fetchall()
    conn.close()
    return [dict(fila) for fila in filas]

@app.get("/api/tareas/{id_operario}")
def ver_tareas_operario(id_operario: int):
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.id_tarea, o.nombre AS operario, p.nombre_producto, a.estanteria, a.fila, a.columna, t.cantidad_a_buscar, t.estado_tarea, t.id_almacen, a.cantidad AS stock_disponible, t.id_lote
        FROM operarios_tareas t
        JOIN operarios o ON t.id_operario = o.id_operario
        JOIN almacen_ubicaciones a ON t.id_almacen = a.id_almacen
        JOIN productos p ON a.producto_id = p.id_producto
        WHERE t.id_operario = ? AND t.estado_tarea = 'Pendiente'
    """, (id_operario,))
    filas = cursor.fetchall()
    conn.close()
    return [dict(fila) for fila in filas]

def verificar_cierre_lote(cursor, id_tarea):
    cursor.execute("SELECT id_lote FROM operarios_tareas WHERE id_tarea = ?", (id_tarea,))
    res = cursor.fetchone()
    if not res or not res["id_lote"]:
        return None
    
    lote = res["id_lote"]
    
    cursor.execute("SELECT COUNT(*) AS pendientes FROM operarios_tareas WHERE id_lote = ? AND estado_tarea = 'Pendiente'", (lote,))
    pendientes = cursor.fetchone()["pendientes"]
    
    if pendientes == 0:
        cursor.execute("""
            SELECT p.nombre_producto, t.estado_tarea, t.nota 
            FROM operarios_tareas t 
            JOIN almacen_ubicaciones a ON t.id_almacen = a.id_almacen 
            JOIN productos p ON a.producto_id = p.id_producto 
            WHERE t.id_lote = ?
        """, (lote,))
        items_lote = cursor.fetchall()
        
        incidencias = [item for item in items_lote if "Incidencia" in item["estado_tarea"]]
        if incidencias:
            detalle = ", ".join([f"{i['nombre_producto']} ({i['nota']})" for i in incidencias])
            return f"¡Lote / Tarea '{lote}' completado con incidencias en: {detalle}!"
        else:
            return f"¡Lote / Tarea '{lote}' completado con éxito y sin incidencias!"
            
    return f"Tarea #{id_tarea} completada. Quedan más elementos en el lote '{lote}'."

@app.post("/api/operario/completar/{id_tarea}")
def completar_tarea(id_tarea: int):
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("SELECT id_almacen, cantidad_a_buscar FROM operarios_tareas WHERE id_tarea = ?", (id_tarea,))
    tarea = cursor.fetchone()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    cursor.execute("UPDATE operarios_tareas SET estado_tarea = 'Completado' WHERE id_tarea = ?", (id_tarea,))
    cursor.execute("UPDATE almacen_ubicaciones SET cantidad = cantidad - ? WHERE id_almacen = ?", (tarea["cantidad_a_buscar"], tarea["id_almacen"]))
    
    mensaje_cierre = verificar_cierre_lote(cursor, id_tarea)
    conn.commit()
    conn.close()
    return {"mensaje": "Tarea completada y stock actualizado", "alerta_cierre": mensaje_cierre}

@app.post("/api/operario/completar-parcial/{id_tarea}")
def completar_tarea_parcial(id_tarea: int, datos: TareaIncompleta):
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.id_almacen, t.cantidad_a_buscar, a.cantidad AS stock_disponible 
        FROM operarios_tareas t
        JOIN almacen_ubicaciones a ON t.id_almacen = a.id_almacen
        WHERE t.id_tarea = ?
    """, (id_tarea,))
    tarea = cursor.fetchone()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    stock_a_sacar = max(0, tarea["stock_disponible"])
    cursor.execute("UPDATE operarios_tareas SET estado_tarea = 'Incidencia / Stock Insuficiente', nota = ? WHERE id_tarea = ?", (datos.nota, id_tarea))
    cursor.execute("UPDATE almacen_ubicaciones SET cantidad = cantidad - ? WHERE id_almacen = ?", (stock_a_sacar, tarea["id_almacen"]))
    
    mensaje_cierre = verificar_cierre_lote(cursor, id_tarea)
    conn.commit()
    conn.close()
    return {"mensaje": "Extracción parcial registrada con incidencia", "alerta_cierre": mensaje_cierre}

if __name__ == "__main__":
    import uvicorn
    puerto = int(os.environ.get("PORT", 8000))
    uvicorn.run("servidor:app", host="0.0.0.0", port=puerto)