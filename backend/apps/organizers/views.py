from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdmin, IsOrganizer
from .models import OrganizerProfile
from .permissions import IsOrganizerOwner
from .serializers import OrganizerProfileSerializer
from .services import approve_organizer, notify_admin_for_approval, reject_organizer


class OrganizerProfileViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizerProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return OrganizerProfile.objects.all()
        if user.role == user.Role.ORGANIZER:
            return OrganizerProfile.objects.filter(user=user)
        return OrganizerProfile.objects.filter(approval_status=OrganizerProfile.Status.APPROVED)

    def create(self, request, *args, **kwargs):
        if request.user.role != request.user.Role.ORGANIZER:
            return Response({"message": "Only organizers can create profiles."}, status=403)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save(user=request.user)
        notify_admin_for_approval(profile)
        return Response(serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not IsOrganizerOwner().has_object_permission(request, self, instance):
            return Response({"message": "Not allowed."}, status=403)
        return super().update(request, *args, **kwargs)


class OrganizerPendingListAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        pending = OrganizerProfile.objects.filter(approval_status=OrganizerProfile.Status.PENDING)
        serializer = OrganizerProfileSerializer(pending, many=True)
        return Response(serializer.data)


class OrganizerApproveAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        profile = get_object_or_404(OrganizerProfile, pk=pk)
        approve_organizer(profile, request.user)
        return Response({"message": "Organizer approved."})


class OrganizerRejectAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        reason = request.data.get("reason", "")
        profile = get_object_or_404(OrganizerProfile, pk=pk)
        reject_organizer(profile, request.user, reason)
        return Response({"message": "Organizer rejected."})
