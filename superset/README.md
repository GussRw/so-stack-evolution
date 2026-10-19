# Dashboard de BI en Apache Superset

Pasos para reproducir el dashboard desde cero con los datos de `superset/data/`, que genera la sección 6.3 del
notebook (`notebooks/analisis.ipynb`).

| Archivo | Grano | Filas |
|---|---|---|
| `data/encuestados.csv` | Un encuestado de desarrollo o liderazgo | 41,560 |
| `data/adopcion.csv` | País × segmento × rango × pregunta × tecnología (conteos) | 136,341 |

El significado de cada columna está en [`docs/diccionario_datos.md`](../docs/diccionario_datos.md).

**Versión usada:** Apache Superset **6.1.0** (`git -C ~/superset describe --tags`), imagen oficial con
`docker-compose-image-tag.yml`.

## 1. Levantar Superset

Requisitos: Docker con el plugin `docker compose`.

```bash
git clone https://github.com/apache/superset.git ~/superset
cd ~/superset
git checkout 6.1.0
export TAG=6.1.0          # sin esta variable el compose usa la imagen latest-dev
docker compose -f docker-compose-image-tag.yml up -d
```

La primera vez tarda unos minutos mientras `superset-init` prepara la base de metadatos. Después, abre
<http://localhost:8088> e inicia sesión con `admin` / `admin`, el usuario que crea `docker/docker-init.sh`.

## 2. Crear la base de datos analítica

Los datos se cargan en una base separada de la de metadatos de Superset, dentro del mismo contenedor de PostgreSQL:

```bash
cd ~/superset
docker compose -f docker-compose-image-tag.yml exec db \
  psql -U superset -c "CREATE DATABASE so_survey;"
```

## 3. Conectar la base en Superset

1. *Settings → Database Connections → + Database*.
2. Elige **PostgreSQL** y luego *Connect this database with a SQLAlchemy URI string instead*.
3. Nombre visible: `so_survey`. SQLAlchemy URI:

   ```
   postgresql://superset:superset@db:5432/so_survey
   ```

   El host es `db`, el nombre del servicio en la red de Docker, no `localhost`.
4. *Test connection*.
5. En *Advanced → Security*, activa **Allow file uploads to database**. En *Schemas allowed for File upload*,
   escribe `public`.
6. *Connect*.

## 4. Cargar los CSV

Para cada archivo: *+ (menú superior) → Data → Upload CSV to database*.

| Archivo | Database | Schema | Table name |
|---|---|---|---|
| `superset/data/encuestados.csv` | `so_survey` | `public` | `encuestados` |
| `superset/data/adopcion.csv` | `so_survey` | `public` | `adopcion` |

Deja los demás valores por defecto (delimitador `,`, primera fila como encabezado). Al terminar, Superset crea un
dataset con el mismo nombre que cada tabla.

En `adopcion`, las columnas `rank_pregunta` y `rank_plataformas_herramientas` deben quedar numéricas. La segunda
está vacía en las filas de `lenguajes`, así que PostgreSQL puede guardarla como decimal (`12.0`); eso no afecta a
los filtros. Si Superset la detecta como texto, vuelve a cargar el CSV y, en *Columns → Column data types*, declara
`{"rank_pregunta": "int64", "rank_plataformas_herramientas": "float64"}`.

## 5. Métricas de los datasets

*Datasets → (dataset) → Edit dataset → Metrics → + Add item*. En cada métrica, escribe la expresión SQL tal cual:

**Dataset `adopcion`**

| Metric key | SQL expression | Formato sugerido |
|---|---|---|
| `adopcion_pct` | `SUM(usuarios) * 100.0 / NULLIF(SUM(total), 0)` | `,.1f` |
| `usuarios_total` | `SUM(usuarios)` | `,d` |

**Dataset `encuestados`**

| Metric key | SQL expression | Formato sugerido |
|---|---|---|
| `mediana_experiencia` | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY years_code_pro)` | `,.0f` |

Para el n por segmento basta la métrica predefinida `COUNT(*)` del dataset `encuestados`.

> **Advertencia: `adopcion_pct` solo es válida agrupando por `tecnologia`.** Cada fila repite como `total` el
> número de encuestados del grupo que respondieron la pregunta; ese total es el mismo para todas las tecnologías
> del grupo. Si un gráfico suma la métrica entre tecnologías distintas (por ejemplo, un KPI sin dimensión
> `tecnologia` o una barra que agrupe solo por `pregunta`), el denominador cuenta a cada persona tantas veces como
> tecnologías haya y el resultado no tiene sentido. Usa siempre `tecnologia` como dimensión, o filtra a una sola
> tecnología, y filtra también `pregunta`.

## 6. Notas para construir los gráficos

- **Orden de los rangos:** ordena por `rango_orden` (1 = 0-2 … 6 = 20+, 99 = Sin dato), no por `rango`, porque
  Superset ordena el texto alfabéticamente.
- **Leyendas:** usa `segmento_corto` (Desarrollo / Liderazgo) en vez de `segmento`.
- **Filtros nativos:** `pais`, `rango` y `segmento` tienen el mismo nombre en ambos datasets, así que un filtro
  nativo puede aplicarse a todos los gráficos del dashboard.
- **Las 12 tecnologías de la figura 4.4:** agrega al gráfico de adopción el filtro
  `rank_plataformas_herramientas <= 12`; devuelve exactamente las 12 tecnologías de la figura (AWS, Docker, npm,
  Pip, Azure, Homebrew, Vite, Webpack, Yarn, Google Cloud, Kubernetes y NuGet). Para el top de una sola pregunta,
  usa `pregunta = '…'` y `rank_pregunta <= 12`. **No** combines `rank_pregunta <= 12` con plataformas y
  herramientas a la vez: así salen 24 tecnologías (12 de cada pregunta), no las de 4.4. Los rankings se calculan
  sin filtros y no cambian al filtrar por país, rango o segmento.
- **Comprobación sin filtros:** AWS en *plataformas* debe dar 53.5% en Desarrollo y 68.0% en Liderazgo, igual que
  la figura 4.4 del notebook.

## 7. Importar el dashboard

Cuando exista el export `superset/dashboard_export.zip`, el dashboard se puede restaurar sin repetir el paso 6:

1. Completa los pasos 1 a 4, para que la base `so_survey` y las tablas existan.
2. *Dashboards → Import dashboards* (icono de importar, junto a *+ Dashboard*).
3. Selecciona `superset/dashboard_export.zip`. Si Superset lo pide, escribe la contraseña de la conexión
   (`superset`) y confirma que se sobrescriban los objetos existentes.

El ZIP incluye el dashboard, sus gráficos, los datasets con sus métricas y la definición de la conexión (sin la
contraseña).
