from .models import AssistantLog


def log_prompt(user_id, prompt: str) -> AssistantLog:
    return AssistantLog.objects.create(user_id=user_id, prompt=prompt)
