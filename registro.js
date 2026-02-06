console.log("✅ registro.js cargado correctamente");
let isSubmitting = false; // Evita doble click

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

// Submit del formulario
// ==============================
document.getElementById("bitacoraForm").addEventListener("submit", async e => {
    e.preventDefault();

    if (isSubmitting) return; // 🛑 doble submit
    isSubmitting = true;

    const submitBtn = document.getElementById("submitBtn");
    const overlay = document.getElementById("loadingOverlay");

    // ==============================
    // Validaciones
    // ==============================
    const filesA = selectedImages.macetaA;
    const filesB = selectedImages.macetaB;

    if (filesA.length > 3 || filesB.length > 3) {
        alert("📸 Máximo 3 imágenes por maceta");
        isSubmitting = false;
        return;
    }

    const temperatura = document.getElementById("temperatura").value;
    const humedad = document.getElementById("humedad").value;
    const deshumidificador = document.getElementById("deshumidificador").value;
    const agua_balde = document.getElementById("agua_balde").value;
    const comentarios = document.getElementById("comentarios").value;

    if (!temperatura || !humedad || !agua_balde || !deshumidificador) {
        alert("🌡 Por favor completa los datos antes de guardar");
        isSubmitting = false;
        return;
    }

    // ==============================
    // UI: bloquear + loading
    // ==============================
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Guardando...";
    overlay.classList.remove("hidden");

    try {
        // ==============================
        // Subir imágenes
        // ==============================
        const urlsA = [];
        const urlsB = [];

        for (const file of filesA) {
            urlsA.push(await uploadToCloudinary(file, "macetas/A"));
        }

        for (const file of filesB) {
            urlsB.push(await uploadToCloudinary(file, "macetas/B"));
        }

        // ==============================
        // Enviar a Apps Script
        // ==============================
        const formData = new FormData();
        formData.append("temperatura", temperatura);
        formData.append("humedad", humedad);
        formData.append("registro_a", urlsA.join(","));
        formData.append("registro_b", urlsB.join(","));
        formData.append("deshumidificador", deshumidificador);
        formData.append("agua_balde", agua_balde);
        formData.append("comentarios", comentarios);

        const endpoint = "https://script.google.com/macros/s/AKfycbxpuYwujkNw0VaHn1qtlcyeH9YlS-NenQBIEfOJBm0dWRxLOT9hA9-rgPNeXjhChJ8bBw/exec";

        const res = await fetch(endpoint, {
            method: "POST",
            body: formData
        });

        const msg = await res.text(); // 👈 mensaje del Apps Script

        // ==============================
        // ✅ ÉXITO
        // ==============================
        overlay.classList.add("hidden");
        alert("✅ Registro guardado correctamente 🌿");

        e.target.reset();
        selectedImages.macetaA = [];
        selectedImages.macetaB = [];
        document.getElementById("previewA").innerHTML = "";
        document.getElementById("previewB").innerHTML = "";

    } catch (err) {
        console.error(err);
        overlay.classList.add("hidden");
        alert("❌ Error al guardar el registro");
    } finally {
        // ==============================
        // Restaurar UI SIEMPRE
        // ==============================
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "📥 Guardar registro";
    }
});
