#!/usr/bin/env pwsh
# LibreTranslate Startup Script
# Starts LibreTranslate service on port 5000

Write-Host "Starting LibreTranslate..." -ForegroundColor Green
Write-Host "Translation service available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""

& py -c @"
import sys
import os
from argparse import ArgumentParser

parser = ArgumentParser(description='LibreTranslate')
parser.add_argument('--port', default=5000, type=int, help='Port to bind to')
parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
parser.add_argument('--threads', default=4, type=int, help='Number of threads')

# Parse known args
args, unknown = parser.parse_known_args()

# Now set the necessary environment variables for LibreTranslate
os.environ['LT_PORT'] = str(args.port)
os.environ['LT_HOST'] = args.host

print('╔' + '═' * 58 + '╗')
print('║' + ' LibreTranslate Translation Service '.center(58) + '║')
print('╠' + '═' * 58 + '╣')
print('║ URL: http://{}:{:<43} ║'.format(args.host, args.port))
print('║ Status: Running...                                      ║')
print('╚' + '═' * 58 + '╝')
print()

from libretranslate.app import create_app
from flask_cors import CORS
from flask import Flask

# Create minimal args namespace
from argparse import Namespace
app_args = Namespace(
    port=args.port,
    host=args.host,
    threads=args.threads,
    workers=None,
    use_ssl=False,
    ssl_certfile=None,
    ssl_keyfile=None,
    load_only=None,
    update_models=False,
    force_update_models=False,
    api_keys=None,
    require_api_key_origin=None,
    secret=None,
    disable_web_ui=False,
    disable_frontend=False,
    frontend_language_target='en',
    frontend_language_source='auto',
    frontend_timeout=None,
    req_limit=0,
    req_limit_storage=None,
    daily_req_limit=0,
    hourly_req_limit=0,
    char_limit=None,
    translation_cache=[],
    db=None,
    disable_files_translation=False,
    batch_limit_files=None,
    batch_limit_letters=None,
    form_submission_log=None,
    shared_storage='memory://',
    ip_registry=None,
    ip_registry_api_key=None,
    key_update_interval=None,
    url_prefix='',
    backend_timeout=None,
    local_swagger=False,
    advanced_api=False,
    disable_transliteration=False,
    disable_installation_check=False,
    suggestions=None,
    suggestions_obj_initial_size=None,
    log_level=None,
    secondary=False,
    req_flood_threshold=0,
)

app = create_app(app_args)
CORS(app)
app.run(host=app_args.host, port=app_args.port, debug=False, use_reloader=False, threaded=True)
"@

