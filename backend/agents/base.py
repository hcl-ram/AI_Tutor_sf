from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional


class Tool:
    def __init__(self, name: str, fn: Callable[..., Any], description: str | None = None):
        self.name = name
        self.fn = fn
        self.description = description or (fn.__doc__ or "")

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        return self.fn(*args, **kwargs)


def tool(fn: Callable[..., Any]) -> Tool:
    """Decorator to register a function as a tool.

    Usage:
        @tool
        def my_tool(x: int) -> int: ...
    """
    return Tool(fn.__name__, fn, fn.__doc__)


class Agent:
    """Very small agent abstraction that selects and calls tools based on input.

    This shim provides predictable behavior: if input is a dict containing
    "type" matching a tool name, it calls that tool. Otherwise, it attempts to
    choose a tool by simple heuristics. This can later be replaced with a full
    Strands/AWS agent orchestrator without changing route code.
    """

    def __init__(self, name: str, prompt: str, tools: List[Tool]):
        self.name = name
        self.prompt = prompt
        self._tools: Dict[str, Tool] = {t.name: t for t in tools}

    def run(self, input: Any, context: Optional[Dict[str, Any]] = None) -> Any:
        context = context or {}
        if isinstance(input, dict):
            t = input.get("type")
            if isinstance(t, str) and t in self._tools:
                # Direct tool invocation with kwargs
                kwargs = {k: v for k, v in input.items() if k != "type"}
                return self._tools[t](**kwargs)

            # Heuristic routing
            if "question" in input and "s3_key" in input and "rag_answer" in self._tools:
                return self._tools["rag_answer"](input["question"], input["s3_key"], top_k=int(input.get("top_k", 5)))
            if "question" in input and "context" in input and "answer_with_context" in self._tools:
                return self._tools["answer_with_context"](input["question"], input.get("context", ""))
            if "topics" in input and "subject" in input and "generate_study_plan" in self._tools:
                return self._tools["generate_study_plan"](input)
        # Fallback: return help
        return {
            "message": "Unknown request. Provide a 'type' that matches a tool or required fields.",
            "available_tools": list(self._tools.keys()),
        }



