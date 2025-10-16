from __future__ import annotations

from .base import Agent
from .tools import (
    generate_study_plan,
    rag_answer,
    doc_summary,
    answer_with_context,
)


tutor_agent = Agent(
    name="StudentCoach",
    prompt=(
        "You are an AI Tutor. Understand goals, plan steps, and use tools to help "
        "study, retrieve context from docs, and adapt difficulty. Be concise."
    ),
    tools=[
        generate_study_plan,
        rag_answer,
        doc_summary,
        answer_with_context,
    ],
)



