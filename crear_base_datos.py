import sqlite3

def inicializar_bd():
    conn = sqlite3.connect("almacen.db")
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS operarios_tareas")
    cursor.execute("DROP TABLE IF EXISTS almacen_ubicaciones")
    cursor.execute("DROP TABLE IF EXISTS productos")
    cursor.execute("DROP TABLE IF EXISTS operarios")

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
    print("¡Base de datos recreada con éxito!")

if __name__ == "__main__":
    inicializar_bd()