// CONFIGURACIÓN
const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/1jWws-Zd2gdxIKFXs_96uXqVJ0q966-fmvUSP9MRN0KI/gviz/tq?tqx=out:csv&gid=503468732";

const PAGE_SIZE = 7;

let allData = [];
let currentPage = 0;

// UI
let recordsEl, prevBtn, nextBtn, pageInfo;

// CSV PARSER
function parseCSV(text) {
    const rows = [];
    const lines = text.trim().split("\n");

    const headers = lines[0]
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((h) => h.replace(/"/g, "").trim());

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((v) => v.replace(/"/g, "").trim());

        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = values[idx] || "";
        });

        rows.push(obj);
    }
    return rows;
}

// FECHA
function parseDate(value) {
    if (!value) return null;

    const [datePart, timePart] = value.trim().split(" ");
    if (!datePart) return null;

    const [d, m, y] = datePart.split("/").map(Number);
    const [hh = 0, mm = 0, ss = 0] = (timePart || "").split(":").map(Number);

    const date = new Date(y, m - 1, d, hh, mm, ss);
    return isNaN(date.getTime()) ? null : date;
}

// RENDER
function getTotalPages() {
    return Math.max(1, Math.ceil(allData.length / PAGE_SIZE));
}

function updatePaginationUI() {
    const totalPages = getTotalPages();

    if (currentPage < 0) currentPage = 0;
    if (currentPage > totalPages - 1) currentPage = totalPages - 1;

    const from = allData.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
    const to = Math.min((currentPage + 1) * PAGE_SIZE, allData.length);

    if (pageInfo) {
        pageInfo.textContent = `Página ${currentPage + 1} / ${totalPages} — mostrando ${from}-${to} de ${allData.length}`;
    }

    const canPrev = currentPage > 0;
    const canNext = currentPage < totalPages - 1;

    prevBtn.disabled = !canPrev;
    nextBtn.disabled = !canNext;

    prevBtn.title = canPrev ? "Ir a la página anterior" : "No hay página anterior";
    nextBtn.title = canNext ? "Ir a la página siguiente" : "No hay más registros";
}

function render() {
    recordsEl.innerHTML = "";

    if (allData.length === 0) {
        recordsEl.innerHTML = "<p>Sin registros.</p>";
        updatePaginationUI();
        return;
    }

    const start = currentPage * PAGE_SIZE;
    const page = allData.slice(start, start + PAGE_SIZE);

    page.forEach((row) => {
        const recordDiv = document.createElement("div");
        recordDiv.className = "registro";

        // FECHA
        recordDiv.innerHTML = `
      <br>
      <h3 class="titulo-bloque">
        📅 ${new Date(row.marca_temporal).toLocaleString("es-CL")}
      </h3>
    `;

        // IMÁGENES
        const imageGrid = document.createElement("div");
        imageGrid.className = "macetas";

        ["registro_a", "registro_b"].forEach((campo, i) => {
            const macetaDiv = document.createElement("div");
            macetaDiv.className = "maceta";
            macetaDiv.innerHTML = `<h2>🌿 Maceta ${i === 0 ? "A" : "B"}</h2>`;

            let fotos = [];

            if (row[campo]) {
                if (Array.isArray(row[campo])) {
                    fotos = row[campo];
                } else {
                    try {
                        const parsed = JSON.parse(row[campo]);
                        fotos = Array.isArray(parsed) ? parsed : [row[campo]];
                    } catch {
                        fotos = row[campo].split(",").map((u) => u.trim()).filter(Boolean);
                    }
                }
            }

            if (fotos.length > 0) {
                fotos.forEach((imgUrl) => {
                    const img = document.createElement("img");
                    img.src = imgUrl;
                    img.alt = `Foto Maceta ${i === 0 ? "A" : "B"}`;
                    img.loading = "lazy";
                    macetaDiv.appendChild(img);
                });
            } else {
                const placeholder = document.createElement("p");
                placeholder.textContent = "Sin fotos";
                macetaDiv.appendChild(placeholder);
            }

            imageGrid.appendChild(macetaDiv);
        });

        recordDiv.appendChild(imageGrid);

        // TEMPERATURA
        let tempHtml = `<p>🌡 Temperatura: ${row.temperatura ?? "—"} °C</p>`;
        if (row.temperatura && Number(row.temperatura) > 28.0) {
            tempHtml = `<p style="color:red" title="La temperatura sobrepasa el máximo recomendado de 28.0°C">🌡 Temperatura: ${row.temperatura} °C</p>`;
        }

        // HUMEDAD
        let humedadHtml = `<p>💧 Humedad: ${row.humedad ?? "—"} %</p>`;
        if (row.humedad && Number(row.humedad) > 65) {
            humedadHtml = `<p style="color:red" title="La humedad supera el máximo recomendado 65%">💧 Humedad: ${row.humedad} %</p>`;
        }

        // AGUA DISPONIBLE
        const aguaValue = row.agua_balde && row.agua_balde.toString().trim() !== ""
            ? row.agua_balde
            : "0";

        let agua_baldeHtml = `<p>🚿 Agua disponible: ${aguaValue} Lt</p>`;

        // COMENTARIOS
        const comentariosValue = row.comentarios && row.comentarios.toString().trim() !== ""
            ? row.comentarios
            : "sin comentarios";

        // INFO
        const infoDiv = document.createElement("div");
        infoDiv.className = "parametros";
        infoDiv.innerHTML = `
      ${tempHtml}
      ${humedadHtml}
      ${agua_baldeHtml}
      <p>📝 Comentarios adicionales: <em>${comentariosValue}</em></p>`;
        recordDiv.appendChild(infoDiv);
        recordsEl.appendChild(recordDiv);
    });

    updatePaginationUI();
}

// BOTONES
function bindUI() {
    prevBtn.addEventListener("click", () => {
        currentPage--;
        render();
    });

    nextBtn.addEventListener("click", () => {
        currentPage++;
        render();
    });
}

// CARGA DE DATOS
async function loadData() {
    recordsEl.innerHTML = "<p>🟡 Cargando datos…</p>";

    try {
        const res = await fetch(SHEET_URL);
        const text = await res.text();

        allData = parseCSV(text);

        allData.forEach((row) => {
            row.marca_temporal = parseDate(row.marca_temporal);
        });

        allData = allData.filter((r) => r.marca_temporal);
        allData.sort((a, b) => b.marca_temporal - a.marca_temporal);

        currentPage = 0;
        render();
    } catch (err) {
        console.error("🔴 ERROR al cargar datos", err);
        recordsEl.innerHTML = "<p style='color:red'>Error al cargar datos</p>";
        allData = [];
        currentPage = 0;
        updatePaginationUI();
    }
}

// INIT
document.addEventListener("DOMContentLoaded", () => {
    recordsEl = document.getElementById("records");
    prevBtn = document.getElementById("prevBtn");
    nextBtn = document.getElementById("nextBtn");
    pageInfo = document.getElementById("pageInfo");

    bindUI();
    loadData();
});