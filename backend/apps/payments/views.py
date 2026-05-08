from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Payment
from .permissions import IsPaymentOwner
from .serializers import PaymentSerializer


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsPaymentOwner]

    def get_queryset(self):
        return Payment.objects.filter(booking__client=self.request.user)
