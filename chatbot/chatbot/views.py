import json
import os

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from dotenv import load_dotenv
from google import genai

from .models import ChatMessage

load_dotenv()

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))


def home(request):
    """Render the chat page with existing message history."""
    messages = ChatMessage.objects.all()
    messages_data = [
        {"role": msg.role, "content": msg.content}
        for msg in messages
    ]
    return render(request, "index.html", {"messages_json": json.dumps(messages_data)})


@csrf_exempt
@require_POST
def chat_api(request):
    """Handle chat messages via AJAX — saves history and returns AI response."""
    try:
        data = json.loads(request.body)
        question = data.get("message", "").strip()

        if not question:
            return JsonResponse({"error": "Message cannot be empty."}, status=400)

        # Save the user message
        ChatMessage.objects.create(role="user", content=question)

        # Call Gemini API
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=question,
        )

        answer = response.text

        # Save the assistant response
        ChatMessage.objects.create(role="assistant", content=answer)

        return JsonResponse({"response": answer})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_POST
def clear_chat(request):
    """Delete all chat messages."""
    ChatMessage.objects.all().delete()
    return JsonResponse({"status": "cleared"})