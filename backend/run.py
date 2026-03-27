from __future__ import annotations

from pathlib import Path

import uvicorn

from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    backend_root = Path(__file__).resolve().parent
    is_development = settings.app_env.lower() == 'development'

    run_kwargs = {
        'host': settings.app_host,
        'port': settings.app_port,
        'log_level': settings.log_level,
    }

    if is_development:
        run_kwargs['reload'] = True
        run_kwargs['reload_dirs'] = [str(backend_root / 'app')]

    uvicorn.run('app.main:app', **run_kwargs)


if __name__ == '__main__':
    main()