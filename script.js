const API_URL = "https://ecopickled-sga.onrender.com";
let perfilActual = 'admin';
let idOperarioActual = 1;
let itemsLoteActual = [];
let intervaloActualizacion = null;

document.addEventListener("DOMContentLoaded", () => {
    iniciarTiempoReal();
});

function iniciarTiempoReal() {
    if (intervaloActualizacion) clearInterval(intervaloActualizacion);

    intervaloActualizacion = setInterval(() => {
        if (perfilActual === 'admin') {
            cargarInventarioSilencioso();
        } else {
            cargarTareasSilencioso(idOperarioActual);
        }
    }, 3000);
}

function toggleAdminPasswordBox() {
    const box = document.getElementById("box-admin-pass");
    box.classList.toggle("hidden");
}

async function verificarLoginAdmin() {
    const pass = document.getElementById("admin-password-input").value;
    try {
        const respuesta = await fetch(`${API_URL}/api/login/admin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: pass })
        });
        
        if (respuesta.ok) {
            iniciarSesion('admin');
        } else {
            alert("Contraseña incorrecta (Prueba con: admin123)");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

function iniciarSesion(perfil) {
    perfilActual = perfil;
    const vistaLogin = document.getElementById("vista-login");
    const contenedorPrincipal = document.getElementById("contenedor-principal");
    const vistaAdmin = document.getElementById("vista-admin");
    const vistaOperario = document.getElementById("vista-operario");
    const labelPerfil = document.getElementById("label-perfil-activo");

    vistaLogin.classList.add("hidden");
    contenedorPrincipal.classList.remove("hidden");
    document.body.className = "bg-slate-900 text-slate-100 antialiased min-h-screen flex flex-col";

    if (perfil === 'admin') {
        labelPerfil.innerText = "Perfil: Administrador";
        vistaAdmin.classList.remove("hidden");
        vistaOperario.classList.add("hidden");
        cargarInventario();
    } else {
        vistaAdmin.classList.add("hidden");
        vistaOperario.classList.remove("hidden");
        cambiarModoOperario('tareas');

        if (perfil === 'juan') {
            idOperarioActual = 1;
            labelPerfil.innerText = "Perfil: JuanT (Operario)";
            document.getElementById("titulo-operario").innerText = "Tareas de Picking — JuanT";
        } else {
            idOperarioActual = 2;
            labelPerfil.innerText = "Perfil: ManuelG (Operario)";
            document.getElementById("titulo-operario").innerText = "Tareas de Picking — ManuelG";
        }
        cargarTareas(idOperarioActual);
    }
    iniciarTiempoReal();
}

function cerrarSesion() {
    if (intervaloActualizacion) clearInterval(intervaloActualizacion);
    document.getElementById("contenedor-principal").classList.add("hidden");
    document.getElementById("vista-login").classList.remove("hidden");
    document.body.className = "bg-slate-900 text-slate-100 antialiased min-h-screen flex flex-col justify-center items-center";
    document.getElementById("admin-password-input").value = "";
    document.getElementById("box-admin-pass").classList.add("hidden");
}

function cambiarModoOperario(modo) {
    const btnTareas = document.getElementById("btn-modo-tareas");
    const btnRecepcion = document.getElementById("btn-modo-recepcion");
    const subTareas = document.getElementById("subvista-tareas");
    const subRecepcion = document.getElementById("subvista-recepcion");

    if (modo === 'tareas') {
        btnTareas.className = "p-5 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 text-white font-bold flex items-center space-x-4 transition-all";
        btnRecepcion.className = "p-5 rounded-2xl border border-slate-700 bg-slate-800/80 text-white font-bold flex items-center space-x-4 transition-all hover:bg-slate-800";
        subTareas.classList.remove("hidden");
        subRecepcion.classList.add("hidden");
        cargarTareas(idOperarioActual);
    } else {
        btnRecepcion.className = "p-5 rounded-2xl border border-sky-500/50 bg-sky-500/10 text-white font-bold flex items-center space-x-4 transition-all";
        btnTareas.className = "p-5 rounded-2xl border border-slate-700 bg-slate-800/80 text-white font-bold flex items-center space-x-4 transition-all hover:bg-slate-800";
        subRecepcion.classList.remove("hidden");
        subTareas.classList.add("hidden");
    }
}

async function cargarInventario() {
    try {
        const respuesta = await fetch(`${API_URL}/api/almacen`);
        const datos = await respuesta.json();
        const tbody = document.getElementById("tabla-inventario");
        const selectLote = document.getElementById("lote-select-ubicacion");
        
        tbody.innerHTML = "";
        if (selectLote) {
            selectLote.innerHTML = `<option value="" disabled selected>Selecciona producto del inventario...</option>`;
        }

        datos.forEach(item => {
            tbody.innerHTML += `
                <tr class="hover:bg-slate-700/30 transition-colors">
                    <td class="py-2.5 px-3 font-mono text-emerald-400">#${item.id_almacen}</td>
                    <td class="py-2.5 px-3 font-semibold text-white">${item.nombre_producto}</td>
                    <td class="py-2.5 px-3 font-mono text-slate-300">Est. ${item.estanteria} (F:${item.fila}, C:${item.columna})</td>
                    <td class="py-2.5 px-3 font-bold text-sky-400">${item.cantidad} u.</td>
                    <td class="py-2.5 px-3 text-right">
                        <button onclick="eliminarUbicacion(${item.id_almacen})" class="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg text-xs font-bold transition-all">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;

            if (selectLote) {
                selectLote.innerHTML += `
                    <option value="${item.id_almacen}" data-texto="[ID: ${item.id_almacen}] ${item.nombre_producto} (Est. ${item.estanteria})">
                        [ID: ${item.id_almacen}] ${item.nombre_producto} — Est. ${item.estanteria} (Disp: ${item.cantidad})
                    </option>
                `;
            }
        });

        cargarTodasLasTareasAdmin();
    } catch (error) {
        console.error("Error:", error);
    }
}

