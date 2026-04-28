from rest_framework import serializers

from .models import Wallet, Transaction, Category


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
            "transaction_date",
        ]