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
document.getElementById("macetaA").addEventListener("change", e => previewImages(e.target, "previewA"));
document.getElementById("macetaB").addEventListener("change", e => previewImages(e.target, "previewB"));

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

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}

// ==============================
// Submit del formulario
// ==============================
document.getElementById("bitacoraForm").addEventListener("submit", async e => {
  e.preventDefault();
  console.log("🚀 Formulario enviado");

  // Archivos de cada maceta (máx 3)
  const filesA = [...document.getElementById("macetaA").files].slice(0, 3);
  const filesB = [...document.getElementById("macetaB").files].slice(0, 3);
  console.log("📁 Archivos Maceta A:", filesA);
  console.log("📁 Archivos Maceta B:", filesB);

  // Validaciones básicas
  const temperatura = document.getElementById("temperatura").value;
  const humedad = document.getElementById("humedad").value;
  if (!temperatura || !humedad) {
    alert("🌡 Por favor ingresa temperatura y humedad");
    return;
  }

  const deshumidificador = document.getElementById("deshumidificador").value;
  const agua_balde = document.getElementById("agua_balde").value;
  const comentarios = document.getElementById("comentarios").value;

  // ==============================
  // Subir imágenes a Cloudinary
  // ==============================
  const urlsA = [];
  const urlsB = [];
  try {
    for (const file of filesA) urlsA.push(await uploadToCloudinary(file, "macetas/A"));
    for (const file of filesB) urlsB.push(await uploadToCloudinary(file, "macetas/B"));
  } catch (err) {
    alert("❌ Error al subir imágenes. Revisa la consola.");
    console.error(err);
    return;
  }

  console.log("🌿 Maceta A URLs:", urlsA);
  console.log("🌿 Maceta B URLs:", urlsB);

  // ==============================
  // Enviar datos a Google Sheets
  // ==============================
  const endpoint = "https://script.google.com/macros/s/AKfycbyhUm2Vx5ec1-P19sFlMzWiPmujDoqBQPQ5Uh9cGp6_5It3NofO1AN8cV2IUx3OQv1cvQ/exec";

  const registro = {
    temperatura,
    humedad,
    registro_a: urlsA,
    registro_b: urlsB,
    deshumidificador,
    agua_balde,
    comentarios
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registro)
    });

    const data = await res.json();
    console.log("📄 JSON recibido del Apps Script:", data);

    if (data.status === "success") {
      alert("✅ Registro guardado correctamente");
      e.target.reset();
      document.getElementById("previewA").innerHTML = "";
      document.getElementById("previewB").innerHTML = "";
    } else {
      alert("⚠️ Error al guardar: " + (data.message || "Desconocido"));
    }

  } catch (err) {
    console.error("❌ Error en fetch hacia Apps Script:", err);
    alert("❌ Error de conexión: " + err.message);
  }
});
