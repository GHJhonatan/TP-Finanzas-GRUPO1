// Estado global de la aplicación (Base de Datos Local)
let listaClientes = [];

// Manejo de Interfaz y Navegación
function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('form-login').classList.toggle('hidden', !isLogin);
    document.getElementById('form-register').classList.toggle('hidden', isLogin);
    
    document.getElementById('tab-login').className = isLogin 
        ? 'flex-1 py-2 text-xs font-bold rounded-lg transition bg-white text-teal-700 shadow-sm'
        : 'flex-1 py-2 text-xs font-bold rounded-lg transition text-slate-500 hover:text-slate-800';
    
    document.getElementById('tab-register').className = !isLogin 
        ? 'flex-1 py-2 text-xs font-bold rounded-lg transition bg-white text-amber-700 shadow-sm'
        : 'flex-1 py-2 text-xs font-bold rounded-lg transition text-slate-500 hover:text-slate-800';
}

function handleLogin(e) {
    e.preventDefault();
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    // Limpiar pantalla inicial
    resetearPantallaSimulador();
    actualizarSelectClientes();
}

function handleRegister(e) {
    e.preventDefault();
    alert('¡Establecimiento registrado con éxito! Bienvenido a CrediBarrio.');
    handleLogin(e);
}

function handleLogout() {
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
}

function switchNav(nav) {
    const views = ['simulador', 'convertidor', 'clientes'];
    views.forEach(v => {
        document.getElementById(`view-${v}`).classList.toggle('hidden', v !== nav);
        const btn = document.getElementById(`nav-${v}`);
        if (v === nav) {
            btn.className = 'px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 bg-teal-600 text-white shadow';
        } else {
            btn.className = 'px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 text-slate-300 hover:text-white';
        }
    });
}

// Resetear pantalla del simulador a estado inicial (Vacío)
function resetearPantallaSimulador() {
    document.getElementById('sim-cliente').value = '';
    document.getElementById('sim-dni').value = '';
    document.getElementById('sim-monto').value = '';
    document.getElementById('sim-plazo').value = '';
    document.getElementById('sim-tasa').value = '';
    
    document.getElementById('kpi-cuota').innerText = 'S/ 0.00';
    document.getElementById('kpi-interes').innerText = 'S/ 0.00';
    document.getElementById('kpi-total').innerText = 'S/ 0.00';
    
    const tbody = document.getElementById('tabla-amortizacion');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="p-8 text-center text-slate-400">
                <i class="fa-solid fa-folder-open text-2xl mb-2 block text-slate-300"></i>
                No hay datos calculados. Ingrese los parámetros del crédito y haga clic en <b>"Generar Cronograma"</b>.
            </td>
        </tr>
    `;
}

// Agregar Nuevo Cliente
function registrarCliente(e) {
    e.preventDefault();
    const nombre = document.getElementById('reg-cli-nombre').value.trim();
    const dni = document.getElementById('reg-cli-dni').value.trim();
    const limite = parseFloat(document.getElementById('reg-cli-limite').value) || 0;

    if (!nombre || !dni || limite <= 0) {
        alert('Por favor complete todos los datos del cliente correctamente.');
        return;
    }

    const cliente = { id: Date.now(), nombre, dni, limite, deudaActual: 0 };
    listaClientes.push(cliente);

    // Limpiar formulario de registro de cliente
    document.getElementById('reg-cli-nombre').value = '';
    document.getElementById('reg-cli-dni').value = '';
    document.getElementById('reg-cli-limite').value = '';

    actualizarSelectClientes();
    renderizarListaClientes();
    alert(`Cliente ${nombre} registrado con éxito.`);
}

function actualizarSelectClientes() {
    const select = document.getElementById('sim-cliente');
    if (!select) return;

    if (listaClientes.length === 0) {
        select.innerHTML = '<option value="">-- No hay clientes. Regístrelos en el módulo Clientes --</option>';
        return;
    }

    select.innerHTML = '<option value="">-- Seleccionar Cliente Registrado --</option>';
    listaClientes.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nombre} (DNI: ${c.dni}) - Límit: S/ ${c.limite}</option>`;
    });
}

// Al seleccionar un cliente en el dropdown, autocompletar DNI
document.getElementById('sim-cliente')?.addEventListener('change', (e) => {
    const id = parseInt(e.target.value);
    const cliente = listaClientes.find(c => c.id === id);
    if (cliente) {
        document.getElementById('sim-dni').value = cliente.dni;
    } else {
        document.getElementById('sim-dni').value = '';
    }
});

// Escuchar cambios en selector de gracia
document.getElementById('sim-gracia-tipo')?.addEventListener('change', (e) => {
    document.getElementById('box-gracia-meses').classList.toggle('hidden', e.target.value === 'ninguno');
});

