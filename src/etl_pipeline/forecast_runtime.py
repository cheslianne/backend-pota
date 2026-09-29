import os
from pathlib import Path


def ensure_forecast_runtime():
    """Select and validate CmdStan before constructing a Prophet model."""
    import cmdstanpy

    configured_path = os.getenv("CMDSTAN")
    if configured_path and Path(configured_path).exists():
        cmdstanpy.set_cmdstan_path(configured_path)

    try:
        path = Path(cmdstanpy.cmdstan_path())
    except ValueError as error:
        raise RuntimeError(
            "CmdStan is not installed; rebuild the image with a working "
            "CmdStan installation."
        ) from error

    cmdstan_binary = path / "bin" / "cmdstan"
    if not cmdstan_binary.exists():
        raise RuntimeError(
            f"CmdStan installation is incomplete: missing executable {cmdstan_binary}."
        )

    cmdstanpy.set_cmdstan_path(str(path))
    print(f"Forecast runtime ready: CmdStan {path}")