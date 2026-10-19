// Heatmap interactivo de adopción de lenguajes (sección 6.2 del notebook).
// Datos: data/adopcion_lenguajes.json, generado por notebooks/analisis.ipynb.
// Versiones exactas fijadas; Plot 0.6.17 importa internamente d3@7.9.0, así que solo se carga una copia.
import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const RUTA_DATOS = "data/adopcion_lenguajes.json";
const MIN_MUESTRA = 30;
const RANGOS = ["0-2", "3-5", "6-10", "11-15", "16-20", "20+"];
const DOMINIO_COLOR = [0, 100]; // fijo: no se reescala al cambiar de país o segmento

const SEGMENTOS = {
  dev: { valor: "Desarrollo (contribuidor individual)", corto: "Desarrollo" },
  lider: { valor: "Liderazgo y dirección", corto: "Liderazgo y dirección" },
};

// Nombres en español para la interfaz; cualquier país no listado se muestra como viene en la encuesta
const NOMBRES_PAIS = {
  "United States of America": "Estados Unidos",
  "Germany": "Alemania",
  "India": "India",
  "Ukraine": "Ucrania",
  "United Kingdom of Great Britain and Northern Ireland": "Reino Unido",
  "Canada": "Canadá",
  "France": "Francia",
  "Poland": "Polonia",
  "Netherlands": "Países Bajos",
  "Brazil": "Brasil",
  "Italy": "Italia",
  "Australia": "Australia",
  "Spain": "España",
  "Sweden": "Suecia",
  "Russian Federation": "Rusia",
  "Austria": "Austria",
  "Switzerland": "Suiza",
};
// Etiquetas cortas del eje Y para que quepan en móvil; el tooltip conserva el nombre completo
const ETIQUETAS_LENGUAJE = { "Bash/Shell (all shells)": "Bash/Shell" };

const nombrePais = (p) => (p === "Todos" ? "Todos los países" : NOMBRES_PAIS[p] ?? p);

const fmtEntero = d3.format(",");
const fmtPct = (v) => `${v.toFixed(1)}%`;

// Rampa azul recortada para que el tono más claro no se confunda con el gris de "muestra insuficiente"
const interpolarAzul = (t) => d3.interpolateBlues(0.12 + 0.88 * t);
const UMBRAL_TEXTO_CLARO = 55; // a partir de este %, el texto de la celda va en blanco

const $pais = document.getElementById("filtro-pais");
const $segmento = document.getElementById("filtro-segmento");
const $paneles = document.getElementById("paneles");
const $leyenda = document.getElementById("leyenda");
const $tabla = document.getElementById("tabla");

const css = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();

let filas = [];
let lenguajes = [];
const estado = { pais: "Todos", segmento: "ambos" };

// ---------------------------------------------------------------------------
// Estado en la URL (#pais=...&segmento=...) para compartir una vista concreta
// ---------------------------------------------------------------------------

function leerHash(paisesValidos) {
  const params = new URLSearchParams(location.hash.slice(1));
  const pais = params.get("pais");
  const segmento = params.get("segmento");
  if (pais && paisesValidos.has(pais)) estado.pais = pais;
  if (segmento && ["ambos", "dev", "lider"].includes(segmento)) estado.segmento = segmento;
}

function escribirHash() {
  const params = new URLSearchParams({ pais: estado.pais, segmento: estado.segmento });
  history.replaceState(null, "", `#${params}`);
}

// ---------------------------------------------------------------------------
// Construcción de un panel (un segmento)
// ---------------------------------------------------------------------------

function textoTooltip(d) {
  const cabecera = `${d.lenguaje} · ${d.rango} años\n${d.segmentoCorto} · ${nombrePais(d.pais)}`;
  if (d.total < MIN_MUESTRA) {
    return `${cabecera}\nMuestra insuficiente (n = ${fmtEntero(d.total)} < ${MIN_MUESTRA})`;
  }
  return `${cabecera}\n${fmtPct(d.p)} (IC 95% Wilson: ${fmtPct(d.li)}–${fmtPct(d.ls)})\n` +
    `${fmtEntero(d.usuarios)} de ${fmtEntero(d.total)} encuestados`;
}