// MOTOR FINANCIERO: Método Francés Vencido (Base 30/360)
function calcularCredito(e) {
    if (e) e.preventDefault();

    const monto = parseFloat(document.getElementById('sim-monto').value) || 0;
    const moneda = document.getElementById('sim-moneda').value;
    const plazo = parseInt(document.getElementById('sim-plazo').value) || 0;
    let tasaInput = parseFloat(document.getElementById('sim-tasa').value) / 100 || 0;
    const tipoTasa = document.getElementById('sim-tipo-tasa').value;
    const graciaTipo = document.getElementById('sim-gracia-tipo').value;
    const graciaMeses = graciaTipo !== 'ninguno' ? (parseInt(document.getElementById('sim-gracia-meses').value) || 0) : 0;

    if (monto <= 0 || plazo <= 0 || tasaInput <= 0) {
        alert('Por favor ingrese valores mayores a cero en Monto, Plazo y Tasa de Interés.');
        return;
    }

    // Conversión de Tasa a TEM (Tasa Efectiva Mensual)
    let TEM = 0;
    if (tipoTasa === 'TEM') TEM = tasaInput;
    else if (tipoTasa === 'TEA') TEM = Math.pow(1 + tasaInput, 1 / 12) - 1;
    else if (tipoTasa === 'TNM') TEM = tasaInput;
    else if (tipoTasa === 'TNA') TEM = tasaInput / 12;

    let saldo = monto;
    let cronograma = [];
    let totalIntereses = 0;

    // Períodos de Gracia
    for (let i = 1; i <= graciaMeses; i++) {
        let interes = saldo * TEM;
        if (graciaTipo === 'parcial') {
            cronograma.push({ n: i, evento: 'Gracia Parcial', cuota: interes, interes: interes, amortizacion: 0, saldo: saldo });
            totalIntereses += interes;
        } else if (graciaTipo === 'total') {
            saldo += interes; // Capitalización
            cronograma.push({ n: i, evento: 'Gracia Total', cuota: 0, interes: interes, amortizacion: 0, saldo: saldo });
            totalIntereses += interes;
        }
    }

    // Períodos de Amortización Restantes
    const nRestante = plazo - graciaMeses;
    let cuotaRegular = 0;

    if (nRestante > 0) {
        cuotaRegular = (saldo * TEM) / (1 - Math.pow(1 + TEM, -nRestante));

        for (let i = graciaMeses + 1; i <= plazo; i++) {
            let interes = saldo * TEM;
            let amortizacion = cuotaRegular - interes;
            saldo -= amortizacion;
            if (saldo < 0.01) saldo = 0;

            cronograma.push({ n: i, evento: 'Cuota Regular', cuota: cuotaRegular, interes: interes, amortizacion: amortizacion, saldo: saldo });
            totalIntereses += interes;
        }
    }

    // Renderizar KPIs
    document.getElementById('kpi-cuota').innerText = `${moneda} ${cuotaRegular.toFixed(2)}`;
    document.getElementById('kpi-interes').innerText = `${moneda} ${totalIntereses.toFixed(2)}`;
    document.getElementById('kpi-total').innerText = `${moneda} ${(monto + totalIntereses).toFixed(2)}`;

    // Renderizar Tabla
    const tbody = document.getElementById('tabla-amortizacion');
    tbody.innerHTML = '';

    cronograma.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
        tr.innerHTML = `
            <td class="p-3 font-bold text-slate-800">${row.n}</td>
            <td class="p-3"><span class="px-2 py-0.5 text-[10px] rounded-md font-bold ${
                row.evento === 'Cuota Regular' ? 'bg-emerald-100 text-emerald-800' :
                row.evento === 'Gracia Parcial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
            }">${row.evento}</span></td>
            <td class="p-3 font-bold text-slate-900">${moneda} ${row.cuota.toFixed(2)}</td>
            <td class="p-3 text-amber-600">${moneda} ${row.interes.toFixed(2)}</td>
            <td class="p-3 text-teal-600">${moneda} ${row.amortizacion.toFixed(2)}</td>
            <td class="p-3 font-medium text-slate-700">${moneda} ${row.saldo.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Convertidor de Tasas
function convertirTasas() {
    const val = parseFloat(document.getElementById('conv-valor').value) / 100 || 0;
    const m = parseInt(document.getElementById('conv-periodos').value) || 12;
    const desde = document.getElementById('conv-desde').value;
    const hacia = document.getElementById('conv-hacia').value;

    let res = 0;
    let txt = '';

    if (desde === 'TNA' && hacia === 'TEM') {
        res = (val / m) * 100;
        txt = `TEM = TNA / ${m}`;
    } else if (desde === 'TEA' && hacia === 'TEM') {
        res = (Math.pow(1 + val, 1 / 12) - 1) * 100;
        txt = `TEM = (1 + TEA)^(1/12) - 1`;
    }

    document.getElementById('conv-resultado').innerText = `${res.toFixed(4)}% ${hacia}`;
    document.getElementById('conv-formula').innerText = `Fórmula aplicada: ${txt}`;
}

// Calculadora de Moras
function calcularMora() {
    const monto = parseFloat(document.getElementById('mora-monto').value) || 0;
    const dias = parseInt(document.getElementById('mora-dias').value) || 0;
    const tasaDiaria = parseFloat(document.getElementById('mora-tasa').value) / 100 || 0;

    const mora = monto * tasaDiaria * dias;
    document.getElementById('res-mora-monto').innerText = `S/ ${mora.toFixed(2)}`;
    document.getElementById('res-mora-total').innerText = `S/ ${(monto + mora).toFixed(2)}`;
}

function renderizarListaClientes() {
    const cont = document.getElementById('contenedor-lista-clientes');
    if (!cont) return;

    if (listaClientes.length === 0) {
        cont.innerHTML = '<p class="text-xs text-slate-400">No hay clientes registrados aún.</p>';
        return;
    }

    cont.innerHTML = '';
    listaClientes.forEach(c => {
        const pct = Math.min((c.deudaActual / c.limite) * 100, 100);
        cont.innerHTML += `
            <div class="bg-white p-3 rounded-xl border border-slate-200">
                <div class="flex justify-between font-bold text-slate-800 mb-1 text-xs">
                    <span>${c.nombre} (DNI: ${c.dni})</span>
                    <span class="text-teal-600">S/ ${c.deudaActual.toFixed(2)} / S/ ${c.limite.toFixed(2)}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2">
                    <div class="bg-teal-500 h-2 rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    });
}