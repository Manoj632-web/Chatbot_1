from django.shortcuts import render
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))


def home(request):

    answer = ""

    if request.method == "POST":
        question = request.POST.get("question")

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=question
        )

        answer = response.text

    return render(request, "index.html", {"answer": answer})