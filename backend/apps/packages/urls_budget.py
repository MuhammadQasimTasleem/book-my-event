from django.urls import path

from .views import BudgetEstimateAPIView

urlpatterns = [
    path("estimate/", BudgetEstimateAPIView.as_view(), name="budget_estimate"),
]
