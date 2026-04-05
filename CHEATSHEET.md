# Mindstack Ops Cheatsheet

> Universelle Befehlsreferenz für die gesamte Mindstack-Infrastruktur.  
> Suchbar per `Ctrl+F` / `Cmd+F`. Jede Sektion hat einen Anker-Link.  
> Wächst mit den Aufgaben. Stand: 2026-04.

---

## Inhaltsverzeichnis

- [Proxmox Host](#proxmox-host)
  - [Systemanalyse](#systemanalyse)
  - [VM-Verwaltung (KVM/QEMU)](#vm-verwaltung-kvmqemu)
  - [Container-Verwaltung (LXC)](#container-verwaltung-lxc)
  - [In Container einsteigen / verlassen](#in-container-einsteigen--verlassen)
  - [Speicher & Storage](#speicher--storage)
  - [Netzwerk](#netzwerk-proxmox)
  - [Backup & Restore](#backup--restore)
  - [Updates & Repositories](#updates--repositories)
  - [Logs & Monitoring](#logs--monitoring-proxmox)
- [VPS Stack (Contabo)](#vps-stack-contabo)
  - [Verbindung & Zugang](#verbindung--zugang)
  - [Docker Compose Grundbefehle](#docker-compose-grundbefehle)
  - [Stack-spezifische Dienste](#stack-spezifische-dienste)
  - [OpenClaw / Clawd](#openclaw--clawd)
  - [n8n](#n8n)
  - [Postgres](#postgres)
  - [Qdrant](#qdrant)
  - [Caddy](#caddy)
  - [Backup VPS](#backup-vps)
- [WireGuard](#wireguard)
- [Home Assistant](#home-assistant)
  - [Zugang & Shell](#zugang--shell)
  - [Konfiguration & Restart](#konfiguration--restart)
  - [Logs](#logs-home-assistant)
- [Zigbee / Zigbee2MQTT](#zigbee--zigbee2mqtt)
- [InfluxDB](#influxdb)
- [Grafana](#grafana)
- [Git & GitHub](#git--github)
- [Netzwerk allgemein](#netzwerk-allgemein)
- [System allgemein (Linux)](#system-allgemein-linux)
- [Glossar / Konzepte](#glossar--konzepte)

---

## Proxmox Host

**Zugang:** `ssh root@<PROXMOX_HOST>`  
**Web-UI:** `https://<PROXMOX_HOST>:8006`  
**Proxmox-Version:** `pve-manager/8.4.16`

---

### Systemanalyse

```bash
# Proxmox-Version und installierte Pakete
pveversion --verbose

# Systemlaufzeit, Load Average
uptime

# RAM-Übersicht (human-readable)
free -h

# RAM-Verbrauch pro Prozess (nach RAM sortiert, Top 20)
ps aux --sort=-%mem | head -n 20

# Interaktive Prozessübersicht
htop

# top nach RAM-Verbrauch sortiert starten
top -o %MEM

# CPU- und RAM-Ressourcen aller Gäste auf einen Blick
pvesh get /cluster/resources --type vm

# Festplattenauslastung (alle Mounts)
df -h

# Blockgeräte und Partitionen anzeigen
lsblk

# Disk-I/O-Statistiken (1-Sekunden-Intervall)
iostat -x 1

# Kernel-Meldungen (letzte 20 Einträge)
dmesg | tail -20

# Kritische Systemfehler aus dem Journal
journalctl -xe -p 3 -n 50

# Proxmox eigener Performance-Test
pveperf
```

---

### VM-Verwaltung (KVM/QEMU)

VMs werden mit `qm` gesteuert. Jede VM hat eine numerische VMID (z.B. 101 für HAOS).

```bash
# Alle VMs auflisten (Status, RAM, Disk, PID)
qm list

# Status einer einzelnen VM abfragen
qm status 101

# VM starten
qm start 101

# VM sauber herunterfahren (ACPI-Signal, wie "Herunterfahren" drücken)
qm stop 101

# VM hart abwürgen (sofortiger Stopp, kein sauberes Shutdown)
qm reset 101

# VM neu starten
qm reboot 101

# Konfiguration einer VM anzeigen
qm config 101

# RAM einer laufenden VM ändern (in MB, wirkt erst nach Neustart)
qm set 101 --memory 6144

# QEMU Monitor öffnen (Low-Level-Diagnose, z.B. balloon-Status)
qm monitor 101
# Im Monitor: info balloon   → zeigt tatsächlich genutzten RAM
# Im Monitor: q              → Monitor verlassen

# VM klonen (NEWID = neue VMID, NAME = neuer Hostname)
qm clone 101 150 --name haos-clone

# VM löschen (muss gestoppt sein)
qm destroy 101

# Snapshot erstellen
qm snapshot 101 snap-$(date +%Y%m%d) --description "vor RAM-Änderung"

# Snapshot auflisten
qm listsnapshot 101

# Snapshot wiederherstellen
qm rollback 101 snap-20260401
```

---

### Container-Verwaltung (LXC)

LXC-Container werden mit `pct` gesteuert. Leichter als VMs, kein eigener Kernel.

```bash
# Alle Container auflisten
pct list

# Status eines Containers
pct status 210

# Container starten
pct start 210

# Container stoppen
pct stop 210

# Container neu starten
pct reboot 210

# Konfiguration anzeigen
pct config 210

# RAM eines Containers ändern (in MB, bei LXC ohne Neustart möglich)
pct set 210 --memory 768

# Container löschen (muss gestoppt sein)
pct destroy 210

# Datei vom Host in den Container kopieren
pct push 210 /root/datei.txt /root/datei.txt

# Datei aus dem Container auf den Host holen
pct pull 210 /root/datei.txt /root/datei.txt
```

---

### In Container einsteigen / verlassen

Das ist einer der häufigsten Stolperpunkte. Hier die drei Wege:

```bash
# Weg 1: direkt einsteigen (interaktive Shell im Container)
# Du bist danach "inside" des Containers, prompt wechselt z.B. zu root@influxdb
pct enter 210

# Verlassen: einfach
exit

# Weg 2: einzelnen Befehl im Container ausführen, ohne reinzugehen
# Nützlich für schnelle Checks von außen
pct exec 210 -- free -m
pct exec 210 -- systemctl status influxdb
pct exec 210 -- bash -c "df -h && free -m"

# Weg 3: bash explizit starten (wenn Shell nicht automatisch stimmt)
pct exec 210 -- bash

# Verlassen (bei Weg 2/3 aus bash):
exit
# oder Tastenkürzel:
Ctrl+D
```

> **Merkhilfe:**  
> `pct enter` = du gehst rein, bleibst drin bis `exit`  
> `pct exec` = du rufst was von außen auf, kommst automatisch zurück  

---

### Speicher & Storage

```bash
# Alle konfigurierten Storages und deren Füllstand
pvesm status

# Inhalt eines Storages auflisten (z.B. local-lvm)
pvesm list local-lvm

# LVM Physical Volumes anzeigen
pvs

# LVM Volume Groups anzeigen
vgs

# LVM Logical Volumes anzeigen (alle Disks der VMs/CTs)
lvs

# Größe eines LV anzeigen (spezifisch)
lvdisplay /dev/pve/vm-101-disk-1

# ZFS Pool-Status (falls ZFS genutzt)
zpool status

# ZFS Datasets auflisten
zfs list

# Speichernutzung und freier Platz eines Datasets
zfs get used,available pve/data

# Disk-Images und deren Größe
du -sh /var/lib/vz/images/*
```

---

### Netzwerk (Proxmox)

```bash
# Alle Netzwerkinterfaces und IPs
ip a

# Bridge-Konfiguration anzeigen (vmbr0 etc.)
brctl show

# Netzwerkkonfiguration (statisch in Datei)
cat /etc/network/interfaces

# Netzwerk-Dienst neu starten (Vorsicht bei Remote-Zugang!)
systemctl restart networking

# Offene Ports und lauschende Dienste
ss -tulpn

# Firewall-Status (Proxmox-eigene Firewall)
pve-firewall status

# Firewall-Regeln kompilieren und prüfen
pve-firewall compile

# Paketmitschnitt auf Bridge (Diagnose)
tcpdump -i vmbr0 -n host <HA_HOST>
```

---

### Backup & Restore

```bash
# Snapshot-Backup einer VM in lokalen Storage
vzdump 101 --mode snapshot --compress zstd --storage local

# Snapshot-Backup eines Containers
vzdump 210 --mode snapshot --compress zstd --storage local

# Alle VMs und Container sichern
vzdump --all 1 --mode snapshot --compress zstd --storage local

# VM aus Backup wiederherstellen
qmrestore /var/lib/vz/dump/vzdump-qemu-101-*.vma.zst 101

# Container aus Backup wiederherstellen
pct restore 210 /var/lib/vz/dump/vzdump-lxc-210-*.tar.zst --storage local-lvm

# Manuelles Backup InfluxDB-Daten (im Container ausführen)
influx backup --bucket homeassistant /backup/influxdb/$(date +%Y%m%d)

# Manuelles Backup Grafana (im Container ausführen)
tar -czf /backup/grafana-$(date +%Y%m%d).tar.gz /etc/grafana/ /var/lib/grafana/
```

---

### Updates & Repositories

```bash
# System aktualisieren
apt update && apt dist-upgrade -y

# Nur Sicherheitsupdates
apt-get upgrade --with-new-pkgs

# Enterprise-Repo deaktivieren (kein Abo)
# Datei bearbeiten: /etc/apt/sources.list.d/pve-enterprise.list
# Zeile auskommentieren oder ersetzen durch:
# deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription

# No-Subscription-Repo prüfen
cat /etc/apt/sources.list.d/pve-no-subscription.list

# Upgrade-Pfad von Proxmox 7 auf 8 prüfen
pve7to8 --full
```

---

### Logs & Monitoring (Proxmox)

```bash
# Task-Log live verfolgen (alle laufenden und abgeschlossenen Tasks)
tail -f /var/log/pve/tasks/index

# PVE-Cluster-Dienst-Log
journalctl -u pve-cluster -f

# PVE-Daemon-Log (Hauptdienst)
journalctl -u pvedaemon -f

# Firewall-Log
cat /var/log/pve/firewall.log

# Alle Ressourcen im Cluster (VMs, CTs, Storage, Nodes)
pvesh get /cluster/resources

# Ressourcen gefiltert nach VMs
pvesh get /cluster/resources --type vm

# Node-Details (CPU, RAM, Disk eines Nodes)
pvesh get /nodes/pve/status
```

---

## VPS Stack (Contabo)

**Host:** `<VPS_HOST>`  
**WireGuard-IP:** `<WG_SERVER_IP>`  
**Stack-Verzeichnis:** `~/stack/`  
**GitHub-Repo:** `github.com/Techmods/vps-stack`

---

### Verbindung & Zugang

```bash
# SSH via WireGuard-Alias (bevorzugt)
ssh VPS_Contabo_WG

# SSH direkt (ohne WireGuard)
ssh root@<VPS_HOST>

# WireGuard muss aktiv sein für:
# - OpenClaw Gateway  <WG_SERVER_IP>:18789
# - Qdrant            <WG_SERVER_IP>:6333
# - Portainer         <WG_SERVER_IP>:9000
# - Netdata           <WG_SERVER_IP>:19999
```

| Service | Adresse | Zugang |
|---|---|---|
| n8n | https://<N8N_HOST> | öffentlich |
| OpenClaw Gateway | <WG_SERVER_IP>:18789 | WireGuard |
| Qdrant | <WG_SERVER_IP>:6333 | WireGuard |
| Portainer | <WG_SERVER_IP>:9000 | WireGuard |
| Netdata | <WG_SERVER_IP>:19999 | WireGuard |

---

### Docker Compose Grundbefehle

Alle Compose-Befehle aus `~/stack/` ausführen.

```bash
cd ~/stack

# Status aller Container (Name, Status, Health, Ports)
docker compose ps

# Alle Container starten
docker compose up -d

# Alle Container stoppen (Container bleiben erhalten, nur gestoppt)
docker compose stop

# Alle Container stoppen UND entfernen (Volumes bleiben)
docker compose down

# Einzelnen Service neu starten
docker compose restart openclaw

# Einzelnen Service neu bauen und starten (z.B. nach Dockerfile-Änderung)
docker compose build --pull openclaw && docker compose up -d openclaw

# Logs aller Services (letzte 100 Zeilen)
docker compose logs --tail=100

# Logs eines einzelnen Services live verfolgen
docker compose logs -f n8n

# Shell in laufendem Container öffnen
docker compose exec -it openclaw bash

# Einmaligen Befehl in Container ausführen (ohne reinzugehen)
docker compose exec openclaw openclaw status

# Container komplett neu erstellen (z.B. bei hartem Fehler)
docker compose up -d --force-recreate openclaw

# Docker-Ressourcenübersicht (Images, Volumes, Cache)
docker system df

# Aufräumen: gestoppte Container + dangling Images
docker system prune -f

# Aufräumen: ungenutzte Volumes (WARNUNG: Datenverlust möglich)
docker volume prune -f
```

---

### Stack-spezifische Dienste

```bash
# Schnell-Healthcheck aller relevanten Endpunkte
curl -fsS http://<WG_SERVER_IP>:18789/healthz   # OpenClaw
curl -fsS http://<WG_SERVER_IP>:6333/healthz    # Qdrant
curl -fsS http://<WG_SERVER_IP>:19999/api/v1/info  # Netdata

# Alles auf einen Blick
docker compose ps && docker compose exec openclaw openclaw gateway status
```

---

### OpenClaw / Clawd

```bash
# WICHTIG: Nie "openclaw update" im Container ausführen!
# Stattdessen immer:
docker compose build --pull openclaw && docker compose up -d openclaw

# Status
docker compose exec openclaw openclaw status
docker compose exec openclaw openclaw gateway status

# Channels prüfen (mit Verbindungstest)
docker compose exec openclaw openclaw channels status --probe

# Agents auflisten
docker compose exec openclaw openclaw agents list

# Skills auflisten
docker compose exec openclaw openclaw skills list

# Diagnose und Auto-Fix
docker compose exec openclaw openclaw doctor --fix

# Konfiguration anzeigen
docker compose exec openclaw cat /home/node/.openclaw/config/openclaw.json

# Konfigurationswert setzen (nicht per heredoc, direkt)
docker compose exec openclaw openclaw config set <key> <value>

# Datenpfad (Bind Mount, überlebt down/up)
# ~/openclaw-data/
```

---

### n8n

```bash
# Logs
docker compose logs --tail=100 n8n

# Shell im Container
docker compose exec -it n8n sh

# n8n CLI (im Container)
docker compose exec n8n n8n --help

# Workflow exportieren (im Container)
docker compose exec n8n n8n export:workflow --all --output=/home/node/exports/
```

**URL:** https://<N8N_HOST>  
**Daten-Volume:** `n8n_data`

---

### Postgres

```bash
# Verbindung testen
docker compose exec postgres pg_isready -U n8n

# psql-Shell öffnen
docker compose exec postgres psql -U n8n -d n8n

# Datenbankgröße anzeigen (in psql)
\l+

# psql verlassen
\q

# Tabellen auflisten (in psql)
\dt

# Backup der n8n-Datenbank
docker compose exec postgres pg_dump -U n8n n8n > ~/stack/backups/n8n-$(date +%Y%m%d).sql
```

---

### Qdrant

```bash
# Collections auflisten
curl -s http://<WG_SERVER_IP>:6333/collections | jq .

# Details einer Collection
curl -s http://<WG_SERVER_IP>:6333/collections/session-logs | jq .

# Logs
docker compose logs --tail=100 qdrant
```

**Zugang:** WireGuard erforderlich | API-Key via `QDRANT_API_KEY` in `.env`

---

### Caddy

```bash
# Caddy-Konfiguration validieren (ohne Neustart)
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile

# Caddy neu laden (TLS-Zertifikate etc., ohne Neustart)
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

# Logs
docker compose logs --tail=50 caddy
```

> Cloudflare DNS: grauer Cloud (DNS only). Caddy übernimmt TLS direkt via Let's Encrypt.  
> Kein oranger Cloud (proxied) — sonst schlägt die ACME-Challenge fehl.

---

### Backup VPS

```bash
# OpenClaw-Daten sichern
tar czf ~/openclaw-backup-$(date +%Y%m%d).tgz ~/openclaw-data/

# Docker Volumes sichern (n8n, Postgres, Qdrant)
docker run --rm \
  -v n8n_data:/src/n8n_data \
  -v postgres_data:/src/postgres_data \
  -v qdrant_data:/src/qdrant_data \
  -v $(pwd)/backups:/dst \
  alpine tar czf /dst/volumes-$(date +%Y%m%d).tgz -C /src .

# Stack-Repo sichern (git pull reicht meist)
cd ~/stack && git pull
```

---

## WireGuard

**Server:** `<WG_SERVER_IP>` (VPS)  
**Peers:** PC `<WG_PC_IP>` | S25 Ultra `<WG_PHONE_IP>` | Android Tablet `<WG_TABLET_IP>`

```bash
# Status und verbundene Peers anzeigen
wg show

# Interface-Status
ip a show wg0

# WireGuard starten / stoppen
wg-quick up wg0
wg-quick down wg0

# Konfigurationsdatei (Server)
cat /etc/wireguard/wg0.conf

# Verbindungstest zu einem Peer
ping <WG_PC_IP>

# Handshake-Zeitstempel prüfen (wann zuletzt verbunden)
wg show wg0 latest-handshakes
```

> WireGuard läuft auf dem VPS-Host direkt, nicht im Docker-Stack.  
> Alle WireGuard-gebundenen Services sind nur über `10.0.0.x` erreichbar.

---

## Home Assistant

**VM:** 101 | **IP:** `<HA_HOST>` | **RAM:** 8192 MB  
**Web-UI:** http://<HA_HOST>:8123  
**USB-Passthrough:** SONOFF ZBDongle-P (Zigbee-Koordinator)

---

### Zugang & Shell

```bash
# SSH in die HAOS-VM (über Proxmox-Host)
# Methode 1: Proxmox Console (Web-UI → VM 101 → Console)

# Methode 2: SSH direkt (wenn SSH-Add-on installiert)
ssh root@<HA_HOST>

# Methode 3: Terminal über Home Assistant Web-UI
# Add-ons → Terminal & SSH → Öffnen
```

---

### Konfiguration & Restart

```bash
# Konfiguration auf Fehler prüfen (im HA Terminal)
ha core check

# Home Assistant neu starten
ha core restart

# Home Assistant stoppen / starten
ha core stop
ha core start

# Add-on neu starten (Beispiel: Zigbee2MQTT)
ha addons restart core_zigbee2mqtt

# Systeminfo
ha info
ha host info
```

**Konfig-Dateien:**
- `/config/configuration.yaml` — Hauptkonfiguration
- `/config/secrets.yaml` — Tokens, Passwörter
- `/config/automations.yaml` — Automatisierungen

---

### Logs (Home Assistant)

```bash
# HA Core Logs
ha core logs

# InfluxDB-bezogene Einträge filtern
ha core logs | grep influx

# Add-on Logs
ha addons logs core_zigbee2mqtt

# Supervisor Log
ha supervisor logs
```

> `persistent_notification` ist ein eingebauter Service.  
> Aufruf in Automationen: `persistent_notification.create` — nicht als `notify`-Platform konfigurieren.

---

## Zigbee / Zigbee2MQTT

**Koordinator:** SONOFF ZBDongle-P (USB-Passthrough in VM 101)  
**Zugang:** Zigbee2MQTT läuft als HAOS Add-on

```bash
# Z2M Web-UI
# http://<HA_HOST>:8099 (oder über HA Add-on)

# Add-on neu starten (bei Koordinator-Problemen)
ha addons restart core_zigbee2mqtt

# Logs
ha addons logs core_zigbee2mqtt
```

> IKEA-Geräte sind konservativ bei Routenwechseln.  
> Nach neuen Router-Geräten: Z2M → Gerät → "Reconfigure" triggern für Mesh-Optimierung.

---

## InfluxDB

**CT:** 210 | **IP:** `<INFLUX_HOST>` | **Port:** 8086  
**Web-UI:** http://<INFLUX_HOST>:8086  
**Org:** `HomeLab` | **Bucket:** `homeassistant` | **Retention:** 43800h (5 Jahre)

```bash
# In den Container einsteigen
pct enter 210

# Service-Status prüfen
systemctl status influxdb

# influx CLI starten
influx

# Buckets auflisten
influx bucket list

# Backup erstellen
influx backup --bucket homeassistant /backup/influxdb/$(date +%Y%m%d)

# Token auflisten
influx auth list

# Datenfluss testen (von Host oder HA)
curl -s http://<INFLUX_HOST>:8086/health

# Container verlassen
exit
```

**Flux-Query Grundstruktur:**
```flux
from(bucket: "homeassistant")
  |> range(start: -6h)
  |> filter(fn: (r) => r["_measurement"] == "sensor.processor_use")
  |> filter(fn: (r) => r["_field"] == "value")
```

> Grafana benötigt umfassende Read-Permissions für den Token, nicht nur `read:buckets`.  
> `v.timeRangeStart` / `v.timeRangeStop` in neueren Grafana-Versionen broken — hardcoded `-6h` nutzen.

---

## Grafana

**CT:** 211 | **IP:** `<GRAFANA_HOST>` | **Port:** 3000  
**Web-UI:** http://<GRAFANA_HOST>:3000

```bash
# In den Container einsteigen
pct enter 211

# Service-Status prüfen
systemctl status grafana-server

# Grafana neu starten
systemctl restart grafana-server

# Konfigurationsdatei
cat /etc/grafana/grafana.ini

# Logs live verfolgen
journalctl -u grafana-server -f

# Container verlassen
exit
```

**Datasource-Konfiguration (InfluxDB):**
```
Query Language: Flux
URL:            http://<INFLUX_HOST>:8086
Basic Auth:     aus
Organization:   HomeLab
Token:          <aus secrets.yaml>
Default Bucket: homeassistant
```

---

## Git & GitHub

**Repo VPS-Stack:** `github.com/Techmods/vps-stack`  
**Authentifizierung:** SSH-Key auf VPS

```bash
# Status anzeigen (was ist geändert?)
git status

# Alle Änderungen stagen
git add .

# Einzelne Datei stagen
git add docker-compose.yml

# Commit erstellen
git commit -m "feat: ripgrep zu Dockerfile hinzugefügt"

# Pushen
git push

# Aktuellen Stand holen
git pull

# Log anzeigen (kompakt)
git log --oneline -10

# Änderungen anzeigen (unstaged)
git diff

# Änderungen anzeigen (staged)
git diff --staged

# Letzten Commit rückgängig machen (Änderungen bleiben erhalten)
git reset HEAD~1

# Index auf Remote-Stand zurücksetzen (Dateien unangetastet)
git reset origin/main

# Branch anzeigen
git branch -a

# Remote-URL prüfen
git remote -v
```

---

## Netzwerk allgemein

**Router:** Fritz!Box 7690 | `<ROUTER_IP>`  
**Subnetz:** `192.168.178.x`  
**NAS:** Buffalo LinkStation "Datengrab" | `<NAS_IP>` | SMB 2.0

```bash
# IP-Adressen und Interfaces
ip a

# Routing-Tabelle
ip route

# DNS-Auflösung testen
dig google.com
nslookup google.com

# Erreichbarkeit testen
ping <HA_HOST>

# Traceroute
traceroute <INFLUX_HOST>

# Offene Verbindungen und lauschende Ports
ss -tulpn

# Portscann eines Hosts (Diagnose)
nmap -p 1-1000 <HA_HOST>

# SMB-Share mounten (NAS, SMB 2.0 erforderlich)
mount -t cifs //<NAS_IP>/share /mnt/nas -o vers=2.0,username=<user>

# Aktuellen NFS/SMB-Mount prüfen
mount | grep cifs
```

---

## System allgemein (Linux)

```bash
# Aktuellen Benutzer und Hostname
whoami && hostname

# Betriebssystem-Info
cat /etc/os-release

# Kernel-Version
uname -r

# Laufende Dienste auflisten
systemctl list-units --type=service --state=running

# Dienst starten / stoppen / neu starten / Status
systemctl start <dienst>
systemctl stop <dienst>
systemctl restart <dienst>
systemctl status <dienst>

# Dienst beim Boot aktivieren / deaktivieren
systemctl enable <dienst>
systemctl disable <dienst>

# Cron-Jobs des aktuellen Benutzers
crontab -l

# Cron-Jobs bearbeiten
crontab -e

# Offene Dateien eines Prozesses
lsof -p <PID>

# Prozess-PID nach Name finden
pgrep -a <name>

# Prozess beenden
kill <PID>
kill -9 <PID>   # hart, sofort

# Festplattennutzung eines Verzeichnisses
du -sh /var/log

# Größte Verzeichnisse finden
du -sh /* 2>/dev/null | sort -rh | head -10

# Datei suchen
find / -name "*.log" -newer /tmp/ref 2>/dev/null

# Text in Dateien suchen
grep -r "influxdb" /etc/

# Dateiinhalt anzeigen
cat /etc/hosts
less /var/log/syslog

# Archiv erstellen
tar czf archiv.tar.gz /pfad/zum/verzeichnis

# Archiv entpacken
tar xzf archiv.tar.gz

# Berechtigungen setzen
chmod 600 /etc/wireguard/wg0.conf
chown -R 1000:1000 ~/openclaw-data
```

---

## Glossar / Konzepte

| Begriff | Bedeutung |
|---|---|
| `pct` | Proxmox Container Tool — steuert LXC-Container |
| `qm` | QEMU Manager — steuert KVM/QEMU-VMs |
| `pvesh` | Proxmox API-Shell — direkter API-Zugriff |
| `vzdump` | Proxmox Backup-Tool für VMs und Container |
| LXC | Linux Container — leichter als VM, teilt Host-Kernel |
| KVM | Kernel-based Virtual Machine — vollständige VM-Isolation |
| VMID | Numerische ID einer VM (z.B. 101 für HAOS) |
| CTID | Numerische ID eines Containers (z.B. 210 für InfluxDB) |
| Balloon | KVM-Mechanismus: RAM dynamisch zwischen Host und VM verschieben |
| vmbr0 | Virtuelle Bridge im Proxmox-Host (verbindet VMs/CTs mit physischem Netz) |
| Bind Mount | Verzeichnis vom Host direkt in Container gemountet (kein Docker Volume) |
| WireGuard | VPN-Protokoll — alle internen VPS-Services nur darüber erreichbar |
| Flux | Abfragesprache für InfluxDB v2 |
| InfluxQL | Alternative zu Flux, kompatibler mit älteren Tools |
| HAOS | Home Assistant Operating System (läuft als VM 101) |
| Z2M | Zigbee2MQTT — verbindet Zigbee-Geräte mit MQTT-Broker |
| Caddy | Reverse Proxy mit automatischem TLS (Let's Encrypt) |
| OpenClaw / Clawd | Self-hosted AI-Gateway (Claude-Modell, Telegram-Bot) |

---

> Letzte Aktualisierung: 2026-04  
> Repo: `github.com/Techmods/vps-stack` — diese Datei wächst mit jedem neuen Thema.
