from .models import Wallet


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