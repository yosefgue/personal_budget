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


class TransactionListCreateView(generics.ListCreateAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Transaction.objects
            .filter(user=self.request.user)
            .select_related("wallet", "category")
            .order_by("-transaction_date", "-id")
        )

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


class TransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Transaction.objects
            .filter(user=self.request.user)
            .select_related("wallet", "category")
        )

    @transaction.atomic
    def perform_update(self, serializer):
        old_transaction = self.get_object()

        old_wallet = old_transaction.wallet
        old_category = old_transaction.category
        old_amount = old_transaction.amount

        new_category = serializer.validated_data.get(
            "category",
            old_category,
        )
        new_amount = serializer.validated_data.get(
            "amount",
            old_amount,
        )

        old_effect = 0

        if old_category.type == Category.Type.INCOME:
            old_effect = old_amount

        elif old_category.type == Category.Type.EXPENSE:
            old_effect = -old_amount

        new_effect = 0

        if new_category.type == Category.Type.INCOME:
            new_effect = new_amount

        elif new_category.type == Category.Type.EXPENSE:
            new_effect = -new_amount

        serializer.save(
            user=self.request.user,
            wallet=old_wallet,
        )

        Wallet.objects.filter(id=old_wallet.id).update(
            balance=F("balance") + (new_effect - old_effect)
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        old_effect = 0

        if instance.category.type == Category.Type.INCOME:
            old_effect = instance.amount

        elif instance.category.type == Category.Type.EXPENSE:
            old_effect = -instance.amount

        Wallet.objects.filter(id=instance.wallet.id).update(
            balance=F("balance") - old_effect
        )

        instance.delete()