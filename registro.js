console.log("✅ registro.js cargado correctamente");

// ==============================
// Función para mostrar preview de imágenes
// ==============================
function previewImages(input, containerId, max = 3) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  Array.from(input.files).slice(0, max).forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.width = "100px";
    img.style.margin = "6px";
    img.style.borderRadius = "10px";
    container.appendChild(img);
  });
}

// ==============================
// Listeners para previews
// ==============================
document.getElementById("macetaA").addEventListener("change", e => {
  previewImages(e.target, "previewA");
});

document.getElementById("macetaB").addEventListener("change", e => {
  previewImages(e.target, "previewB");
});

// ==============================
// Configuración Cloudinary
// ==============================
const CLOUD_NAME = "dyqlyzbrm";
const UPLOAD_PRESET = "bitacora_botanica";

async function uploadToCloudinary(file, folder) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  const data = await res.json();
  return data.secure_url;
}

// ==============================
// Submit del formulario
// ==============================
document.getElementById("bitacoraForm").addEventListener("submit", async e => {
  e.preventDefault();

  // 📂 Archivos de cada maceta (máx 3)
  const filesA = [...document.getElementById("macetaA").files].slice(0, 3);
  const filesB = [...document.getElementById("macetaB").files].slice(0, 3);

  // 📤 Subir a Cloudinary
  const urlsA = [];
  const urlsB = [];

  for (const file of filesA) {
    urlsA.push(await uploadToCloudinary(file, "macetas/A"));
  }

  for (const file of filesB) {
    urlsB.push(await uploadToCloudinary(file, "macetas/B"));
  }

  console.log("🌿 Maceta A:", urlsA);
  console.log("🌿 Maceta B:", urlsB);

  // ==============================
  // Datos del formulario
  // ==============================
  const temperatura = document.getElementById("temperatura").value;
  const humedad = document.getElementById("humedad").value;
  const deshumidificador = document.getElementById("deshumidificador").value;
  const agua_balde = document.getElementById("agua_balde").value;
  const comentarios = document.getElementById("comentarios").value;

  // ==============================
  // Endpoint Apps Script (Google Sheets)
  // ==============================
  const endpoint = "https://script.google.com/macros/s/AKfycbyhUm2Vx5ec1-P19sFlMzWiPmujDoqBQPQ5Uh9cGp6_5It3NofO1AN8cV2IUx3OQv1cvQ/exec"; // reemplaza con tu URL del web app

  // enviar POST con JSON
  await fetch(endpoint, {
    method: "POST",
    body: JSON.stringify({
      temperatura,
      humedad,
      registro_a: urlsA,
      registro_b: urlsB,
      deshumidificador,
      agua_balde,
      comentarios
    }),
    headers: { "Content-Type": "application/json" }
  });

  alert("✅ Registro guardado correctamente");
  e.target.reset();

  // Limpiar previews
  document.getElementById("previewA").innerHTML = "";
  document.getElementById("previewB").innerHTML = "";
});
