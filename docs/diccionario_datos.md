# Diccionario de datos y registro de transformaciones

Fuente: Stack Overflow Annual Developer Survey 2024, archivo `survey_results_public.csv`
(65,437 respuestas), versión 1 del dataset de Kaggle `berkayalan/stack-overflow-annual-developer-survey-2024`.

## Variables originales utilizadas

| Variable | Tipo de dato | Descripción | Uso en el proyecto |
|---|---|---|---|
| `ResponseId` | Identificador | ID único del encuestado | Llave de las tablas en formato largo |
| `YearsCodePro` | Texto → cuantitativa discreta | Años programando profesionalmente | Eje de madurez (4.1 a 4.5) |
| `WorkExp` | Cuantitativa discreta | Años de experiencia laboral total | Contraste en el grupo de liderazgo |
| `DevType` | Nominal | Rol principal del encuestado | Origen de `RolPrincipal` y `Segmento` |
| `Country` | Nominal (geoespacial) | País de residencia | Origen de `ISO3` (4.5) |
| `LanguageHaveWorkedWith` | Nominal multivalor (`;`) | Lenguajes usados en el último año | Adopción de lenguajes (4.3) |
| `PlatformHaveWorkedWith` | Nominal multivalor (`;`) | Plataformas de nube y hosting | Adopción de plataformas (4.4) |
| `ToolsTechHaveWorkedWith` | Nominal multivalor (`;`) | Herramientas de desarrollo | Adopción de herramientas (4.4) |

## Variables derivadas

| Variable | Tipo | Regla | Implementación |
|---|---|---|---|
| `YearsCodePro` (numérica) | Cuantitativa discreta | `"Less than 1 year"` → 0; `"More than 50 years"` → 51; otro texto → nulo | `utils.limpiar_experiencia` |
| `RolPrincipal` | Nominal | Primer valor de `DevType` | Notebook, sección 3.2 |
| `Segmento` | Nominal (3 niveles) | Ver tabla de segmentación | `utils.segmentar_rol` |
| `Rango` | Ordinal | 0-2, 3-5, 6-10, 11-15, 16-20, 20+ años | `utils.rango_experiencia` |
| `ISO3` | Nominal | Nombre de país → código ADM0_A3 (pycountry + excepciones) | `utils.a_iso3` |

## Segmentación de rol

| Segmento | Regla sobre `RolPrincipal` |
|---|---|
| Liderazgo y dirección | Coincidencia exacta con `Engineering manager` o `Senior Executive (C-Suite, VP, etc.)` |
| Desarrollo (contribuidor individual) | Empieza con `Developer, ` (incluye la coma) |
| Otro | Cualquier otro rol o respuesta vacía; queda fuera de las comparaciones |

El conteo exacto de cada rol por segmento se genera en `data/processed/mapeo_segmentos.csv`.

## Reglas de cálculo

- **Porcentaje de adopción.** Usuarios de la tecnología divididos entre los encuestados del grupo que respondieron esa pregunta. Quien dejó la pregunta en blanco no cuenta como "no usa".
- **Intervalos de confianza.** Wilson al 95% para proporciones individuales; Newcombe (híbrido de Wilson) para diferencias entre segmentos.
- **Diferencia de adopción (6.1).** Liderazgo − desarrollo en puntos porcentuales, calculada dentro de cada `Rango` con `utils.diferencia_adopcion` sobre la salida de `utils.tabla_adopcion` (denominador propio de cada pregunta). Un estrato se descarta si cualquiera de los dos grupos tiene menos de 30 encuestados; con los datos actuales se omite 0-2 años (16 líderes).
- **Interactiva (6.2).** `utils.tabla_adopcion` con `por=["pais", "Segmento", "Rango"]` sobre los 10 lenguajes de 4.3. `pais = "Todos"` incluye a todos los encuestados de desarrollo y liderazgo con `Rango` válido (cualquier país) y coincide con el n de 4.3. Se agregan los países con **al menos 500 encuestados de desarrollo con `YearsCodePro` válido** (17 países con los datos actuales). Las combinaciones sin encuestados se exportan con `total = 0` y `p`, `li`, `ls` nulos. `p`, `li` y `ls` van en % con 1 decimal. La web pinta en gris las celdas con `total < 30`, y la escala de color tiene dominio fijo 0-100%.
- **BI (6.3).** `adopcion.csv` guarda conteos y no porcentajes: Superset calcula `SUM(usuarios) * 100 / SUM(total)` después de filtrar. `total` = encuestados del grupo (país × segmento × rango) que respondieron la pregunta (`utils.tabla_adopcion` con `por=["pais", "Segmento", "Rango"]`). Se conservan las filas con 0 usuarios para no perder denominadores. Los nulos se exportan como `pais = "Sin país"` y `rango = "Sin dato"`, de modo que, sin filtros, los porcentajes coinciden con 4.3 y 4.4; el notebook lo verifica con `assert` (tolerancia de 0.05 pp). La métrica de adopción solo es válida agrupando por `tecnologia`. Los rankings (`rank_pregunta`, `rank_plataformas_herramientas`) se calculan sobre los usuarios totales sin filtros, así que no cambian al filtrar en el dashboard; el notebook verifica que `rank_plataformas_herramientas <= 12` reproduce las 12 tecnologías de 4.4.
- **Umbrales de muestra mínima.** Celdas del heatmap con menos de 30 encuestados se ocultan; países con menos de 100 se marcan con trama.

