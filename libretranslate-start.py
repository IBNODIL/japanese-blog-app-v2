#!/usr/bin/env python
"""
LibreTranslate startup script
Starts the translation service on port 5000 with support for uz, ja, en, ru
"""

from argparse import Namespace
from libretranslate.app import create_app

# Create arguments namespace with desired configuration
# Based on libretranslate CLI argument defaults
args = Namespace(
    # Server config
    port=5000,
    host='127.0.0.1',
    threads=4,
    workers=None,
    use_ssl=False,
    ssl_certfile=None,
    ssl_keyfile=None,
    
    # Translation config
    load_only=None,  # Load available models for uz, ja, en, ru (None = load all)
    update_models=False,
    force_update_models=False,
    
    # API config
    api_keys=None,
    require_api_key_origin=None,
    secret=None,
    
    # Frontend config
    disable_web_ui=False,
    disable_frontend=False,
    frontend_language_target='en',
    frontend_language_source='auto',
    frontend_timeout=None,
    
    # Rate limiting
    req_limit=0,
    req_limit_storage=None,
    daily_req_limit=0,
    hourly_req_limit=0,
    
    # Cache config
    char_limit=None,
    translation_cache=[],
    
    # Database
    db=None,
    
    # Files
    disable_files_translation=False,
    batch_limit_files=None,
    batch_limit_letters=None,
    form_submission_log=None,
    
    # Storage
    shared_storage='memory://',
    
    # IP Registry
    ip_registry=None,
    ip_registry_api_key=None,
    key_update_interval=None,
    
    # Advanced options
    url_prefix='',
    backend_timeout=None,
    local_swagger=False,
    advanced_api=False,
    disable_transliteration=False,
    disable_installation_check=False,
    suggestions=None,
    suggestions_obj_initial_size=None,
    log_level=None,
)

# Create and run the Flask app
app = create_app(args)

print("=" * 60)
print("✓ LibreTranslate Started")
print("URL: http://127.0.0.1:5000")
print("Languages: uz, ja, en, ru")
print("=" * 60)
print()

app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
