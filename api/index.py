import pathlib
import sys

backend_dir = pathlib.Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

from main import app  # noqa: E402