function panel(datos, segmento, ancho) {
  const nPorRango = new Map(RANGOS.map((r) => [r, datos.find((d) => d.rango === r)?.total ?? 0]));
  const nTotal = d3.sum(nPorRango.values());
  const suficientes = datos.filter((d) => d.total >= MIN_MUESTRA);
  const compacto = ancho < 480;

  const grafico = Plot.plot({
    width: ancho,
    height: lenguajes.length * (compacto ? 32 : 36) + 82,
    marginLeft: compacto ? 72 : 84,
    marginBottom: 56,
    marginTop: 4,
    style: { fontSize: compacto ? "11px" : "12px", background: "transparent" },
    x: {
      domain: RANGOS,
      label: "Años de experiencia profesional →",
      labelAnchor: "center",
      labelOffset: 52,
      tickSize: 0,
      tickFormat: (r) => `${r}\nn=${fmtEntero(nPorRango.get(r))}`,
    },
    y: { domain: lenguajes, label: null, tickSize: 0, tickFormat: (l) => ETIQUETAS_LENGUAJE[l] ?? l },
    color: { type: "linear", domain: DOMINIO_COLOR, interpolate: interpolarAzul },
    marks: [
      Plot.cell(datos, {
        x: "rango",
        y: "lenguaje",
        fill: (d) => (d.total >= MIN_MUESTRA ? d.p : null),
        inset: 1,
        rx: 2,
      }),
      // Celdas con muestra insuficiente: gris y sin porcentaje
      Plot.cell(datos.filter((d) => d.total < MIN_MUESTRA), {
        x: "rango", y: "lenguaje", fill: css("--celda-insuficiente"), inset: 1, rx: 2,
      }),
      Plot.text(suficientes, {
        x: "rango",
        y: "lenguaje",
        text: (d) => `${Math.round(d.p)}%`,
        fill: (d) => (d.p >= UMBRAL_TEXTO_CLARO ? "#ffffff" : "#1d2430"),
        fontSize: compacto ? 10.5 : 11.5,
        fontWeight: 500,
      }),
      Plot.tip(datos, Plot.pointer({
        x: "rango",
        y: "lenguaje",
        title: textoTooltip,
        lineHeight: 1.35,
        fill: css("--fondo"),
        stroke: css("--borde"),
      })),
    ],
  });
  grafico.setAttribute("role", "img");
  grafico.setAttribute("aria-label",
    `Mapa de calor de adopción de lenguajes por rango de experiencia, ${segmento.corto}, ${nombrePais(estado.pais)}`);

  const contenedor = document.createElement("article");
  contenedor.className = "panel";
  contenedor.innerHTML = `<h2>${segmento.valor}</h2>
    <p class="panel-n">n = ${fmtEntero(nTotal)} encuestados que respondieron la pregunta de lenguajes</p>`;
  if (suficientes.length === 0) {
    const aviso = document.createElement("p");
    aviso.className = "panel-aviso";
    aviso.textContent = `Ningún rango alcanza ${MIN_MUESTRA} encuestados en este país; elige «Todos los países» ` +
      "o un país con más respuestas para ver porcentajes.";
    contenedor.append(aviso);
  }
  contenedor.append(grafico);
  return contenedor;
}

// ---------------------------------------------------------------------------
// Render de la vista completa
// ---------------------------------------------------------------------------

function segmentosVisibles() {
  return estado.segmento === "ambos" ? [SEGMENTOS.dev, SEGMENTOS.lider] : [SEGMENTOS[estado.segmento]];
}

function render() {
  const visibles = segmentosVisibles();
  const anchoDisponible = $paneles.clientWidth;
  const columnas = visibles.length > 1 && anchoDisponible >= 908 ? 2 : 1;
  const ancho = Math.floor((anchoDisponible - (columnas - 1) * 28) / columnas);
  const anchoPanel = Math.min(ancho, visibles.length === 1 ? 760 : ancho);

  $paneles.replaceChildren(...visibles.map((seg) => {
    const datos = filas
      .filter((d) => d.pais === estado.pais && d.segmento === seg.valor)
      .map((d) => ({ ...d, segmentoCorto: seg.corto }));
    return panel(datos, seg, anchoPanel);
  }));
  renderTabla(visibles);
}

