import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2.service_account import Credentials
from io import BytesIO

# CSS diario
# ---------------------------
st.markdown("""
<style>
.diario-container {
    background-color: #f9f4ef;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}
.diario-container h2, .diario-container h3 {
    color: #5a3e36;
    font-family: 'Georgia', serif;
}
.diario-container button {
    background-color: #a57c5f;
    color: white;
    border-radius: 5px;
    padding: 5px 15px;
    margin: 2px;
    font-weight: bold;
}
.diario-container button:hover {
    background-color: #8e634c;
    cursor: pointer;
}
</style>
""", unsafe_allow_html=True)

# Drive API
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
creds = Credentials.from_service_account_file('credentials.json', scopes=SCOPES)
drive_service = build('drive', 'v3', credentials=creds)

def drive_to_direct(url):
    if not isinstance(url, str) or not url:
        return None
    url = url.strip()
    file_id = None
    if "open?id=" in url:
        file_id = url.split("open?id=")[-1].split("&")[0]
    elif "/file/d/" in url:
        file_id = url.split("/file/d/")[1].split("/")[0]
    elif "drive.google.com/uc?id=" in url:
        file_id = url.split("id=")[-1].split("&")[0]
    return file_id

def st_image_from_drive(file_id, width=300):
    try:
        request = drive_service.files().get_media(fileId=file_id)
        fh = BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
        fh.seek(0)
        st.image(fh, width=width)
    except Exception as e:
        st.error(f"❌ Error al cargar imagen {file_id}: {e}")

def limpiar_numero(valor):
    if pd.isna(valor):
        return None
    valor = str(valor).strip().replace(",", ".")
    try:
        return float(valor)
    except ValueError:
        return None
    
# Cargar Sheet
SHEET_ID = "1jWws-Zd2gdxIKFXs_96uXqVJ0q966-fmvUSP9MRN0KI"
SHEET_NAME = "registro_diario"
URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}"
df = pd.read_csv(URL)
df.columns = df.columns.str.strip()

# Columnas
COL_FECHA = "marca_temporal"
COL_TEMP = "temperatura"
COL_LITROS = "agua_balde"
COL_HUMEDAD = "humedad"
COL_COMENTARIOS = "comentarios"
COL_FOTO_1 = "registro_a"
COL_FOTO_2 = "registro_b"

# Limpiar datos
df[COL_FECHA] = pd.to_datetime(df[COL_FECHA], dayfirst=True, errors="coerce")
df[COL_TEMP] = df[COL_TEMP].apply(limpiar_numero)
df[COL_HUMEDAD] = df[COL_HUMEDAD].apply(limpiar_numero)
df[COL_LITROS] = df[COL_LITROS].apply(limpiar_numero)

# Ordenar
df = df.sort_values(COL_FECHA, ascending=False).reset_index(drop=True)

# Agua consumida
df['agua_consumida'] = df[COL_LITROS].shift(1) - df[COL_LITROS]
df['agua_consumida'] = df['agua_consumida'].apply(lambda x: x if x > 0 else 0)

# Agrupar por semana
df['semana'] = df[COL_FECHA].dt.to_period('W').apply(lambda r: r.start_time)
semanas_disponibles = df['semana'].drop_duplicates().sort_values(ascending=False)

# Contenedor diario
st.set_page_config(page_title="Bitácora", layout="wide")
st.title("📘 Bitácora botánica")
with st.container():
    st.markdown('<div class="diario-container" style="padding:20px;">', unsafe_allow_html=True)
    col1, col2 = st.columns([1,3])
    with col2:
        semana_seleccionada = st.selectbox(
            "Selecciona la semana",
            options=semanas_disponibles,
            format_func=lambda x: x.strftime("%d/%m/%Y")
        )

    # Filtrar datos de la semana
    df_semana = df[df['semana'] == semana_seleccionada].sort_values('marca_temporal', ascending=False)

    # Paginación
    REGISTROS_POR_PAGINA = 7
    total_registros = len(df_semana)
    total_paginas = (total_registros + REGISTROS_POR_PAGINA - 1) // REGISTROS_POR_PAGINA

    if 'pagina_actual' not in st.session_state:
        st.session_state.pagina_actual = 0

    pagina = st.session_state.pagina_actual
    inicio = pagina * REGISTROS_POR_PAGINA
    fin = inicio + REGISTROS_POR_PAGINA
    df_pagina = df_semana.iloc[inicio:fin]

    # Mostrar registros de la página
    for _, row in df_pagina.iterrows():
        st.markdown(f"### 📅 {row[COL_FECHA].strftime('%d/%m/%Y %H:%M')}")
        colA, colB = st.columns(2)
        with colA:
            st.subheader("🌿 Maceta A")
            if pd.notna(row[COL_FOTO_1]):
                urls = str(row[COL_FOTO_1]).split(",")
                for u in urls:
                    file_id = drive_to_direct(u)
                    if file_id:
                        st_image_from_drive(file_id, width=300)
            else:
                st.caption("Sin imagen")
        with colB:
            st.subheader("🌿 Maceta B")
            if pd.notna(row[COL_FOTO_2]):
                urls = str(row[COL_FOTO_2]).split(",")
                for u in urls:
                    file_id = drive_to_direct(u)
                    if file_id:
                        st_image_from_drive(file_id, width=300)
            else:
                st.caption("Sin imagen")
        # Datos
        humedad_html = f"<span>🌡 Humedad: {row[COL_HUMEDAD]} %</span>"
        if row[COL_HUMEDAD] and row[COL_HUMEDAD] > 60:
            humedad_html = f"<span style='color:#ff4b4b; font-weight:600'>🌡 Humedad: {row[COL_HUMEDAD]} %</span>"
        
        # Temperatura
        temp_html = f"<span>🌡 Temperatura: {row[COL_TEMP]} °C</span>"
        if row[COL_TEMP] and row[COL_TEMP] > 28:
            temp_html = f"<span style='color:#ff4b4b; font-weight:600'>🌡 Temperatura: {row[COL_TEMP]} °C</span>"

        st.markdown(f"""
            <div>{temp_html}</div>
            <div>{humedad_html}</div>
            <div>🚿 Agua disponible: {row[COL_LITROS]} Lt</div>
            <div>💧 Agua consumida: {row['agua_consumida']} Lt</div>
        """, unsafe_allow_html=True)

        if pd.notna(row[COL_COMENTARIOS]):
            st.markdown(f"📝 Comentarios: *{row[COL_COMENTARIOS]}*")

        st.divider()

    # Botones de navegación centrados
    col_left, col_center, col_right = st.columns([1,2,1])
    with col_center:
        col_prev, col_next = st.columns(2)
        with col_prev:
            if st.button("⬅️ Anterior"):
                if st.session_state.pagina_actual > 0:
                    st.session_state.pagina_actual -= 1
        with col_next:
            if st.button("➡️ Siguiente"):
                if st.session_state.pagina_actual < total_paginas - 1:
                    st.session_state.pagina_actual += 1

    # Estadísticas generales de la semana
    st.subheader("📊 Estadísticas generales de la semana")
    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Promedio temperatura", f"{round(df_semana[COL_TEMP].mean(),2)} °C")
    with c2:
        st.metric("Máxima temperatura alcanzada", f"{round(df_semana[COL_TEMP].max(),2)} °C")
    with c3:
        st.metric("Agua consumida total", f"{round(df_semana['agua_consumida'].sum(),2)} Lt")

    st.markdown('</div>', unsafe_allow_html=True)
