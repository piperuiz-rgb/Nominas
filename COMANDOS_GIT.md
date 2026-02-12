# Comandos para subir al repositorio GitHub

## Si aún no has clonado el repositorio:

```bash
# Clonar el repositorio
git clone https://github.com/piperuiz-rgb/Nominas.git
cd Nominas

# Copiar los archivos descargados a la carpeta del repositorio
# (Copia manualmente: index.html, README.md, .gitignore, ejemplo_empleados.csv)

# Añadir los archivos
git add .

# Hacer commit
git commit -m "feat: sistema completo con BD empleados, histórico y distribución analítica corregida"

# Subir al repositorio
git push origin main
```

## Si ya tienes el repositorio clonado:

```bash
# Ir a la carpeta del repositorio
cd Nominas

# Copiar los archivos nuevos (sobreescribir si es necesario)
# (Copia manualmente los archivos descargados)

# Ver los cambios
git status

# Añadir todos los cambios
git add .

# Hacer commit
git commit -m "feat: añadir CRUD empleados y corregir distribución analítica"

# Subir
git push origin main
```

## Para activar GitHub Pages:

1. Ve a: https://github.com/piperuiz-rgb/Nominas/settings/pages
2. En "Source" selecciona: **main** branch
3. Carpeta: **/ (root)**
4. Click en "Save"
5. Tu app estará disponible en: https://piperuiz-rgb.github.io/Nominas

## Estructura de archivos recomendada:

```
Nominas/
├── index.html              # Aplicación principal
├── README.md              # Documentación
├── .gitignore             # Archivos a ignorar
├── ejemplo_empleados.csv  # Ejemplo para importar
└── docs/                  # (Opcional) Documentación adicional
```

## Mensajes de commit recomendados:

- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de errores
- `docs:` - Cambios en documentación
- `style:` - Cambios de estilo (no afectan funcionalidad)
- `refactor:` - Refactorización de código
- `chore:` - Tareas de mantenimiento

Ejemplo:
```bash
git commit -m "fix: corregir cálculo de distribución por centros múltiples"
```
