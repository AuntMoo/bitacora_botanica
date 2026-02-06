// ==============================
// CONFIGURACIÓN
// ==============================
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1jWws-Zd2gdxIKFXs_96uXqVJ0q966-fmvUSP9MRN0KI/gviz/tq?tqx=out:csv&gid=503468732";

const recordsEl = document.getElementById("records");
const weekSelector = document.getElementById("weekSelector");

let allData = [];
let filteredData = [];
let currentPage = 0;

const PAGE_SIZE = 7;

// ==============================
// RENDER IMÁGENES (GitHub + Cloudinary)
// ==============================
function renderImages(container, urlString) {
    if (!urlString) {
        container.innerHTML += `<p class="no-img">Sin imagen</p>`;
        return;
    }

    const urls = urlString
        .split(",")
        .map(u => u.trim())
        .filter(Boolean);

    urls.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.loading = "lazy";
        img.className = "cloud-img";
        container.appendChild(img);
    });
}

// ==============================
// CSV PARSER
// ==============================
function parseCSV(text) {
    const rows = [];
    const lines = text.trim().split("\n");

    const headers = lines[0]
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map(h => h.replace(/"/g, "").trim());

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map(v => v.replace(/"/g, "").trim());

        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = values[idx] || "";
        });

        rows.push(obj);
    }

    return rows;
}

// ==============================
// FECHA
// ==============================
function parseDate(value) {
    if (!value) return null;

    const [datePart, timePart] = value.trim().split(" ");
    if (!datePart) return null;

    const [d, m, y] = datePart.split("/").map(Number);
    const [hh = 0, mm = 0, ss = 0] = (timePart || "").split(":").map(Number);

    const date = new Date(y, m - 1, d, hh, mm, ss);
    return isNaN(date.getTime()) ? null : date;
}

// RENDER REGISTROS
// ==============================
function render() {
    recordsEl.innerHTML = "";

    const start = currentPage * PAGE_SIZE;
    const page = filteredData.slice(start, start + PAGE_SIZE);

    page.sort((a, b) => b.marca_temporal - a.marca_temporal);

    page.forEach(row => {
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
                // Si ya es un array
                if (Array.isArray(row[campo])) {
                    fotos = row[campo];
                } else {
                    // Intentar parsear JSON
                    try {
                        const parsed = JSON.parse(row[campo]);
                        if (Array.isArray(parsed)) {
                            fotos = parsed;
                        } else {
                            fotos = [row[campo]];
                        }
                    } catch {
                        // Si no es JSON, puede ser string con comas
                        fotos = row[campo].split(",").map(u => u.trim()).filter(u => u);
                    }
                }
            }

            if (fotos.length > 0) {
                fotos.forEach(imgUrl => {
                    const img = document.createElement("img");
                    img.src = imgUrl;
                    img.alt = `Foto Maceta ${i === 0 ? "A" : "B"}`;
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

        // Si temperatura existe y supera 28.0
        if (row.temperatura && row.temperatura > 28.0) {
            tempHtml = `<p style="color: red; " title="La temperatura sobrepasa el máximo recomendado de 28.0°C">🌡 Temperatura: ${row.temperatura} °C</p>`;
        }

        // HUMEDAD (igual que antes)
        let humedadHtml = `<p>💧 Humedad: ${row.humedad ?? "—"} %</p>`;
        // Si temperatura existe y supera 28.0
        if (row.humedad && row.humedad > 65) {
            humedadHtml = `<p style="color: red; " title="La humedad supera el máximo recomendado 65%">💧  Humedad: ${row.humedad} °C</p>`;
        }


        // INFO
        const infoDiv = document.createElement("div");
        infoDiv.className = "parametros";
        infoDiv.innerHTML = `
            ${tempHtml} 
            ${humedadHtml} 
            <p>🚿 Agua disponible: ${row.agua_balde ?? "—"} Lt</p>
            ${row.comentarios ? `<p>📝Comentarios adicionales: <em>${row.comentarios}</p>` : ""}<em>
        `;
        recordDiv.appendChild(infoDiv);

        recordsEl.appendChild(recordDiv);
    });
}


// ==============================
// SEMANAS
// ==============================
function buildWeeks() {
    const weeks = new Map();

    allData.forEach(row => {
        const d = new Date(row.marca_temporal);
        const monday = new Date(d);
        monday.setDate(d.getDate() - d.getDay() + 1);
        monday.setHours(0, 0, 0, 0);

        weeks.set(monday.toISOString(), monday);
    });

    weekSelector.innerHTML = "";

    [...weeks.values()]
        .sort((a, b) => b - a)
        .forEach(w => {
            const opt = document.createElement("option");
            opt.value = w.toISOString();
            opt.textContent = w.toLocaleDateString("es-CL");
            weekSelector.appendChild(opt);
        });

    weekSelector.onchange = () => {
        currentPage = 0;
        filterWeek(new Date(weekSelector.value));
    };

    filterWeek(new Date(weekSelector.value));
}

function filterWeek(weekStart) {
    filteredData = allData.filter(r => {
        const d = r.marca_temporal;
        return d >= weekStart && d < new Date(weekStart.getTime() + 7 * 86400000);
    });

    render();
}

// ==============================
// CARGA DE DATOS
// ==============================
async function loadData() {
    recordsEl.innerHTML = "<p>🟡 Cargando datos…</p>";

    try {
        const res = await fetch(SHEET_URL);
        const text = await res.text();

        allData = parseCSV(text);

        allData.forEach(row => {
            row.marca_temporal = parseDate(row.marca_temporal);
        });

        allData = allData.filter(r => r.marca_temporal);
        allData.sort((a, b) => b.marca_temporal - a.marca_temporal);

        filteredData = allData.slice(0, PAGE_SIZE);

        buildWeeks();
        render();

    } catch (err) {
        console.error("🔴 ERROR al cargar datos", err);
        recordsEl.innerHTML = "<p style='color:red'>Error al cargar datos</p>";
    }
}

// ==============================
// BOTONES
// ==============================
document.getElementById("prevBtn").onclick = () => {
    if (currentPage > 0) {
        currentPage--;
        render();
    }
};

document.getElementById("nextBtn").onclick = () => {
    if ((currentPage + 1) * PAGE_SIZE < filteredData.length) {
        currentPage++;
        render();
    }
};

// ==============================
// INIT
// ==============================
loadData();
