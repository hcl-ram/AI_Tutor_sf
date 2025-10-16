"""Lightweight agent framework shim.

This package provides a minimal Agent abstraction and tool registration so the
application can run without external dependencies. It is intentionally simple
and focused on routing high-level intents to concrete tools.
"""

from .base import Agent, tool  # re-export for convenience

__all__ = ["Agent", "tool"]



