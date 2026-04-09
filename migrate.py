#!/usr/bin/env python3
"""
Migración INVEXUS — Lee .env.local y ejecuta SQL en Supabase
"""
import os, sys, json, re, subprocess

# Leer .env.local
env_path = os.path.expanduser("~/Desktop/invexus/.env.local")
if not os.path.exists(env_path):
    print(f"ERROR: No encontré {env_path}")
    sys.exit(1)

env = {}
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

url = env.get('NEXT_PUBLIC_SUPABASE_URL', '')
service_key = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not url or 'PEGAR' in service_key or not service_key:
    print("ERROR: Completá SUPABASE_SERVICE_ROLE_KEY en .env.local")
    print(f"URL: {url}")
    print(f"Service key: {service_key[:30]}...")
    sys.exit(1)

print(f"✓ URL: {url}")
print(f"✓ Service key: {service_key[:30]}...")

# Usar supabase-py para ejecutar SQL
try:
    from supabase import create_client
    sb = create_client(url, service_key)
    print("✓ Conexión Supabase OK")
except ImportError:
    print("Instalando supabase...")
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'supabase', '-q'])
    from supabase import create_client
    sb = create_client(url, service_key)

# Cargar datos
data_file = os.path.join(os.path.dirname(__file__), 'migration_data.json')
if not os.path.exists(data_file):
    # Buscar en el directorio actual
    data_file = 'migration_data.json'
    
with open(data_file) as f:
    d = json.load(f)

print(f"\nDatos a migrar:")
print(f"  Inventario: {len(d['inventario'])} vehículos")
print(f"  Ventas: {len(d['ventas'])} operaciones")
print(f"  TC histórico: {len(d['tipo_cambio'])} días")
print(f"  Leads: {len(d['leads'])} clientes")

# ── 1. TC Histórico ───────────────────────────────────────────────────────────
print("\n[1/4] Migrando TC histórico...", end='', flush=True)
tc_data = [{'fecha': r['fecha'], 'tc_bna_venta': r['tc_bna_venta']} for r in d['tipo_cambio']]
try:
    # Insertar en chunks de 100
    for i in range(0, len(tc_data), 100):
        chunk = tc_data[i:i+100]
        sb.table('tipo_cambio').upsert(chunk, on_conflict='fecha').execute()
    print(f" ✓ {len(tc_data)} registros")
except Exception as e:
    print(f" ERROR: {e}")

# ── 2. Inventario ─────────────────────────────────────────────────────────────
print("[2/4] Migrando inventario...", end='', flush=True)
try:
    result = sb.table('inventario').upsert(d['inventario'], on_conflict='id').execute()
    print(f" ✓ {len(d['inventario'])} vehículos")
except Exception as e:
    print(f" ERROR: {e}")

# ── 3. Ventas ─────────────────────────────────────────────────────────────────
print("[3/4] Migrando ventas...", end='', flush=True)
try:
    result = sb.table('ventas').upsert(d['ventas'], on_conflict='id').execute()
    print(f" ✓ {len(d['ventas'])} operaciones")
except Exception as e:
    print(f" ERROR: {e}")

# ── 4. Leads ──────────────────────────────────────────────────────────────────
print("[4/4] Migrando leads...", end='', flush=True)
try:
    result = sb.table('leads').insert(d['leads']).execute()
    print(f" ✓ {len(d['leads'])} leads")
except Exception as e:
    print(f" WARNING: {e} (pueden ya existir)")

print("\n✅ Migración completada!")
print("Recargá http://localhost:3000/dashboard para ver los datos.")
