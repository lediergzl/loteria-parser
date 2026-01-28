/**
 * Ejemplo de uso en navegadores web
 * Puede usarse directamente en un archivo HTML
 */

// Si se usa con módulos ES6:
// import { parseJugada, createParser } from 'loteria-parser';

// Si se usa con script tag (global):
// const { parseJugada, createParser } = window.loteriaParser;

console.log('🌐 Loteria Parser - Uso en Navegador\n');

// Función para mostrar resultados en la página
function mostrarResultado(elementId, contenido) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = contenido;
  } else {
    console.log(contenido);
  }
}

// ============================================
// 1. INTERFAZ BÁSICA
// ============================================

function crearInterfazBasica() {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333;">🎰 Loteria Parser Web</h1>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0;">📝 Ingrese jugadas:</h3>
        <textarea 
          id="jugadaInput" 
          style="width: 100%; height: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace;"
          placeholder="Ejemplo:&#10;Zuzel&#10;33 25 88 7 14 con 20 y 30 p5&#10;Total: 500"
        ></textarea>
        
        <div style="margin-top: 10px;">
          <button id="btnProcesar" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Procesar Jugada
          </button>
          <button id="btnLimpiar" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
            Limpiar
          </button>
        </div>
      </div>
      
      <div id="resultadoContainer" style="display: none;">
        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #2e7d32;">📊 Resultados</h3>
          <div id="resultado"></div>
        </div>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #ef6c00;">⚠️ Errores y Advertencias</h3>
          <div id="errores"></div>
        </div>
      </div>
      
      <div style="margin-top: 30px; font-size: 12px; color: #666;">
        <p>💡 <strong>Formato soportado:</strong></p>
        <ul>
          <li><code>05 10 15 con 20</code> - Apuesta fija</li>
          <li><code>05 10 15 con 20 y 30</code> - Fijo y corrido</li>
          <li><code>25*33 parle con 5</code> - Parle explícito</li>
          <li><code>05 10 15 con 20 p5</code> - Parle inline</li>
          <li><code>10v 20v con 10</code> - Volteos</li>
        </ul>
      </div>
    </div>
  `;
  
  document.body.innerHTML = html;
  
  // Configurar eventos
  document.getElementById('btnProcesar').addEventListener('click', procesarJugadaWeb);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarInterfaz);
}

// ============================================
// 2. PROCESAMIENTO EN NAVEGADOR
// ============================================

function procesarJugadaWeb() {
  const input = document.getElementById('jugadaInput');
  const resultadoContainer = document.getElementById('resultadoContainer');
  const resultadoDiv = document.getElementById('resultado');
  const erroresDiv = document.getElementById('errores');
  
  if (!input || !input.value.trim()) {
    alert('Por favor ingrese una jugada');
    return;
  }
  
  try {
    // Mostrar loading
    resultadoDiv.innerHTML = '<p style="color: #666;">Procesando...</p>';
    resultadoContainer.style.display = 'block';
    
    // Parsear la jugada
    const resultado = parseJugada(input.value);
    
    // Mostrar resultados
    let htmlResultado = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 20px;">
        <div style="background: white; padding: 15px; border-radius: 4px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #007bff;">${resultado.jugadas.length}</div>
          <div style="font-size: 12px; color: #666;">JUGADORES</div>
        </div>
        <div style="background: white; padding: 15px; border-radius: 4px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #28a745;">$${resultado.summary.totalCalculado.toFixed(2)}</div>
          <div style="font-size: 12px; color: #666;">TOTAL CALCULADO</div>
        </div>
        <div style="background: white; padding: 15px; border-radius: 4px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: ${resultado.summary.isValid ? '#28a745' : '#dc3545'};">${resultado.summary.isValid ? '✅' : '❌'}</div>
          <div style="font-size: 12px; color: #666;">VÁLIDO</div>
        </div>
        <div style="background: white; padding: 15px; border-radius: 4px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #6f42c1;">${resultado.metadata.parseTime}ms</div>
          <div style="font-size: 12px; color: #666;">TIEMPO</div>
        </div>
      </div>
    `;
    
    // Mostrar jugadores
    if (resultado.jugadas.length > 0) {
      htmlResultado += '<h4 style="margin-top: 20px;">👥 Jugadores:</h4>';
      resultado.jugadas.forEach((jugada, index) => {
        const diferencia = jugada.totalDeclarado ? 
          Math.abs(jugada.totalCalculado - jugada.totalDeclarado) : 0;
        
        htmlResultado += `
          <div style="background: white; padding: 15px; border-radius: 4px; margin-bottom: 10px; border-left: 4px solid ${jugada.isValid ? '#28a745' : '#dc3545'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>${jugada.jugador}</strong>
              <span style="font-weight: bold; color: ${jugada.isValid ? '#28a745' : '#dc3545'};">$${jugada.totalCalculado.toFixed(2)}</span>
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">
              ${jugada.totalDeclarado ? `Declarado: $${jugada.totalDeclarado.toFixed(2)} (Diferencia: $${diferencia.toFixed(2)})` : 'Sin total declarado'} • 
              ${jugada.detalles.length} apuesta(s)
            </div>
          </div>
        `;
      });
    }
    
    resultadoDiv.innerHTML = htmlResultado;
    
    // Mostrar errores y advertencias
    let htmlErrores = '';
    
    if (resultado.metadata.errors.length > 0) {
      htmlErrores += '<h4 style="color: #dc3545;">❌ Errores:</h4>';
      resultado.metadata.errors.forEach(error => {
        htmlErrores += `<div style="background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 5px;">${error}</div>`;
      });
    }
    
    if (resultado.metadata.warnings.length > 0) {
      htmlErrores += '<h4 style="color: #856404; margin-top: 15px;">⚠️ Advertencias:</h4>';
      resultado.metadata.warnings.forEach(warning => {
        htmlErrores += `<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; margin-bottom: 5px;">${warning}</div>`;
      });
    }
    
    if (!htmlErrores) {
      htmlErrores = '<p style="color: #28a745;">✅ No hay errores ni advertencias</p>';
    }
    
    erroresDiv.innerHTML = htmlErrores;
    
    // Scroll al resultado
    resultadoContainer.scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    resultadoDiv.innerHTML = `
      <div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 4px;">
        <h4 style="margin-top: 0;">❌ Error al procesar</h4>
        <p>${error.message}</p>
      </div>
    `;
    
    erroresDiv.innerHTML = `
      <div style="background: #fff3cd; color: #856404; padding: 20px; border-radius: 4px;">
        <h4 style="margin-top: 0;">⚠️ Stack Trace</h4>
        <pre style="font-size: 11px; overflow: auto;">${error.stack}</pre>
      </div>
    `;
  }
}

