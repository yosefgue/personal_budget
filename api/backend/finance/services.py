import uuid
from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Goal, Wallet, Transaction


class WalletService:
    @staticmethod
    def create_main_wallet_user(user):
        wallet, created = Wallet.objects.get_or_create(
            user=user,
            type=Wallet.WalletType.MAIN,
            defaults={
                "name": "Main wallet",
                "balance": 0,
                }
        )
        return wallet


class WalletGoalService:
    @staticmethod
    def create_wallet_goal(user, goal):
        wallet, created = Wallet.objects.get_or_create(
            user=user,
            type=Wallet.WalletType.GOAL,
            goal=goal,
            defaults={
                "name": f"{goal.name} wallet",
                "balance": 0,
            },
        )
        return wallet
    

class TransferService:
    @staticmethod
    @transaction.atomic
    def transfer_to_goal(user, goal_id, amount, description="", transaction_date=None):
        amount = Decimal(str(amount))

        if amount <= 0:
            raise ValidationError({"amount": "Amount must be greater than 0."})

        transaction_date = transaction_date or timezone.localdate()

        main_wallet = Wallet.objects.select_for_update().get(
            user=user,
            type=Wallet.WalletType.MAIN,
        )

        goal = Goal.objects.select_related("wallet").get(
            id=goal_id,
            user=user,
        )

        goal_wallet = goal.wallet

        if main_wallet.balance < amount:
            raise ValidationError({"amount": "Insufficient balance."})

        group_id = uuid.uuid4()

        transfer_out = Transaction.objects.create(
            user=user,
            wallet=main_wallet,
            category=None,
            transfer_group=group_id,
            title=f"Transfer to {goal.name}",
            amount=amount,
            type=Transaction.Type.TRANSFER_OUT,
            description=description,
            transaction_date=transaction_date,
        )

        transfer_in = Transaction.objects.create(
            user=user,
            wallet=goal_wallet,
            category=None,
            transfer_group=group_id,
            title="Transfer from main wallet",
            amount=amount,
            type=Transaction.Type.TRANSFER_IN,
            description=description,
            transaction_date=transaction_date,
        )

        Wallet.objects.filter(id=main_wallet.id).update(
            balance=F("balance") - amount
        )

        Wallet.objects.filter(id=goal_wallet.id).update(
            balance=F("balance") + amount
        )

        return transfer_out, transfer_in, group_id