## Cambios respecto al Avance 2

| Cambio | Antes | Ahora | Efecto |
|---|---|---|---|
| Regla de desarrollo | Prefijo `Developer` | Prefijo `Developer, ` | Excluye *Developer Advocate* y *Developer Experience* |
| Denominador en 4.4 | Respondió plataformas **o** herramientas | Denominador propio por pregunta | Elimina la subestimación de la adopción de plataformas |
| Países no resueltos | Cape Verde y Swaziland excluidos | Agregados como `CPV` y `SWZ` | Eswatini aparece en el mapa |
| Top 5 del mapa | Empates resueltos de forma arbitraria | Desempate por n y lista de empatados | La leyenda es reproducible |
| Salidas | PNG en la carpeta de trabajo | `outputs/figures/` | Ubicación estable |
| Comparación de tecnologías (4.4 → 6.1) | Dos proporciones por segmento, sin controlar experiencia | Diferencia con IC de Newcombe dentro de cada rango de experiencia | Separa el efecto del rol del de la experiencia (p. ej., la brecha global de Azure desaparece) |

## Tablas para Apache Superset (`superset/data/`)

Columnas en *snake_case*, sin acentos. `pais`, `segmento` y `rango` se llaman igual en ambas tablas para que los filtros nativos del dashboard actúen sobre las dos.

**`encuestados.csv`**: una fila por encuestado de los segmentos de desarrollo y liderazgo (41,560 filas).

| Columna | Tipo | Descripción |
|---|---|---|
| `response_id` | Entero | `ResponseId` de la encuesta |
| `years_code_pro` | Decimal (nulo si no respondió) | `YearsCodePro` numérico (0 = menos de 1 año, 51 = más de 50) |
| `rol_principal` | Texto | Primer valor de `DevType` |
| `segmento` | Texto | Desarrollo (contribuidor individual) / Liderazgo y dirección |
| `segmento_corto` | Texto | Desarrollo / Liderazgo, para leyendas |
| `rango` | Texto | 0-2, 3-5, 6-10, 11-15, 16-20, 20+ o «Sin dato» |
| `rango_orden` | Entero | 1-6 según el orden de los rangos; 99 = «Sin dato». Superset ordena el texto alfabéticamente |
| `pais` | Texto | `Country`; «Sin país» si está vacío |
| `iso3` | Texto (nulo en «Sin país» y *Nomadic*) | Código ADM0_A3 |

**`adopcion.csv`**: una fila por país × segmento × rango × pregunta × tecnología (136,341 filas).

| Columna | Tipo | Descripción |
|---|---|---|
| `pais`, `iso3`, `segmento`, `segmento_corto`, `rango`, `rango_orden` | — | Igual que en `encuestados.csv` |
| `pregunta` | Texto | `lenguajes` (LanguageHaveWorkedWith), `plataformas` (PlatformHaveWorkedWith), `herramientas` (ToolsTechHaveWorkedWith) |
| `tecnologia` | Texto | Valor individual de la pregunta multivalor (todas las tecnologías: 49 lenguajes, 27 plataformas, 34 herramientas) |
| `rank_pregunta` | Entero | Ranking de la tecnología dentro de su pregunta (1 = más usada) según `usuarios` sumados en todos los países, segmentos y rangos. Ranking denso: los empates comparten número (Erlang y Zig en lenguajes). Igual en todas las filas de la tecnología |
| `rank_plataformas_herramientas` | Entero (vacío en `lenguajes`) | Mismo criterio, pero con plataformas y herramientas en un solo ranking, como la selección de la figura 4.4. `<= 12` devuelve exactamente sus 12 tecnologías |
| `usuarios` | Entero | Encuestados del grupo que marcaron la tecnología (incluye ceros) |
| `total` | Entero | Encuestados del grupo que respondieron la pregunta; se repite en todas las tecnologías del grupo |

## Archivos generados

| Archivo | Contenido |
|---|---|
| `data/processed/encuestados.csv` | Una fila por encuestado con las variables derivadas |
| `data/processed/mapeo_segmentos.csv` | Conteo de cada rol y su segmento asignado |
| `data/processed/diferencias_por_rango.csv` | Tabla de la figura 6.1: diferencia liderazgo − desarrollo por tecnología y rango (más fila `Global`), con n, proporciones en %, IC de Newcombe en pp e `ic_excluye_cero` |
| `data/processed/paises_interactiva.csv` | Países incluidos en 6.2 con su n de inclusión y los n que respondieron la pregunta de lenguajes por segmento |
| `docs/data/adopcion_lenguajes.json` | Datos de la web 6.2: `{pais, segmento, rango, lenguaje, usuarios, total, p, li, ls}` |
| `data/processed/tamanos_muestra.csv` | n de cada visualización por segmento (incluye 6.1, 6.2 y 6.3; se reexporta al final del notebook) |
| `superset/data/encuestados.csv`, `superset/data/adopcion.csv` | Tablas para el dashboard de BI (ver sección anterior) |
| `outputs/figures/*.png` | Figuras a 300 dpi (el panel `6_1_comparacion_avance2_vs_final.png`, a 200 dpi) |
