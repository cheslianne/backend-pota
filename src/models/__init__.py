"""Import all SQLAlchemy models before any mapper is configured."""

import importlib
import pkgutil


for module_info in pkgutil.iter_modules(__path__):
    if module_info.name.startswith("__"):
        continue
    importlib.import_module(f"{__name__}.{module_info.name}")
