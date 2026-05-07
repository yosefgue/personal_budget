import uuid
from decimal import Decimal
from django.conf import settings
from django.db.models import F, Q
from django.core.validators import MinValueValidator
from django.db import models


class Goal(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="goals",
    )
    name = models.CharField(max_length=100)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    def __str__(self):
        return self.name


class Wallet(models.Model):
    class WalletType(models.TextChoices):
        MAIN = "main", "Main"
        GOAL = "goal", "Goal"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallets",
    )
    goal = models.OneToOneField(
        Goal,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="wallet",
    )
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=WalletType.choices)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(type="main"),
                name="one_main_wallet_per_user"
            )
        ]

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Transaction(models.Model):
    class Type(models.TextChoices):
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"
        TRANSFER_IN = "transfer_in", "Transfer In"
        TRANSFER_OUT = "transfer_out", "Transfer Out"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="transactions",
        null=True,
        blank=True,
    )
    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    transfer_group = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
    )
    title = models.CharField(max_length=64)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    type = models.CharField(max_length=20, choices=Type.choices)
    description = models.CharField(max_length=255, blank=True)
    transaction_date = models.DateField()
    is_recurring = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.title} - {self.amount}"