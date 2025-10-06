import pandas as pd
import os
import json
import unicodedata

def normalizar(texto):
    texto = str(texto).strip().upper()
    texto = unicodedata.normalize('NFKD', texto)
    texto = ''.join([c for c in texto if not unicodedata.combining(c)])
    texto = texto.replace('.', '')
    return texto

def cargar_ids_json(path):
    with open(path, encoding="utf-8") as f:
        lista = json.load(f)
    # Si el JSON es una lista de strings (como antes)
    if isinstance(lista[0], str):
        return {normalizar(v): i+1 for i, v in enumerate(lista)}
    # Si el JSON es una lista de objetos con "comuna"
    elif isinstance(lista[0], dict) and "comuna" in lista[0]:
        return {normalizar(v["comuna"]): i+1 for i, v in enumerate(lista)}
    else:
        raise ValueError("Formato de JSON de comunas no reconocido")

def obtener_tipo_zona_id(valor):
    valor_norm = normalizar(valor)
    if valor_norm == "URBANO":
        return 1
    elif valor_norm == "RURAL":
        return 2
    else:
        return None

def procesar_excels(ruta_carpeta):
    comunas_ids = cargar_ids_json(os.path.join(ruta_carpeta, "comunas.json"))
    causas_ids = cargar_ids_json(os.path.join(ruta_carpeta, "Causas.json"))
    accdt_ids = cargar_ids_json(os.path.join(ruta_carpeta, "accdt.json"))

    extensiones = [".xlsx"]
    archivos = [f for f in os.listdir(ruta_carpeta) if any(f.endswith(ext) for ext in extensiones) and not f.endswith("_id.xlsx")]
    for archivo in archivos:
        ruta_archivo = os.path.join(ruta_carpeta, archivo)
        try:
            df = pd.read_excel(ruta_archivo, engine="openpyxl")
            # Elimina la columna "Mes" si existe
            if "Mes" in df.columns:
                df = df.drop(columns=["Mes"])
            # Reemplaza por ID en cada columna
            if "Comuna" in df.columns:
                df["Comuna"] = df["Comuna"].apply(lambda x: comunas_ids.get(normalizar(x), None))
            if "Causas" in df.columns:
                df["Causas"] = df["Causas"].apply(lambda x: causas_ids.get(normalizar(x), None))
            if "Accdtes." in df.columns:
                df["Accdtes."] = df["Accdtes."].apply(lambda x: accdt_ids.get(normalizar(x), None))
            if "Urbano/Rural" in df.columns:
                df["Urbano/Rural"] = df["Urbano/Rural"].apply(lambda x: obtener_tipo_zona_id(x))
            # Guarda el nuevo archivo
            nuevo_nombre = archivo.replace(".xlsx", "_id.xlsx")
            df.to_excel(os.path.join(ruta_carpeta, nuevo_nombre), index=False)
            print(f"Archivo procesado y guardado: {nuevo_nombre}")
        except Exception as e:
            print(f"Error procesando {ruta_archivo}: {e}")

if __name__ == "__main__":
    carpeta = r"C:\Users\hvera\OneDrive\Documentos\GitHub\AccidentesCarabineros\excel"
    procesar_excels(carpeta)