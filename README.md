# SIGF

Sistema de logística (frontend React + backend Node/TS + Postgres), orquestado con Docker Compose para **desarrollo** con hot-reload.

## Estructura

```
SIGF/
├── docker-compose.yml      # levanta los 3 servicios con un comando
├── .env                    # variables (puertos, credenciales DB)
├── db/
│   └── init.sql            # crea la tabla users + usuario de prueba (se ejecuta 1 vez)
├── backend/                # API Node + TypeScript + Express
│   └── src/
│       ├── index.ts        # servidor + /api/health
│       ├── db.ts           # pool de Postgres
│       └── routes/auth.ts  # POST /api/auth/login
└── frontend/               # React + TypeScript + Vite
    └── src/
        ├── router.tsx      # rutas (/ -> /login)
        └── pages/LoginPage.tsx
```

## Levantar el proyecto

La forma corta, con el script incluido:

```bash
./sigf start      # levanta todo (frontend + backend + postgres)
./sigf stop       # detiene todo (conserva los datos)
./sigf log        # ver logs en vivo (./sigf log backend para uno solo)
```

(Equivale a `docker compose up --build -d`, `docker compose down`, etc.)

Servicios disponibles:

| Servicio  | URL / acceso                         |
|-----------|--------------------------------------|
| Frontend  | http://localhost:5173                |
| Backend   | http://localhost:4000/api/health     |
| Postgres  | localhost:5432                       |

La primera vez tarda (descarga imágenes + `npm install`). Las siguientes son rápidas.

## Login de prueba

- **Email:** `admin@sigf.com`
- **Clave:** `admin123`

## Conectarte a Postgres desde tu sistema

Con psql, DBeaver, pgAdmin, etc.:

```
Host:     localhost
Puerto:   5432
Usuario:  sigf
Clave:    sigf_dev_password
Base:     sigf_db
```

O por terminal:

```bash
psql "postgresql://sigf:sigf_dev_password@localhost:5432/sigf_db"
```

## Comandos del script `./sigf`

```bash
./sigf start        # levanta SIGF (reconstruye si hace falta)
./sigf stop         # detiene SIGF (conserva los datos)
./sigf log [svc]    # logs en vivo (ej: ./sigf log frontend)
./sigf restart      # reinicia los servicios
./sigf status       # estado de los contenedores
./sigf reset-db     # BORRA y recrea la base de datos desde db/init.sql
```

Equivalente con docker compose directo:

```bash
docker compose up --build -d      # levantar
docker compose down               # apagar (conserva los datos)
docker compose down -v            # apagar y BORRAR la base de datos
docker compose logs -f backend    # ver logs de un servicio
```

> Los cambios en `frontend/src` y `backend/src` se recargan solos (hot-reload).
> Si editas `init.sql`, debes recrear el volumen: `docker compose down -v && docker compose up`.

## Solución de problemas

### El frontend/backend no carga o se cuelga (timeout), pero adentro del contenedor sí responde

**Síntoma:** `http://localhost:5173` (login) o `http://localhost:4000` tardan eternamente / no
cargan, aunque `docker compose ps` dice que todo está `Up` y `docker exec sigf_frontend wget -O- http://localhost:5173/` responde al instante.

**Causa:** En Arch, **NetworkManager "adopta" los bridges de Docker (`br-*`) y les quita la IP.**
Sin esa IP el host pierde la ruta hacia los contenedores y manda el tráfico por el WiFi → timeout.
Se diagnostica así (si la ruta sale por tu WiFi en vez de por `br-*`, es esto):

```bash
ip route get 172.21.0.3          # si dice "via 192.168.x.x dev wlp..." → bridge sin IP
ip route | grep br-              # debería existir "172.x.0.0/16 dev br-..."; si no, está roto
```

**Arreglo rápido (recrea la red, sin sudo):**

```bash
docker compose down && docker compose up -d
```

**Arreglo definitivo (para que no vuelva a pasar — requiere sudo, una sola vez):**

```bash
sudo tee /etc/NetworkManager/conf.d/unmanage-docker.conf >/dev/null <<'EOF'
[keyfile]
unmanaged-devices=interface-name:docker0;interface-name:br-*;interface-name:veth*
EOF
sudo nmcli general reload
```

Con esto NetworkManager ignora las interfaces de Docker y el problema desaparece de forma permanente.
