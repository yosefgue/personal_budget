from datetime import timedelta
from decimal import Decimal
from math import ceil

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from finance.models import Transaction, Wallet, Goal


def round_to_nearest_100(amount):
    rounded = int(round(amount / 100) * 100)
    return max(100, rounded)


class GoalSuggestionService:
    @staticmethod
    def get_suggestions(user):
        end_date = timezone.localdate()
        start_date = end_date - timedelta(days=90)

        saving_rate = Decimal("0.20")

        main_wallet = user.wallets.get(type=Wallet.WalletType.MAIN)

        monthly_income_qs = (
            Transaction.objects
            .filter(
                user=user,
                wallet=main_wallet,
                type=Transaction.Type.INCOME,
                transaction_date__gte=start_date,
                transaction_date__lte=end_date,
            )
            .annotate(month=TruncMonth("transaction_date"))
            .values("month")
            .annotate(total=Sum("amount"))
        )

        if not monthly_income_qs.exists():
            raise ValidationError({
                "income": "No income transactions found in the last 90 days."
            })

        total_income = sum(row["total"] for row in monthly_income_qs)
        average_income = total_income / monthly_income_qs.count()

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

            suggested_amount = min(
                suggested_amount,
                remaining_amount,
            )

            suggested_amount = round_to_nearest_100(suggested_amount)

            suggested_amount = min(
                suggested_amount,
                remaining_amount,
            )

            estimated_months = ceil(remaining_amount / suggested_amount)

            suggestions.append({
                "goal_id": goal.id,
                "suggested_amount": suggested_amount,
                "estimated_months": estimated_months,
            })

        return suggestions
    