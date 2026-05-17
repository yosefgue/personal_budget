import uuid
from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Goal, Wallet, Transaction
from .serializers import WalletSerializer, TransactionSerializer, GoalSerializer
from .services import create_wallet_goal, transfer_to_goal


def get_transaction_effect(transaction_type, amount):
    if transaction_type == Transaction.Type.INCOME:
        return amount

    if transaction_type == Transaction.Type.EXPENSE:
        return -amount

    return 0


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
            .filter(user=self.request.user, wallet__type=Wallet.WalletType.MAIN)
            .select_related("wallet", "category")
            .order_by("-transaction_date", "-id")
        )

    @transaction.atomic
    def perform_create(self, serializer):
        main_wallet = Wallet.objects.get(
            user=self.request.user,
            type=Wallet.WalletType.MAIN,
        )

        transaction_obj = serializer.save(
            user=self.request.user,
            wallet=main_wallet,
        )

        effect = get_transaction_effect(
            transaction_obj.type,
            transaction_obj.amount,
        )

        Wallet.objects.filter(id=main_wallet.id).update(
            balance=F("balance") + effect
        )


class TransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Transaction.objects
            .filter(user=self.request.user, wallet__type=Wallet.WalletType.MAIN)
            .select_related("wallet", "category")
        )

    @transaction.atomic
    def perform_update(self, serializer):
        old_transaction = self.get_object()
        old_type = old_transaction.type
        new_type = serializer.validated_data.get("type", old_type)
        new_amount = serializer.validated_data.get("amount", old_transaction.amount)

        if old_type in [Transaction.Type.TRANSFER_IN, Transaction.Type.TRANSFER_OUT]:
            if new_type != old_type:
                raise ValidationError({"type": "Transfer transactions cannot change type."})

            if old_transaction.transfer_group is None:
                raise ValidationError({"transfer_group": "Transfer group is missing."})

            related_transaction = (
                Transaction.objects
                .select_related("wallet")
                .filter(transfer_group=old_transaction.transfer_group)
                .exclude(id=old_transaction.id)
                .first()
            )

            if related_transaction is None:
                raise ValidationError({"transfer_group": "Related transfer transaction not found."})

            delta = new_amount - old_transaction.amount
            main_wallet_delta = delta

            if old_type == Transaction.Type.TRANSFER_OUT:
                main_wallet_delta = -delta

            serializer.save(
                user=self.request.user,
                wallet=old_transaction.wallet,
                category=None,
            )

            Transaction.objects.filter(id=related_transaction.id).update(
                amount=new_amount,
                description=serializer.validated_data.get(
                    "description",
                    related_transaction.description,
                ),
                transaction_date=serializer.validated_data.get(
                    "transaction_date",
                    related_transaction.transaction_date,
                ),
            )

            Wallet.objects.filter(id=old_transaction.wallet.id).update(
                balance=F("balance") + main_wallet_delta
            )

            Wallet.objects.filter(id=related_transaction.wallet.id).update(
                balance=F("balance") - main_wallet_delta
            )
            return

        old_effect = get_transaction_effect(
            old_transaction.type,
            old_transaction.amount,
        )

        new_effect = get_transaction_effect(new_type, new_amount)

        serializer.save(
            user=self.request.user,
            wallet=old_transaction.wallet,
        )

        Wallet.objects.filter(id=old_transaction.wallet.id).update(
            balance=F("balance") + (new_effect - old_effect)
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.type in [Transaction.Type.TRANSFER_IN, Transaction.Type.TRANSFER_OUT]:
            if instance.transfer_group is None:
                raise ValidationError({"transfer_group": "Transfer group is missing."})

            related_transaction = (
                Transaction.objects
                .select_related("wallet")
                .filter(transfer_group=instance.transfer_group)
                .exclude(id=instance.id)
                .first()
            )

            if related_transaction is None:
                raise ValidationError({"transfer_group": "Related transfer transaction not found."})

            amount = instance.amount
            main_wallet_delta = amount

            if instance.type == Transaction.Type.TRANSFER_IN:
                main_wallet_delta = -amount

            Wallet.objects.filter(id=instance.wallet.id).update(
                balance=F("balance") + main_wallet_delta
            )

            Wallet.objects.filter(id=related_transaction.wallet.id).update(
                balance=F("balance") - main_wallet_delta
            )

            related_transaction.delete()
            instance.delete()
            return

        old_effect = get_transaction_effect(
            instance.type,
            instance.amount,
        )

        Wallet.objects.filter(id=instance.wallet.id).update(
            balance=F("balance") - old_effect
        )

        instance.delete()


class GoalView(generics.ListCreateAPIView):
    serializer_class = GoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Goal.objects
            .filter(user=self.request.user)
            .select_related("wallet")
        )

    @transaction.atomic
    def perform_create(self, serializer):
        goal = serializer.save(user=self.request.user)

        create_wallet_goal(
            user=self.request.user,
            goal=goal,
        )


class GoalDetailView(generics.DestroyAPIView):
    serializer_class = GoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user)

    @transaction.atomic
    def perform_destroy(self, instance):
        wallet = getattr(instance, "wallet", None)

        if wallet is not None:
            transfer_group_ids = list(
                Transaction.objects
                .filter(wallet=wallet, transfer_group__isnull=False)
                .values_list("transfer_group", flat=True)
            )

            if transfer_group_ids:
                Transaction.objects.filter(transfer_group__in=transfer_group_ids).delete()

            Transaction.objects.filter(wallet=wallet).delete()

        instance.delete()


class TransferToGoalView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, goal_id):
        amount = request.data.get("amount")

        if amount is None:
            raise ValidationError({"amount": "Amount is required."})

        transfer_out, transfer_in, group_id = transfer_to_goal(
            user=request.user,
            goal_id=goal_id,
            amount=amount,
            description=request.data.get("description", ""),
            transaction_date=request.data.get("transaction_date"),
        )

        

        return Response(
            {
                "message": "Transfer completed successfully.",
                "transfer_group": group_id,
                "transactions": [
                    TransactionSerializer(transfer_out).data,
                    TransactionSerializer(transfer_in).data,
                ],
            },
            status=status.HTTP_201_CREATED,
        )