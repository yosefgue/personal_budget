from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import get_suggestions, get_dashboard_insights


class GoalSuggestionView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request):
		suggestions = get_suggestions(user=request.user)

		if not suggestions:
			return Response(
				{"detail": "Not enough income data to generate suggestions."},
				status=status.HTTP_200_OK,
			)

		return Response(suggestions, status=status.HTTP_200_OK)


class DashboardInsightsView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request):
		insights = get_dashboard_insights(user=request.user)
		return Response(insights, status=status.HTTP_200_OK)
