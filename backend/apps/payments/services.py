from .models import Payment


def create_payment(booking, amount, provider="") -> Payment:
    return Payment.objects.create(booking=booking, amount=amount, provider=provider)
