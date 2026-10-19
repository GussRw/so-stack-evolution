# Evolución del stack tecnológico según experiencia y rol

Proyecto de la materia Visualización de Datos, Maestría Profesionalizante en Inteligencia Artificial,
Instituto Tecnológico de Aguascalientes. Autor: Gustavo Peralta Vázquez.

**Pregunta analítica.** ¿Cómo evoluciona el stack tecnológico y la adopción de herramientas a medida que un perfil
avanza desde sus primeros años de experiencia hasta roles de liderazgo o dirección?

## Datos

- **Fuente original:** Stack Overflow (2024). *2024 Stack Overflow Developer Survey*. https://survey.stackoverflow.co/2024
- **Copia utilizada:** berkayalan (2024), Kaggle, versión 1:
  https://www.kaggle.com/datasets/berkayalan/stack-overflow-annual-developer-survey-2024
- **Geometría del mapa:** Natural Earth, Admin 0 – Countries, escala 1:110m.

El CSV original no se incluye en el repositorio (supera los 100 MB). El notebook lo descarga automáticamente
con `kagglehub` usando la versión fijada en `src/utils.py`. Las transformaciones están documentadas en
[`docs/diccionario_datos.md`](docs/diccionario_datos.md).

## Estructura

```
├── notebooks/analisis.ipynb    # Carga → Limpieza → EDA → Visualizaciones finales
├── src/utils.py                # Funciones de limpieza, segmentación e intervalos de confianza
├── tests/test_utils.py         # Pruebas de las funciones de src/
├── docs/                       # Carpeta publicada por GitHub Pages
│   ├── index.html, app.js, styles.css  # Visualización interactiva (Observable Plot)
│   ├── data/                   # adopcion_lenguajes.json (generado por el notebook)
│   └── diccionario_datos.md    # Variables, reglas de transformación y cambios entre avances
├── data/
│   ├── raw/                    # Copia local opcional del CSV (no versionada)
│   ├── external/               # Geometría de Natural Earth (se descarga sola, no versionada)
│   └── processed/              # Tablas limpias generadas por el notebook
├── superset/                   # Dashboard de BI: README de reproducción e importación
│   └── data/                   # encuestados.csv y adopcion.csv para cargar en Superset
└── outputs/
    └── figures/                # Figuras estáticas (PNG, 300 dpi)
```

## Ejecución (Linux / WSL)

Requisitos: Python 3.12 y conexión a internet en la primera ejecución.

```bash
git clone https://github.com/gussrw/so-stack-evolution.git && cd so-stack-evolution
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Verificar las funciones de limpieza e intervalos
pytest -q

# Ejecutar el notebook completo de arriba abajo; se guarda en su lugar con todas sus salidas
jupyter nbconvert --to notebook --execute --inplace notebooks/analisis.ipynb
```

Si `kagglehub` solicita autenticación, configura tu token en `~/.kaggle/kaggle.json` según la documentación de Kaggle.

**Sin conexión:** si ya tienes el CSV, apunta a él con una variable de entorno y el notebook no intentará descargarlo:

```bash
export SO_SURVEY_CSV="$PWD/data/raw/survey_results_public.csv"
```

## Visualización interactiva (local)

La página de `docs/` carga `docs/data/adopcion_lenguajes.json` con `fetch`, así que debe servirse por HTTP
(abrir `index.html` directamente con `file://` no funciona):

```bash
cd docs
python3 -m http.server 8000
# abrir http://localhost:8000
```

En GitHub, Pages publica la carpeta `docs/` de la rama `main`: *Settings → Pages → Source = Deploy from a branch*,
rama `main`, carpeta `/docs`. `docs/.nojekyll` desactiva el procesamiento con Jekyll. El JSON se versiona en el repositorio; si cambia la
limpieza, vuelve a ejecutar el notebook antes de hacer push.

## Visualizaciones

| # | Tipo | Herramienta | Archivo / enlace |
|---|---|---|---|
| 4.1 | Univariada | matplotlib/seaborn | `outputs/figures/4_1_univariada_years_code_pro.png` |
| 4.2 | Bivariada | matplotlib/seaborn | `outputs/figures/4_2_bivariada_experiencia_vs_rol.png` |
| 4.3 | Multivariada | matplotlib/seaborn | `outputs/figures/4_3_multivariada_lenguajes_experiencia_rol.png` |
| 4.4 | Comparación con IC | matplotlib | `outputs/figures/4_4_comparacion_tecnologias_por_rol.png` |
| 4.5 | Geoespacial | geopandas | `outputs/figures/4_5_geoespacial_experiencia_por_pais.png` |
| 6.1 | Estática mejorada (diferencia liderazgo − desarrollo por rango, IC de Newcombe) | matplotlib | `outputs/figures/6_1_estatica_diferencia_por_experiencia.png` · comparación con 4.4: `outputs/figures/6_1_comparacion_avance2_vs_final.png` |
| 6.2 | Interactiva (heatmap por país, segmento y rango) | Observable Plot | https://gussrw.github.io/so-stack-evolution/ · código en `docs/` |
| 6.3 | Dashboard BI (KPIs y adopción por segmento con filtros de país, rango y segmento) | Apache Superset 6.1.0 | Datos: `superset/data/` · pasos: [`superset/README.md`](superset/README.md) · export del dashboard: *pendiente* |

## Referencias

- berkayalan. (2024). *Stack Overflow Annual Developer Survey 2024* [Conjunto de datos]. Kaggle.
- Cleveland, W. S., & McGill, R. (1984). Graphical perception. *JASA, 79*(387), 531–554.
- Munzner, T. (2014). *Visualization analysis and design*. CRC Press.
- Newcombe, R. G. (1998). Interval estimation for the difference between independent proportions: Comparison of eleven methods. *Statistics in Medicine, 17*(8), 873–890.
- Apache Software Foundation. (2026). *Apache Superset* (versión 6.1.0) [Software]. https://superset.apache.org/
- Observable. (2025). *Observable Plot* (versión 0.6.17) [Software]. https://observablehq.com/plot/
- Stack Overflow. (2024). *2024 Stack Overflow Developer Survey* [Conjunto de datos]. Stack Exchange Inc.