async function cargarInventarioSilencioso() {
    try {
        const respuesta = await fetch(`${API_URL}/api/almacen`);
        const datos = await respuesta.json();
        const tbody = document.getElementById("tabla-inventario");
        if (!tbody) return;
        
        tbody.innerHTML = "";
        datos.forEach(item => {
            tbody.innerHTML += `
                <tr class="hover:bg-slate-700/30 transition-colors">
                    <td class="py-2.5 px-3 font-mono text-emerald-400">#${item.id_almacen}</td>
                    <td class="py-2.5 px-3 font-semibold text-white">${item.nombre_producto}</td>
                    <td class="py-2.5 px-3 font-mono text-slate-300">Est. ${item.estanteria} (F:${item.fila}, C:${item.columna})</td>
                    <td class="py-2.5 px-3 font-bold text-sky-400">${item.cantidad} u.</td>
                    <td class="py-2.5 px-3 text-right">
                        <button onclick="eliminarUbicacion(${item.id_almacen})" class="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg text-xs font-bold transition-all">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        cargarTodasLasTareasAdmin();
    } catch (error) {
        console.error("Error en sincronización silenciosa:", error);
    }
}

function agregarItemALote() {
    const select = document.getElementById("lote-select-ubicacion");
    const cantidadInput = document.getElementById("lote-cantidad-item");
    
    if (!select.value || !cantidadInput.value) {
        alert("Selecciona un producto y una cantidad.");
        return;
    }

    const idAlmacen = parseInt(select.value);
    const cantidad = parseInt(cantidadInput.value);
    const textoOption = select.options[select.selectedIndex].getAttribute("data-texto");

    itemsLoteActual.push({ id_almacen: idAlmacen, cantidad_a_buscar: cantidad, texto: textoOption });
    actualizarTablaItemsLote();
    
    select.value = "";
    cantidadInput.value = "";
}

function actualizarTablaItemsLote() {
    const tbody = document.getElementById("tabla-items-lote");
    if(!tbody) return;
    tbody.innerHTML = "";
    itemsLoteActual.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td class="py-1.5 px-2 text-slate-200">${item.texto}</td>
                <td class="py-1.5 px-2 font-bold text-amber-400">${item.cantidad_a_buscar} u.</td>
                <td class="py-1.5 px-2 text-right">
                    <button type="button" onclick="quitarItemLote(${index})" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function quitarItemLote(index) {
    itemsLoteActual.splice(index, 1);
    actualizarTablaItemsLote();
}

async function crearLoteAdmin(event) {
    event.preventDefault();
    if (itemsLoteActual.length === 0) {
        alert("Añade al menos un ítem al lote.");
        return;
    }

    const datosLote = {
        id_operario: parseInt(document.getElementById("lote-operario").value),
        nombre_lote: document.getElementById("lote-nombre").value,
        items: itemsLoteActual.map(i => ({ id_almacen: i.id_almacen, cantidad_a_buscar: i.cantidad_a_buscar }))
    };

    try {
        const respuesta = await fetch(`${API_URL}/api/admin/tarea-agrupada`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosLote)
        });

        if (respuesta.ok) {
            document.getElementById("form-lote").reset();
            itemsLoteActual = [];
            actualizarTablaItemsLote();
            cargarTodasLasTareasAdmin();
            alert("¡Lote de picking agrupado enviado al operario correctamente!");
        } else {
            alert("Error al crear el lote.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

async function agregarProductoAdmin(event) {
    event.preventDefault();
    const nuevoProd = {
        nombre_producto: document.getElementById("nombre_producto").value,
        estanteria: document.getElementById("estanteria").value,
        fila: parseInt(document.getElementById("fila").value),
        columna: parseInt(document.getElementById("columna").value),
        cantidad: parseInt(document.getElementById("cantidad").value)
    };
    enviarProductoAPI(nuevoProd, "form-producto");
}

async function agregarStockOperario(event) {
    event.preventDefault();
    const nuevoProd = {
        nombre_producto: document.getElementById("op_nombre_producto").value,
        estanteria: document.getElementById("op_estanteria").value,
        fila: parseInt(document.getElementById("op_fila").value),
        columna: parseInt(document.getElementById("op_columna").value),
        cantidad: parseInt(document.getElementById("op_cantidad").value)
    };
    enviarProductoAPI(nuevoProd, "form-recepcion-op", "¡Entrada de mercancía registrada con éxito!");
}

async function enviarProductoAPI(datosProd, formularioId, mensajeExito = "¡Stock y ubicación actualizados con éxito!") {
    try {
        const respuesta = await fetch(`${API_URL}/api/admin/producto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosProd)
        });

        if (respuesta.ok) {
            document.getElementById(formularioId).reset();
            alert(mensajeExito);
            if (perfilActual === 'admin') cargarInventario();
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

async function eliminarUbicacion(idAlmacen) {
    if (!confirm("¿Eliminar ubicación?")) return;
    await fetch(`${API_URL}/api/admin/almacen/${idAlmacen}`, { method: "DELETE" });
    cargarInventario();
}

async function cargarTodasLasTareasAdmin() {
    try {
        const respuesta = await fetch(`${API_URL}/api/admin/tareas`);
        const tareas = await respuesta.json();
        const tbody = document.getElementById("tabla-todas-tareas");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (tareas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500">No hay tareas.</td></tr>`;
            return;
        }

        tareas.forEach(t => {
            tbody.innerHTML += `
                <tr class="hover:bg-slate-700/30 transition-colors">
                    <td class="py-2.5 px-3 font-mono text-emerald-400">#${t.id_tarea}</td>
                    <td class="py-2.5 px-3 font-semibold text-white">${t.operario}</td>
                    <td class="py-2.5 px-3 text-xs text-slate-300"><span class="text-amber-400 font-bold">[${t.id_lote}]</span> ${t.nombre_producto}</td>
                    <td class="py-2.5 px-3 font-bold text-sky-400">${t.cantidad_a_buscar} u.</td>
                    <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-xs font-bold ${t.estado_tarea=='Pendiente'?'bg-amber-500/20 text-amber-300':'bg-emerald-500/20 text-emerald-300'}">${t.estado_tarea}</span></td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error:", error);
    }
}

async function cargarTareas(idOperario) {
    try {
        const respuesta = await fetch(`${API_URL}/api/tareas/${idOperario}`);
        const tareas = await respuesta.json();
        const tbody = document.getElementById("tabla-tareas");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (tareas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">No hay tareas pendientes.</td></tr>`;
            return;
        }

        tareas.forEach(t => {
            const advertenciaStock = t.stock_disponible < t.cantidad_a_buscar 
                ? `<div class="text-xs text-amber-400 font-semibold mb-1"><i class="fa-solid fa-triangle-exclamation"></i> Stock insuficiente (Hay ${t.stock_disponible} u.)</div>` 
                : '';

            tbody.innerHTML += `
                <tr class="hover:bg-slate-700/30 transition-colors">
                    <td class="py-3 px-4 font-mono text-emerald-400"><span class="text-amber-400 font-bold">[${t.id_lote}]</span> #${t.id_tarea}</td>
                    <td class="py-3 px-4 font-semibold text-white">${t.nombre_producto}</td>
                    <td class="py-3 px-4 font-mono text-slate-300">Est. ${t.estanteria} (F:${t.fila}, C:${t.columna})</td>
                    <td class="py-3 px-4 font-bold text-amber-400">${t.cantidad_a_buscar} u. ${advertenciaStock}</td>
                    <td class="py-3 px-4 text-right">
                        <div class="flex flex-col space-y-2 items-end">
                            <input type="text" id="nota-${t.id_tarea}" placeholder="Nota de incidencia..." class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
                            <div class="flex space-x-2">
                                <button onclick="completarTareaParcial(${t.id_tarea})" class="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all">Parcial / Falta</button>
                                <button onclick="completarTarea(${t.id_tarea})" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all">OK Completo</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error:", error);
    }
}

async function cargarTareasSilencioso(idOperario) {
    try {
        const respuesta = await fetch(`${API_URL}/api/tareas/${idOperario}`);
        const tareas = await respuesta.json();
        const tbody = document.getElementById("tabla-tareas");
        if (!tbody) return;

        if (tareas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">No hay tareas pendientes.</td></tr>`;
            return;
        }

        const inputFocado = document.activeElement && document.activeElement.id.startsWith("nota-");
        if (!inputFocado) {
            let htmlContenido = "";
            tareas.forEach(t => {
                const advertenciaStock = t.stock_disponible < t.cantidad_a_buscar 
                    ? `<div class="text-xs text-amber-400 font-semibold mb-1"><i class="fa-solid fa-triangle-exclamation"></i> Stock insuficiente (Hay ${t.stock_disponible} u.)</div>` 
                    : '';

                htmlContenido += `
                    <tr class="hover:bg-slate-700/30 transition-colors">
                        <td class="py-3 px-4 font-mono text-emerald-400"><span class="text-amber-400 font-bold">[${t.id_lote}]</span> #${t.id_tarea}</td>
                        <td class="py-3 px-4 font-semibold text-white">${t.nombre_producto}</td>
                        <td class="py-3 px-4 font-mono text-slate-300">Est. ${t.estanteria} (F:${t.fila}, C:${t.columna})</td>
                        <td class="py-3 px-4 font-bold text-amber-400">${t.cantidad_a_buscar} u. ${advertenciaStock}</td>
                        <td class="py-3 px-4 text-right">
                            <div class="flex flex-col space-y-2 items-end">
                                <input type="text" id="nota-${t.id_tarea}" placeholder="Nota de incidencia..." class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
                                <div class="flex space-x-2">
                                    <button onclick="completarTareaParcial(${t.id_tarea})" class="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all">Parcial / Falta</button>
                                    <button onclick="completarTarea(${t.id_tarea})" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all">OK Completo</button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = htmlContenido;
        }
    } catch (error) {
        console.error("Error en tareas silenciosas:", error);
    }
}

async function completarTarea(idTarea) {
    try {
        const respuesta = await fetch(`${API_URL}/api/operario/completar/${idTarea}`, { method: "POST" });
        const data = await respuesta.json();
        if (respuesta.ok) {
            alert(data.alerta_cierre || "¡Tarea completada!");
            cargarTareas(idOperarioActual);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

async function completarTareaParcial(idTarea) {
    const notaTexto = document.getElementById(`nota-${idTarea}`).value || "Stock insuficiente";
    try {
        const respuesta = await fetch(`${API_URL}/api/operario/completar-parcial/${idTarea}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nota: notaTexto })
        });
        const data = await respuesta.json();
        if (respuesta.ok) {
            alert(data.alerta_cierre || "¡Incidencia registrada!");
            cargarTareas(idOperarioActual);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
