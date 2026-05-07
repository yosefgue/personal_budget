from django.conf import settings
from django.db import models
from finance.models import Goal


class Budget(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="budgets",
    )

    goal = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        related_name="budgets",
    )

    suggested_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    estimated_months = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"Budget suggestion for {self.goal.name}"