// ============================================
// 3. FUNCIONES AUXILIARES
// ============================================

function limpiarInterfaz() {
  const input = document.getElementById('jugadaInput');
  const resultadoContainer = document.getElementById('resultadoContainer');
  
  if (input) input.value = '';
  if (resultadoContainer) resultadoContainer.style.display = 'none';
}

function cargarEjemplo() {
  const input = document.getElementById('jugadaInput');
  if (input) {
    input.value = `Zuzel\n33 25 88 7 14 con 20 y 30 p5\n26 78 98 45 con 1 y 3 candado con 50\n44 54 con 25\n33x25 parle con 10\n325 175 359 con 10 y 10 y 10 parle con 3\n10v 20v con 10\n15 18 por todas las centenas con 5\n10 pr 100  con 5\nTotal: 500`;
  }
}

// ============================================
// 4. EJEMPLOS INTERACTIVOS
// ============================================

function crearEjemplosInteractivos() {
  const ejemplos = [
    {
      nombre: 'Fijo Simple',
      texto: '05 10 15 con 20',
      descripcion: '3 números × $20 = $60'
    },
    {
      nombre: 'Fijo y Corrido',
      texto: '05 10 15 con 20 y 30',
      descripcion: 'Fijos: $60 + Corridos: $90 = $150'
    },
    {
      nombre: 'Parle',
      texto: '25*33 parle con 5',
      descripcion: '1 parle × $5 = $5'
    },
    {
      nombre: 'Candado',
      texto: '05 10 15 candado con 30',
      descripcion: '3 números = 3 combinaciones'
    },
    {
      nombre: 'Volteo',
      texto: '10v con 10',
      descripcion: '10 y 01 × $10 = $20'
    }
  ];
  
  let html = '<div style="margin-top: 30px;"><h3>🎯 Ejemplos rápidos:</h3><div style="display: flex; flex-wrap: wrap; gap: 10px;">';
  
  ejemplos.forEach((ejemplo, index) => {
    html += `
      <div style="background: white; border: 1px solid #ddd; border-radius: 4px; padding: 15px; flex: 1; min-width: 200px;">
        <h4 style="margin-top: 0;">${ejemplo.nombre}</h4>
        <p style="font-size: 12px; color: #666; margin-bottom: 10px;">${ejemplo.descripcion}</p>
        <button 
          onclick="cargarEjemploEspecifico('${ejemplo.texto.replace(/'/g, "\\'")}')"
          style="width: 100%; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
        >
          Probar este ejemplo
        </button>
      </div>
    `;
  });
  
  html += '</div></div>';
  
  // Agregar al DOM
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
}

// Función global para cargar ejemplos
window.cargarEjemploEspecifico = function(texto) {
  const input = document.getElementById('jugadaInput');
  if (input) {
    input.value = texto;
    // Procesar automáticamente después de 500ms
    setTimeout(procesarJugadaWeb, 500);
  }
};

// ============================================
// 5. INICIALIZACIÓN
// ============================================

// Verificar si la librería está disponible
if (typeof parseJugada === 'undefined' || typeof createParser === 'undefined') {
  console.error('❌ Loteria Parser no está disponible. Asegúrate de incluir la librería.');
  
  document.body.innerHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 30px; background: #f8d7da; color: #721c24; border-radius: 8px; text-align: center;">
      <h1 style="margin-top: 0;">❌ Error</h1>
      <p>La librería Loteria Parser no está disponible.</p>
      <p>Inclúyela en tu página con:</p>
      <pre style="background: white; padding: 10px; border-radius: 4px; text-align: left; margin: 20px 0;">
&lt;script src="https://unpkg.com/loteria-parser/dist/esm/bundle.js"&gt;&lt;/script&gt;
&lt;script&gt;
  const { parseJugada, createParser } = window.loteriaParser;
  // Tu código aquí...
&lt;/script&gt;
      </pre>
      <button onclick="location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Recargar página
      </button>
    </div>
  `;
} else {
  // Inicializar la interfaz
  crearInterfazBasica();
  crearEjemplosInteractivos();
  
  // Cargar un ejemplo por defecto
  setTimeout(cargarEjemplo, 500);
  
  console.log('✅ Loteria Parser Web inicializado correctamente');
}