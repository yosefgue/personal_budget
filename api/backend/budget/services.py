from datetime import timedelta
from decimal import Decimal
from math import ceil

from google import genai
from django.conf import settings

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from finance.models import Transaction, Wallet, Goal


def get_recent_transactions(user, wallet, days=90):
    end_date = timezone.localdate()
    start_date = end_date - timedelta(days=days)

    return Transaction.objects.filter(
        user=user,
        wallet=wallet,
        transaction_date__gte=start_date,
        transaction_date__lte=end_date,
    )


def get_monthly_average(transactions, transaction_type):
    monthly_qs = (
        transactions
        .filter(type=transaction_type)
        .annotate(month=TruncMonth("transaction_date"))
        .values("month")
        .annotate(total=Sum("amount"))
    )

    if not monthly_qs.exists():
        return Decimal("0")

    total = sum(row["total"] for row in monthly_qs)
    return total / monthly_qs.count()


def get_monthly_category_average(transactions, category_names):
    monthly_qs = (
        transactions
        .filter(
            type=Transaction.Type.EXPENSE,
            category__name__in=category_names,
        )
        .annotate(month=TruncMonth("transaction_date"))
        .values("month")
        .annotate(total=Sum("amount"))
    )

    if not monthly_qs.exists():
        return Decimal("0")

    total = sum(row["total"] for row in monthly_qs)
    return total / monthly_qs.count()


def round_to_nearest_100(amount):
    rounded = int(round(amount / 100) * 100)
    return max(100, rounded)


def get_suggestions(user):
    saving_rate = Decimal("0.20")

    main_wallet = user.wallets.get(type=Wallet.WalletType.MAIN)
    transactions = get_recent_transactions(user, main_wallet)

    average_income = get_monthly_average(
        transactions=transactions,
        transaction_type=Transaction.Type.INCOME,
    )

    if average_income <= 0:
        raise ValidationError({
            "income": "No income transactions found in the last 90 days."
        })

    global_saving_amount = average_income * saving_rate

    active_goals = (
        Goal.objects
        .filter(user=user, status=Goal.Status.ACTIVE)
        .select_related("wallet")
    )

    goals_data = []

    for goal in active_goals:
        remaining_amount = goal.target_amount - goal.wallet.balance

        if remaining_amount <= 0:
            continue

        months_needed = remaining_amount / global_saving_amount

        if months_needed <= 3:
            weight = 1
        elif months_needed <= 12:
            weight = 2
        else:
            weight = 3

        goals_data.append({
            "goal": goal,
            "remaining_amount": remaining_amount,
            "weight": weight,
        })

    if not goals_data:
        raise ValidationError({
            "goals": "No active goals need suggestions."
        })

    total_weight = sum(item["weight"] for item in goals_data)

    suggestions = []

    for item in goals_data:
        goal = item["goal"]
        remaining_amount = item["remaining_amount"]
        weight = item["weight"]

        suggested_amount = (
            global_saving_amount * Decimal(weight) / Decimal(total_weight)
        )

        suggested_amount = min(suggested_amount, remaining_amount)
        suggested_amount = round_to_nearest_100(suggested_amount)
        suggested_amount = min(suggested_amount, remaining_amount)

        estimated_months = ceil(remaining_amount / suggested_amount)

        suggestions.append({
            "goal_id": goal.id,
            "suggested_amount": suggested_amount,
            "estimated_months": estimated_months,
        })

    return suggestions


def get_dashboard_insights(user):
    main_wallet = user.wallets.get(type=Wallet.WalletType.MAIN)
    transactions = get_recent_transactions(user, main_wallet)

    average_income = get_monthly_average(
        transactions=transactions,
        transaction_type=Transaction.Type.INCOME,
    )

    if average_income <= 0:
        return [
            {
                "type": "info",
                "title": "Pas de revenus",
                "message": "Ajoutez au moins une transaction de revenu pour obtenir des analyses personnalisees.",
            }
        ]

    average_expenses = get_monthly_average(
        transactions=transactions,
        transaction_type=Transaction.Type.EXPENSE,
    )

    fixed_expenses = get_monthly_category_average(
        transactions=transactions,
        category_names=["Rent", "Bills"],
    )

    non_essential_expenses = get_monthly_category_average(
        transactions=transactions,
        category_names=[
            "Shopping",
            "Entertainment",
            "Subscriptions",
            "Travel",
        ],
    )

    food_expenses = get_monthly_category_average(
        transactions=transactions,
        category_names=["Food"],
    )

    savings_to_goals = get_monthly_average(
        transactions=transactions,
        transaction_type=Transaction.Type.TRANSFER_OUT,
    )

    insights = []

    if average_expenses > average_income:
        insights.append({
            "type": "warning",
            "title": "Depenses superieures aux revenus",
            "message": "Vos depenses recentes sont superieures a vos revenus. Revoyez vos principales categories.",
        })

    if fixed_expenses > average_income * Decimal("0.50"):
        insights.append({
            "type": "warning",
            "title": "Depenses fixes elevees",
            "message": "Le loyer et les factures prennent une grande part de vos revenus. Cela peut reduire votre capacite d'epargne.",
        })

    if non_essential_expenses > average_income * Decimal("0.30"):
        insights.append({
            "type": "warning",
            "title": "Depenses non essentielles elevees",
            "message": "Vos achats, loisirs, abonnements ou voyages sont eleves par rapport a vos revenus.",
        })

    if food_expenses > average_income * Decimal("0.20"):
        insights.append({
            "type": "warning",
            "title": "Depenses alimentaires elevees",
            "message": "Vos depenses alimentaires sont elevees par rapport a vos revenus. Planifier les repas peut aider.",
        })

    if savings_to_goals < average_income * Decimal("0.15"):
        insights.append({
            "type": "info",
            "title": "Epargne vers les objectifs faible",
            "message": "Votre epargne vers les objectifs est faible. Mettez de cote des le debut du mois.",
        })

    if main_wallet.balance < average_income * Decimal("0.10"):
        insights.append({
            "type": "warning",
            "title": "Solde du portefeuille principal faible",
            "message": "Votre solde disponible est faible. Garder une petite marge de securite peut aider.",
        })

    if not insights:
        insights.append({
            "type": "success",
            "title": "Bon equilibre financier",
            "message": "Vos depenses et votre epargne recentes semblent equilibrees.",
        })

    return insights[:4]


class FinanceAIService:
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")

        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def generate_advice(self, user_message: str, financial_context: str) -> str:
        prompt = f"""
            You are a personal finance assistant inside a budgeting web application.

            Your main goal:
            - Help the user understand their financial situation.
            - Give useful financial advice based on their real data.
            - Identify what may be eating their budget.
            - Suggest practical ways to improve spending, saving, and goal progress.
            - Encourage good financial habits such as saving regularly, reducing unnecessary expenses, and planning ahead.

            Rules:
            - Answer in the same language as the user's question.
            - If the user's language is unclear, answer in French.
            - Use simple, natural and clear language.
            - Answer the user's question directly.
            - Use the provided financial data whenever relevant and reference it briefly.
            - If you notice a spending category taking too much budget, mention it clearly.
            - You may give general best-practice tips when the question is broad.
            - Do not invent specific transactions, balances, income, categories, or totals.
            - Do not modify wallet balances.
            - Do not create transactions.
            - Do not give risky financial, investment, tax, or legal advice.
            - If the data is incomplete, say the advice is approximate.
            - Keep the answer short and clear, 3 to 6 bullet points maximum.

            User financial data (JSON):
            {financial_context}

            User question:
            {user_message}
        """

        response = self.client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )

        return response.text
