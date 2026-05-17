import json

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.models import Wallet, Transaction, Goal
from .services import (
    get_suggestions,
    get_dashboard_insights,
    FinanceAIService,
)


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


class AIChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user_message = request.data.get("message")

        if not user_message:
            return Response(
                {"error": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        wallets = Wallet.objects.filter(user=user)

        transactions = (
            Transaction.objects
            .filter(user=user)
            .select_related("category", "wallet")
            .order_by("-transaction_date")[:20]
        )

        goals = Goal.objects.filter(user=user)

        financial_context = self.build_financial_context(
            wallets=wallets,
            transactions=transactions,
            goals=goals,
        )

        ai_service = FinanceAIService()

        answer = ai_service.generate_advice(
            user_message=user_message,
            financial_context=financial_context,
        )

        return Response({"answer": answer}, status=status.HTTP_200_OK)

    def build_financial_context(self, wallets, transactions, goals):
        payload = {
            "wallets": [
                {
                    "name": wallet.name,
                    "balance_mad": str(wallet.balance),
                    "type": wallet.type,
                }
                for wallet in wallets
            ],
            "transactions": [
                {
                    "date": str(transaction.transaction_date),
                    "title": transaction.title,
                    "amount_mad": str(transaction.amount),
                    "type": transaction.type,
                    "category": (
                        transaction.category.name
                        if transaction.category
                        else None
                    ),
                    "wallet": transaction.wallet.name,
                }
                for transaction in transactions
            ],
            "goals": [
                {
                    "name": goal.name,
                    "target_amount_mad": str(goal.target_amount),
                    "status": goal.status,
                }
                for goal in goals
            ],
        }

        return json.dumps(payload, indent=2)
