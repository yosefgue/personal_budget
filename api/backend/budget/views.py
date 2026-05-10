from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import GoalSuggestionService


class GoalSuggestionView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request):
		suggestions = GoalSuggestionService.get_suggestions(user=request.user)

		if not suggestions:
			return Response(
				{"detail": "Not enough income data to generate suggestions."},
				status=status.HTTP_200_OK,
			)

		return Response(suggestions, status=status.HTTP_200_OK)
