from django.db import transaction
from django.db.models import F
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError

from .models import Wallet, Transaction, Category
from .serializers import WalletSerializer, TransactionSerializer


class WalletListView(generics.ListAPIView):
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user)


class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Transaction.objects
            .filter(user=self.request.user)
            .select_related("wallet", "category")
            .order_by("-transaction_date", "-id")
        )


class TransactionCreateView(generics.CreateAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic 
    def perform_create(self, serializer):
        try:
            main_wallet = Wallet.objects.get(
                user=self.request.user,
                type=Wallet.WalletType.MAIN,
            )
        except Wallet.DoesNotExist:
            raise ValidationError({
                "wallet": "Main wallet does not exist for this user."
            })

        category = serializer.validated_data["category"]
        amount = serializer.validated_data["amount"]

        serializer.save(
            user=self.request.user,
            wallet=main_wallet,
        )

        if category.type == Category.Type.INCOME:
            Wallet.objects.filter(id=main_wallet.id).update(
                balance=F("balance") + amount
            )

        elif category.type == Category.Type.EXPENSE:
            Wallet.objects.filter(id=main_wallet.id).update(
                balance=F("balance") - amount
            )
