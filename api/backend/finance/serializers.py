from django.utils import timezone
from rest_framework import serializers

from .models import Wallet, Transaction, Category, Goal


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ["id", "name", "type", "balance", "goal"]


class TransactionSerializer(serializers.ModelSerializer):
    wallet_name = serializers.CharField(source="wallet.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_type = serializers.CharField(source="category.type", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "category",
            "category_name",
            "category_type",
            "wallet_name",
            "title",
            "amount",
            "is_recurring",
            "transaction_date",
        ]

class GoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Goal
        fields = [
            "id",
            "name",
            "status",
            "target_amount",
            "target_date"
        ]

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Target amount must be greater than 0.")
        return value

    def validate_target_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("Target date cannot be in the past.")
        return value