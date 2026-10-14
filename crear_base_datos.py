import sqlite3

def inicializar_bd():
    # Conexión a la base de datos local
    conn = sqlite3.connect("almacen.db")
    cursor = conn.cursor()

    # Desactivar temporalmente claves foráneas para evitar conflictos al borrar tablas en orden
    cursor.execute("PRAGMA foreign_keys = OFF;")

    # Eliminar tablas existentes para limpiar la estructura por completo
    cursor.execute("DROP TABLE IF EXISTS operarios_tareas")
    cursor.execute("DROP TABLE IF EXISTS almacen_ubicaciones")
    cursor.execute("DROP TABLE IF EXISTS productos")
    cursor.execute("DROP TABLE IF EXISTS operarios")

    # Reactivar claves foráneas
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. Tabla de Productos
    cursor.execute("""
        CREATE TABLE productos (
            id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_producto TEXT NOT NULL
        )
    """)

    # 2. Tabla de Ubicaciones en el Almacén
    cursor.execute("""
        CREATE TABLE almacen_ubicaciones (
            id_almacen INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER,
            estanteria TEXT NOT NULL,
            fila INTEGER NOT NULL,
            columna INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            FOREIGN KEY (producto_id) REFERENCES productos (id_producto) ON DELETE CASCADE
        )
    """)

    # 3. Tabla de Operarios y Administrador (Con contraseña para Admin)
    cursor.execute("""
        CREATE TABLE operarios (
            id_operario INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            rol TEXT NOT NULL,
            password TEXT
        )
    """)

    # 4. Tabla de Tareas y Lotes de Picking
    cursor.execute("""
        CREATE TABLE operarios_tareas (
            id_tarea INTEGER PRIMARY KEY AUTOINCREMENT,
            id_operario INTEGER,
            id_almacen INTEGER,
            cantidad_a_buscar INTEGER NOT NULL,
            estado_tarea TEXT DEFAULT 'Pendiente',
            nota TEXT,
            id_lote TEXT DEFAULT 'Individual',
            FOREIGN KEY (id_operario) REFERENCES operarios (id_operario) ON DELETE CASCADE,
            FOREIGN KEY (id_almacen) REFERENCES almacen_ubicaciones (id_almacen) ON DELETE CASCADE
        )
    """)

    # Insertar usuarios iniciales (Administrador con contraseña 'admin123' y operarios)
    cursor.execute("INSERT INTO operarios (id_operario, nombre, rol, password) VALUES (0, 'Administrador', 'Admin', 'admin123')")
    cursor.execute("INSERT INTO operarios (id_operario, nombre, rol, password) VALUES (1, 'JuanT', 'Operario', NULL)")
    cursor.execute("INSERT INTO operarios (id_operario, nombre, rol, password) VALUES (2, 'ManuelG', 'Operario', NULL)")

    # Guardar cambios y cerrar conexión
    conn.commit()
    conn.close()
    print("¡Base de datos recreada y optimizada con éxito!")

if __name__ == "__main__":
    inicializar_bd()