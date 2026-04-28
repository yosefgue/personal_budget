from .models import Wallet


class WalletService:
    @staticmethod
    def create_main_wallet_user(user):
        wallet, created = Wallet.objects.get_or_create(
            user=user,
            type=Wallet.WalletType.MAIN,
            defaults={
                "name": "Main Wallet",
                "balance": 0,
                }
        )
        return wallet
