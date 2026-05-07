from rest_framework import serializers

from .models import Wallet, Transaction, Category, Goal


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = [
            "id", 
            "name", 
            "type", 
            "balance", 
            "goal",
            ]


class TransactionSerializer(serializers.ModelSerializer):
    wallet_name = serializers.CharField(source="wallet.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "category",
            "category_name",
            "wallet",
            "wallet_name",
            "transfer_group",
            "title",
            "amount",
            "type",
            "description",
            "is_recurring",
            "transaction_date",
        ]
        read_only_fields = ["transfer_group", "wallet_name", "wallet"]


class GoalSerializer(serializers.ModelSerializer):
    current_amount = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = [
            "id",
            "name",
            "status",
            "target_amount",
            "current_amount",
            "progress",
        ]

    def get_current_amount(self, obj):
        if hasattr(obj, "wallet"):
            return obj.wallet.balance
        return 0

    def get_progress(self, obj):
        if not hasattr(obj, "wallet") or obj.target_amount <= 0:
            return 0

        return round((obj.wallet.balance / obj.target_amount) * 100)

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Target amount must be greater than 0.")
        return value

