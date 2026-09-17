#!/usr/bin/env python3
"""Consistent SQLite backup, integrity check, gzip and private GCS upload.

Uses the VM's attached service account; no downloaded credentials.
Bucket permissions: storage.objectCreator only. Run under the systemd timer.
"""
import datetime
import gzip
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import urllib.parse
import urllib.request
import uuid

APP = Path('/opt/torneos/app')
BUCKET = os.environ['BACKUP_BUCKET']
COMPOSE = ['docker', 'compose', '-p', 'torneos', '--project-directory', str(APP)]

def command(*args):
    subprocess.run([*COMPOSE, *args], check=True, timeout=180,
                   stdout=subprocess.DEVNULL)

with tempfile.TemporaryDirectory(prefix='backup-', dir='/var/lib/torneos-backup') as directory:
    target = Path(directory) / 'tournament.sqlite'
    command('exec', '-T', 'app', 'node', 'scripts/backup.mjs', '/data/backups/current.sqlite')
    command('cp', 'app:/data/backups/current.sqlite', str(target))
    with sqlite3.connect(f'file:{target}?mode=ro', uri=True) as connection:
        if connection.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
            raise RuntimeError('SQLite integrity check failed; backup was not uploaded.')
    metadata = urllib.request.Request(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        headers={'Metadata-Flavor': 'Google'})
    with urllib.request.urlopen(metadata, timeout=15) as response:
        token = json.load(response)['access_token']
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y/%m/%d/%H%M%S')
    name = f'sqlite/{stamp}-{uuid.uuid4().hex[:8]}.sqlite.gz'
    params = urllib.parse.urlencode({'uploadType':'media', 'name':name, 'ifGenerationMatch':'0'})
    payload = gzip.compress(target.read_bytes())
    request = urllib.request.Request(
        f'https://storage.googleapis.com/upload/storage/v1/b/{BUCKET}/o?{params}',
        data=payload, method='POST',
        headers={'Authorization':f'Bearer {token}', 'Content-Type':'application/gzip'})
    with urllib.request.urlopen(request, timeout=120) as response:
        result = json.load(response)
    if int(result['size']) != len(payload):
        raise RuntimeError('Unexpected uploaded backup size.')
    print(f'Backup verified and uploaded: gs://{BUCKET}/{name} ({len(payload)} bytes)')
