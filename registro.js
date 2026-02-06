console.log("✅ registro.js cargado correctamente");

const selectedImages = {
    macetaA: [],
    macetaB: []
};

// ==============================
// Función para mostrar preview de imágenes (máx 3)
function previewImages(input, containerId, key, max = 3) {
    const container = document.getElementById(containerId);

    const newFiles = Array.from(input.files);

    for (const file of newFiles) {
        if (selectedImages[key].length >= max) {
            alert(`📸 Máximo ${max} imágenes permitidas`);
            break;
        }
        selectedImages[key].push(file);
    }

    // limpiar input para permitir seguir agregando
    input.value = "";

    // render preview
    container.innerHTML = "";
    selectedImages[key].forEach(file => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.width = "100px";
        img.style.margin = "6px";
        img.style.borderRadius = "10px";
        container.appendChild(img);
    });
}

document.getElementById("macetaA").addEventListener("change", e => {
    previewImages(e.target, "previewA", "macetaA");
});

document.getElementById("macetaB").addEventListener("change", e => {
    previewImages(e.target, "previewB", "macetaB");
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
    console.log("🚀 Formulario enviado");

    // 📁 Archivos de cada maceta (máx 3 imágenes)
    const filesA = selectedImages.macetaA;
    const filesB = selectedImages.macetaB;


    // Validar máximo permitido
    if (filesA.length > 3) {
        alert("🌿 Maceta A: puedes subir hasta 3 imágenes");
        return;
    }

    if (filesB.length > 3) {
    alert("🌿 Maceta B: puedes subir hasta 3 imágenes");
    return;
    }
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
    // Subir imágenes a Cloudinary y guardar URLs
    // ==============================
    const urlsA = [];
    const urlsB = [];
    try {
        for (const file of filesA) urlsA.push(await uploadToCloudinary(file, "macetas/A"));
        for (const file of filesB) urlsB.push(await uploadToCloudinary(file, "macetas/B"));
    } catch (err) {
        alert("❌ Error al subir imágenes. Revisa la consola.");
        return;
    }

    console.log("🌿 Maceta A URLs:", urlsA);
    console.log("🌿 Maceta B URLs:", urlsB);

    // ==============================
    // Preparar FormData para enviar al Apps Script
    // ==============================
    const formData = new FormData();
    formData.append("temperatura", temperatura);
    formData.append("humedad", humedad);
    formData.append("registro_a", urlsA.join(","));
    formData.append("registro_b", urlsB.join(","));
    formData.append("deshumidificador", deshumidificador);
    formData.append("agua_balde", agua_balde);
    formData.append("comentarios", comentarios);

    // ==============================
    // Endpoint Apps Script
    // ==============================
    const endpoint = "https://script.google.com/macros/s/AKfycbxpuYwujkNw0VaHn1qtlcyeH9YlS-NenQBIEfOJBm0dWRxLOT9hA9-rgPNeXjhChJ8bBw/exec"
    try {
        const res = await fetch(endpoint, {
            method: "POST",
            body: formData
        });

        const msg = await res.text(); // Apps Script responde con HtmlService
        alert(msg); // ✅ Registro guardado correctamente!
        
        // Limpiar formulario y previews
        e.target.reset();
        document.getElementById("previewA").innerHTML = "";
        document.getElementById("previewB").innerHTML = "";

    } catch (err) {
        console.error("❌ Error en fetch:", err);
        alert("❌ Error de conexión: " + err.message);
    }
});