function renderLeyenda() {
  const escala = Plot.legend({
    color: { type: "linear", domain: DOMINIO_COLOR, interpolate: interpolarAzul },
    label: "% de adopción dentro del grupo",
    tickFormat: (v) => `${v}%`,
    width: 280,
    style: { background: "transparent" },
  });
  const insuficiente = document.createElement("span");
  insuficiente.className = "muestra-insuficiente";
  insuficiente.textContent = `Muestra insuficiente (n < ${MIN_MUESTRA})`;
  $leyenda.replaceChildren(escala, insuficiente);
}

function renderTabla(visibles) {
  const nombres = new Map(visibles.map((s) => [s.valor, s.corto]));
  const datos = filas.filter((d) => d.pais === estado.pais && nombres.has(d.segmento));
  const cuerpo = datos.map((d) => {
    const valor = d.total >= MIN_MUESTRA
      ? `<td class="num">${fmtPct(d.p)}</td><td class="num">${fmtPct(d.li)}–${fmtPct(d.ls)}</td>`
      : `<td colspan="2">Muestra insuficiente</td>`;
    return `<tr><td>${nombres.get(d.segmento)}</td><td>${d.lenguaje}</td><td>${d.rango}</td>${valor}` +
      `<td class="num">${fmtEntero(d.usuarios)} / ${fmtEntero(d.total)}</td></tr>`;
  }).join("");
  $tabla.innerHTML = `<table>
    <caption class="sr-only">Adopción de lenguajes, ${nombrePais(estado.pais)}</caption>
    <thead><tr><th>Segmento</th><th>Lenguaje</th><th>Rango</th><th>% adopción</th><th>IC 95%</th>
    <th>Usuarios / total</th></tr></thead><tbody>${cuerpo}</tbody></table>`;
}

function poblarPaises() {
  const nPorPais = d3.rollup(
    filas.filter((d) => d.lenguaje === lenguajes[0]), (v) => d3.sum(v, (d) => d.total), (d) => d.pais,
  );
  const paises = [...nPorPais.keys()].filter((p) => p !== "Todos")
    .sort((a, b) => d3.descending(nPorPais.get(a), nPorPais.get(b)));
  $pais.replaceChildren(...["Todos", ...paises].map((p) => {
    const opcion = new Option(`${nombrePais(p)} (n = ${fmtEntero(nPorPais.get(p))})`, p);
    opcion.selected = p === estado.pais;
    return opcion;
  }));
  return new Set(nPorPais.keys());
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

async function iniciar() {
  try {
    filas = await d3.json(RUTA_DATOS);
  } catch (error) {
    $paneles.innerHTML = `<p class="estado error">No se pudieron cargar los datos (${error.message}).
      Si abriste el archivo directamente, sírvelo con <code>python3 -m http.server</code> dentro de <code>docs/</code>.</p>`;
    return;
  }
  lenguajes = [...new Set(filas.map((d) => d.lenguaje))]; // el JSON viene ordenado por frecuencia global

  leerHash(poblarPaises());
  $pais.value = estado.pais;
  $segmento.querySelector(`input[value="${estado.segmento}"]`).checked = true;

  $pais.addEventListener("change", () => { estado.pais = $pais.value; escribirHash(); render(); });
  $segmento.addEventListener("change", (e) => { estado.segmento = e.target.value; escribirHash(); render(); });

  renderLeyenda();
  render();

  let ultimoAncho = $paneles.clientWidth;
  new ResizeObserver(() => {
    if (Math.abs($paneles.clientWidth - ultimoAncho) < 8) return;
    ultimoAncho = $paneles.clientWidth;
    render();
  }).observe($paneles);

  // Re-render al cambiar el tema del sistema: los grises y el fondo del tooltip se leen de CSS
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
}

iniciar();
