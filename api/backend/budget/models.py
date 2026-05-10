from django.conf import settings
from django.db import models
from finance.models import Goal


class Budget(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="budgets",
    )

    goal = models.OneToOneField(
        Goal,
        on_delete=models.CASCADE,
        related_name="budget",
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
        return f"Budget plan for {self.goal.name}"