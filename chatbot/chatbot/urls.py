from django.urls import path

from . import views

urlpatterns = [
    path('', views.home, name="home"),
    path('api/chat/', views.chat_api, name="chat_api"),
    path('api/clear/', views.clear_chat, name="clear_chat"),
]
